import os
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncpg
import json
import uuid
import re
import datetime as dt
import time
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
import secrets
import hashlib
import math
from typing import List, Optional
import random

from dotenv import load_dotenv
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
try:
    import openai  # type: ignore
    if OPENAI_API_KEY:
        openai.api_key = OPENAI_API_KEY
except Exception:
    openai = None

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Repruv API (Rebuild Phase 1)")

# CORS: allow from env ALLOW_ORIGINS (comma-separated) or * by default
_origins_env = os.getenv("ALLOW_ORIGINS", "*")
_allow_origins = ["*"] if _origins_env.strip() == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression for larger JSON responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Optional trusted hosts for basic host header protection
_trusted_hosts_env = os.getenv("TRUSTED_HOSTS", "").strip()
if _trusted_hosts_env:
    hosts = [h.strip() for h in _trusted_hosts_env.split(",") if h.strip()]
    if hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=hosts)

_pool: Optional[asyncpg.Pool] = None

SCHEMA_SQL = """
create table if not exists users (
    id uuid primary key,
    email text unique not null,
    account_type text not null default 'waiting',
    account_tier text,
    parent_account_id uuid references users(id) on delete set null,
    settings jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create table if not exists creator_profiles (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    platforms text[] not null default '{}',
    voice_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create table if not exists platform_connections (
    id uuid primary key,
    profile_id uuid not null references creator_profiles(id) on delete cascade,
    platform text not null,
    tokens jsonb not null,
    last_sync timestamptz
);

create table if not exists content_uploads (
    id uuid primary key,
    profile_id uuid not null references creator_profiles(id) on delete cascade,
    platform text not null,
    title text not null,
    url text,
    posted_at timestamptz not null,
    created_at timestamptz default now()
);

create table if not exists comments (
    id uuid primary key,
    upload_id uuid not null references content_uploads(id) on delete cascade,
    author text,
    text text not null,
    sentiment text,
    replied boolean default false,
    flagged boolean default false,
    hidden boolean default false,
    created_at timestamptz default now()
);

create table if not exists responses (
    id uuid primary key,
    comment_id uuid not null references comments(id) on delete cascade,
    text text not null,
    sent_at timestamptz,
    ai_generated boolean default true,
    created_at timestamptz default now()
);

create table if not exists competitors (
    id uuid primary key,
    profile_id uuid not null references creator_profiles(id) on delete cascade,
    competitor_handle text not null,
    platform text not null
);

create table if not exists response_templates (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name text not null,
    text text not null,
    created_at timestamptz default now()
);

create table if not exists mentions (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    source text not null, -- twitter|news|forum|reddit|web
    title text,
    url text,
    text text not null,
    sentiment text,
    created_at timestamptz default now()
);

create table if not exists ideas (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    title text not null,
    status text not null default 'backlog', -- backlog|shortlist|drafted|posted
    created_at timestamptz default now()
);

create table if not exists briefs (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    idea_id uuid references ideas(id) on delete cascade,
    content text not null,
    created_at timestamptz default now()
);

create table if not exists schedules (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    idea_id uuid references ideas(id) on delete set null,
    platform text not null,
    caption text,
    scheduled_at timestamptz not null,
    status text not null default 'scheduled', -- scheduled|posted|canceled
    created_at timestamptz default now()
);

create table if not exists reports (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    title text,
    content text not null,
    created_at timestamptz default now()
);

create table if not exists sessions (
    id uuid primary key,
    user_id uuid references users(id) on delete cascade,
    token text unique not null,
    expires_at timestamptz not null,
    created_at timestamptz default now()
);
-- Indexes for performance
create index if not exists idx_profiles_user on creator_profiles(user_id);
create index if not exists idx_uploads_profile on content_uploads(profile_id);
create index if not exists idx_uploads_posted_at on content_uploads(posted_at);
create index if not exists idx_comments_upload on comments(upload_id);
create index if not exists idx_comments_created_at on comments(created_at);
create index if not exists idx_mentions_user_created on mentions(user_id, created_at);
create index if not exists idx_ideas_user_created on ideas(user_id, created_at);
create index if not exists idx_schedules_user_when on schedules(user_id, scheduled_at);
"""

async def get_db():
    global _pool
    if _pool is None:
        try:
            # Try different connection configurations
            conn_str = DATABASE_URL
            
            # Add SSL mode if not present and not using pooler
            if 'pooler.supabase.com' not in conn_str and 'sslmode=' not in conn_str:
                conn_str += '?sslmode=require' if '?' not in conn_str else '&sslmode=require'
            
            print(f"Attempting to connect to database...")
            print(f"Connection string format: postgresql://[user]:[hidden]@{conn_str.split('@')[1].split('/')[0]}/...")
            
            _pool = await asyncpg.create_pool(
                conn_str, 
                min_size=1, 
                max_size=5,
                command_timeout=60,
                server_settings={
                    'application_name': 'repruv_backend'
                }
            )
            
            # Test the connection
            async with _pool.acquire() as conn:
                # Try to enable pgcrypto if available
                try:
                    await conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
                except Exception:
                    pass  # Extension might already exist or no permissions
                
                # Create schema
                await conn.execute(SCHEMA_SQL)
                
                # Add missing columns
                try:
                    await conn.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false")
                    await conn.execute("ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false")
                except Exception:
                    pass
                
                # Test query
                await conn.fetchval("SELECT 1")
                print("✓ Database connection successful")
                
        except Exception as e:
            print(f"❌ Database connection failed: {str(e)}")
            print(f"Make sure your DATABASE_URL in .env is correct")
            print(f"Format should be: postgresql://postgres.[project-ref]:[password]@[host]:[port]/postgres")
            raise
            
    return _pool

# ----- Logging & Metrics & Rate limiting -----
_metrics = {"requests": 0, "errors": 0, "durations_ms": []}
_rate: Dict[str, List[float]] = {}
RATE_LIMIT_RPS = float(os.getenv("RATE_LIMIT_RPS", "5"))  # simple per-IP token bucket-ish
RATE_WINDOW = 1.0

# Tiny in-memory cache for read-heavy GETs (production-lite). Keys -> (ts, value)
_cache: Dict[str, Any] = {}
_cache_order: List[str] = []
_CACHE_MAX = 512

def _cache_get(key: str, ttl: float) -> Optional[Any]:
    try:
        item = _cache.get(key)
        if not item:
            return None
        ts, value = item
        if (time.time() - ts) <= ttl:
            return value
        else:
            _cache.pop(key, None)
            return None
    except Exception:
        return None

def _cache_set(key: str, value: Any):
    try:
        _cache[key] = (time.time(), value)
        _cache_order.append(key)
        # trim
        if len(_cache_order) > _CACHE_MAX:
            old = _cache_order.pop(0)
            _cache.pop(old, None)
    except Exception:
        pass

@app.middleware("http")
async def log_time_rate(request: Request, call_next):
    start = time.time()
    _metrics["requests"] += 1
    # simple per-IP rate limit for mutating routes
    client_ip = request.client.host if request.client else "unknown"
    if request.method in ("POST", "DELETE"):
        now = time.time()
        buf = _rate.get(client_ip, [])
        buf = [t for t in buf if now - t < RATE_WINDOW]
        if len(buf) >= RATE_LIMIT_RPS:
            return Response("Too Many Requests", status_code=429)
        buf.append(now)
        _rate[client_ip] = buf
    try:
        response = await call_next(request)
        # basic security headers
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=()")
        return response
    except Exception:
        _metrics["errors"] += 1
        raise
    finally:
        dur = (time.time() - start) * 1000.0
        if len(_metrics["durations_ms"]) < 2000:  # cap memory
            _metrics["durations_ms"].append(dur)

@app.get("/metrics")
async def metrics():
    durs = _metrics["durations_ms"]
    n = len(durs)
    p95 = sorted(durs)[int(0.95*n)] if n else 0
    avg = sum(durs)/n if n else 0
    return {"requests": _metrics["requests"], "errors": _metrics["errors"], "avg_ms": round(avg,1), "p95_ms": round(p95,1)}

# Models
class SignupBody(BaseModel):
    email: str
    password: str
    account_type: Optional[str] = "waiting" # waiting|demo|full|admin
    account_tier: Optional[str] = None # individual|organization

class LoginBody(BaseModel):
    email: str
    password: str

class DemoAnswers(BaseModel):
    content_type: str
    platforms: List[str]
    frequency: str
    followers: str
    creators: Optional[List[str]] = None

class ConnectBody(BaseModel):
    profile_id: str
    platform: str  # youtube|tiktok|instagram
    tokens: Dict[str, Any]

class ReplyBody(BaseModel):
    text: str
    ai_generated: Optional[bool] = True

class AIRq(BaseModel):
    comment_text: str
    voice_data: Optional[Dict[str, Any]] = None

class VoiceLearnRq(BaseModel):
    user_id: str

class SettingsRq(BaseModel):
    user_id: str
    settings: Dict[str, Any]

class TemplatesRq(BaseModel):
    user_id: str
    name: str
    text: str

class BulkActionRq(BaseModel):
    ids: List[str]
    action: str  # reply|flag|hide|delete
    text: Optional[str] = None
    ai_generated: Optional[bool] = True

class CompetitorBody(BaseModel):
    user_id: str
    competitor_handle: str
    platform: str

class IdeasGenRq(BaseModel):
    user_id: str
    count: Optional[int] = 10

class IdeaStatusRq(BaseModel):
    status: str  # backlog|shortlist|drafted|posted

class BriefGenRq(BaseModel):
    user_id: str
    idea_id: str

class CaptionRq(BaseModel):
    user_id: str
    idea: Optional[str] = None
    brief: Optional[str] = None

class PrepareRq(BaseModel):
    user_id: str
    idea_id: str

class ScheduleCreateRq(BaseModel):
    user_id: str
    idea_id: Optional[str] = None
    platform: str
    caption: Optional[str] = None
    scheduled_at: str  # ISO string

class BatchPrepareRq(BaseModel):
    user_id: str
    ids: List[str]

class BulkScheduleItem(BaseModel):
    idea_id: Optional[str] = None
    platform: str
    caption: Optional[str] = None
    scheduled_at: str

class BulkScheduleRq(BaseModel):
    user_id: str
    items: List[BulkScheduleItem]

class FromShortlistRq(BaseModel):
    user_id: str
    platform: str
    start_at: str  # ISO
    spacing_minutes: int = 1440
    limit: Optional[int] = None
    auto_caption: bool = True

class ReportCreateRq(BaseModel):
    user_id: str
    title: Optional[str] = None
    range_days: int = 7

class AnalyticsRq(BaseModel):
    user_id: str
    days: int = 30

class ReportEmailRq(BaseModel):
    user_id: str
    report_id: str
    to: str
    subject: Optional[str] = None

# Helpers (simple; no external auth yet; placeholder for Supabase Auth front-end)
async def upsert_user(pool, email: str, account_type: str = "waiting", account_tier: Optional[str] = None):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id, email, account_type, account_tier from users where email=$1", email)
        if row:
            await conn.execute("update users set account_type=$2, account_tier=$3 where id=$1", row[0], account_type, account_tier)
            return row[0]
        new_id = uuid.uuid4()
        await conn.execute(
            "insert into users(id, email, account_type, account_tier) values($1,$2,$3,$4)",
            new_id, email, account_type, account_tier
        )
        return new_id

@app.post("/auth/signup")
async def signup(body: SignupBody, pool=Depends(get_db)):
    user_id = await upsert_user(pool, body.email, body.account_type, body.account_tier)
    return {"ok": True, "user_id": str(user_id)}

@app.post("/auth/login")
async def login(body: LoginBody, pool=Depends(get_db)):
    # Accept any known email for now; password ignored (front-end handles auth)
    # Ensure user exists
    user_id = await upsert_user(pool, body.email)
    # Issue session token valid for 7 days
    token = secrets.token_urlsafe(48)
    expires = dt.datetime.utcnow() + dt.timedelta(days=7)
    async with pool.acquire() as conn:
        await conn.execute(
            "insert into sessions(id,user_id,token,expires_at) values($1,$2,$3,$4)",
            uuid.uuid4(), user_id, token, expires
        )
        row = await conn.fetchrow("select account_type, account_tier from users where id=$1", user_id)
    return {"ok": True, "user_id": str(user_id), "session_token": token, "expires_at": expires.isoformat(), "account_type": row[0] if row else None, "account_tier": row[1] if row else None}

async def get_current_user(authorization: str = Header(None), pool=Depends(get_db)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid auth")
    token = authorization.replace("Bearer ", "").strip()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "select user_id, expires_at from sessions where token=$1",
            token
        )
    if not row:
        raise HTTPException(401, "Invalid token")
    if row[1] and row[1] < dt.datetime.utcnow().replace(tzinfo=row[1].tzinfo):
        raise HTTPException(401, "Token expired")
    return str(row[0])

# Very small AI service with multi-provider fallback
class AIService:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        # lazy clients
        self._openai_client = None
        self._anthropic_client = None

    def _ensure_openai(self):
        if not self.openai_key:
            return None
        if self._openai_client is not None:
            return self._openai_client
        try:
            import openai
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=self.openai_key)
            except Exception:
                openai.api_key = self.openai_key
                self._openai_client = openai
        except Exception:
            self._openai_client = None
        return self._openai_client

    def _ensure_anthropic(self):
        if not self.anthropic_key:
            return None
        if self._anthropic_client is not None:
            return self._anthropic_client
        try:
            import anthropic  # type: ignore
            self._anthropic_client = anthropic.Anthropic(api_key=self.anthropic_key)
        except Exception:
            self._anthropic_client = None
        return self._anthropic_client

    async def generate_text(self, prompt: str) -> str:
        # Try Anthropic Claude
        try:
            client = self._ensure_anthropic()
            if client:
                msg = client.messages.create(
                    model=os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
                    max_tokens=400,
                    messages=[{"role": "user", "content": prompt}],
                )
                # anthropic returns structured content
                if hasattr(msg, "content") and msg.content:
                    parts = []
                    for p in msg.content:
                        if hasattr(p, "text"):
                            parts.append(p.text)
                        elif isinstance(p, dict) and p.get("type") == "text":
                            parts.append(p.get("text", ""))
                    if parts:
                        return "\n".join(parts).strip()
        except Exception:
            pass
        # Try OpenAI
        try:
            client = self._ensure_openai()
            if client:
                # support both new and legacy SDKs
                if hasattr(client, "chat") and hasattr(client.chat, "completions"):
                    resp = client.chat.completions.create(
                        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=400,
                        temperature=0.2,
                    )
                    return resp.choices[0].message.content.strip()
                elif hasattr(client, "chat_completions") or hasattr(client, "responses") or hasattr(client, "responses"):
                    # fall through to simple outcome below
                    raise Exception("Unsupported OpenAI SDK variant")
        except Exception:
            pass
        # Fallback local
        return (
            "Here’s a concise answer based on your context and question. "
            "I don’t have external AI access configured, so this is a local heuristic summary.\n\n"
            + (prompt[:600] + ("…" if len(prompt) > 600 else ""))
        )

    async def embedding(self, text: str, dim: int = 1536) -> List[float]:
        # Try OpenAI embeddings if available
        try:
            client = self._ensure_openai()
            if client and hasattr(client, "embeddings"):
                model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
                if hasattr(client.embeddings, "create"):
                    resp = client.embeddings.create(model=model, input=text)
                    return list(resp.data[0].embedding)
        except Exception:
            pass
        # Local deterministic embedding
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16) % (2**32)
        rnd = random.Random(seed)
        vec = [rnd.uniform(-1.0, 1.0) for _ in range(dim)]
        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    async def sentiment(self, text: str) -> str:
        # Simple heuristic sentiment as fallback
        positive = ["good", "great", "love", "awesome", "amazing", "nice"]
        negative = ["bad", "terrible", "hate", "awful", "horrible", "worse", "bug"]
        lo = text.lower()
        score = sum(1 for w in positive if w in lo) - sum(1 for w in negative if w in lo)
        if score > 0:
            return "positive"
        if score < 0:
            return "negative"
        return "neutral"

ai_service = AIService()


# Auth middleware enforcing Bearer token for protected routes
PUBLIC_PATHS = set([
    "/",
    "/health",
    "/ready",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/auth/login",
    "/auth/signup",
])
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "0") == "1"

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if not REQUIRE_AUTH:
        return await call_next(request)
    path = request.url.path
    if path in PUBLIC_PATHS or any(path.startswith(p) for p in ["/static", "/assets", "/favicon"]):
        return await call_next(request)
    # Already validated and attached by previous middleware? if so continue
    auth = request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return Response(status_code=401)
    token = auth.split(" ", 1)[1].strip()
    try:
        pool = await get_db()
        async with pool.acquire() as conn:
            row = await conn.fetchrow("select user_id, expires_at from sessions where token=$1", token)
        if not row:
            return Response(status_code=401)
        expires_at = row[1]
        # normalize tz
        now = dt.datetime.utcnow().replace(tzinfo=expires_at.tzinfo)
        if expires_at < now:
            return Response(status_code=401)
        request.state.user_id = str(row[0])
    except Exception:
        return Response(status_code=401)
    return await call_next(request)


def _vec_literal(vec: List[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"

async def _get_object_text(conn, object_type: str, object_id: str) -> Optional[str]:
    if object_type == "comment":
        row = await conn.fetchrow("select content from comments where id=$1", uuid.UUID(object_id))
        return row[0] if row else None
    if object_type == "template":
        row = await conn.fetchrow("select content from templates where id=$1", uuid.UUID(object_id))
        return row[0] if row else None
    if object_type == "idea":
        row = await conn.fetchrow("select idea from ideas where id=$1", uuid.UUID(object_id))
        return row[0] if row else None
    if object_type == "brief":
        row = await conn.fetchrow("select brief from briefs where id=$1", uuid.UUID(object_id))
        return row[0] if row else None
    if object_type == "upload":
        row = await conn.fetchrow("select title from content_uploads where id=$1", uuid.UUID(object_id))
        return row[0] if row else None
    return None


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatBody(BaseModel):
    messages: List[ChatMessage]
    top_k: int = 5

@app.post("/assistant/chat")
async def assistant_chat(body: ChatBody, pool=Depends(get_db), user_id: str = Depends(get_current_user)):
    if not body.messages:
        raise HTTPException(400, "messages required")
    user_msg = body.messages[-1].content
    # get semantic context
    vec = await ai_service.embedding(user_msg)
    veclit = _vec_literal(vec)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select object_type, object_id, 1 - (embedding <=> $1::vector) as score
            from embeddings
            where user_id=$2
            order by embedding <=> $1::vector
            limit $3
            """,
            veclit, uuid.UUID(user_id), body.top_k,
        )
        contexts = []
        for r in rows:
            text = await _get_object_text(conn, r[0], str(r[1]))
            if text:
                contexts.append(f"[{r[0]}:{str(r[1])}] {text}")
    context_blob = "\n---\n".join(contexts)
    system_preamble = (
        "You are Repruv, an assistant for creators. Use the provided context from the user's own data "
        "to ground answers. Be concise and actionable. If context is insufficient, say so briefly."
    )
    convo = []
    for m in body.messages:
        role = m.role if m.role in ("system", "user", "assistant") else "user"
        convo.append(f"{role.upper()}: {m.content}")
    prompt = (
        system_preamble
        + "\n\nCONTEXT:\n" + (context_blob or "(none)")
        + "\n\nCONVERSATION so far:\n" + "\n".join(convo)
        + "\n\nProvide your next assistant reply only."
    )
    reply = await ai_service.generate_text(prompt)
    return {"reply": reply, "contexts": contexts}


@app.post("/embeddings/reindex")
async def reindex_embeddings(pool=Depends(get_db), user_id: str = Depends(get_current_user)):
    # ensure embeddings table exists
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("select 1 from embeddings limit 1")
    except Exception:
        raise HTTPException(400, "Vector/embeddings not available on this database")
    # Basic reindex: wipe and rebuild for this user from key tables
    async with pool.acquire() as conn:
        await conn.execute("delete from embeddings where user_id=$1", uuid.UUID(user_id))
        # comments
        comments = await conn.fetch("select id, content from comments where user_id=$1 limit 500", uuid.UUID(user_id))
        templates = await conn.fetch("select id, content from templates where user_id=$1 limit 200", uuid.UUID(user_id))
        ideas = await conn.fetch("select id, idea from ideas where user_id=$1 limit 200", uuid.UUID(user_id))
        briefs = await conn.fetch("select id, brief from briefs where user_id=$1 limit 200", uuid.UUID(user_id))
        uploads = await conn.fetch("select id, title from content_uploads where user_id=$1 limit 200", uuid.UUID(user_id))
        total = 0
        for tbl, rows in (
            ("comment", comments),
            ("template", templates),
            ("idea", ideas),
            ("brief", briefs),
            ("upload", uploads),
        ):
            for r in rows:
                text = r[1] or ""
                vec = await ai_service.embedding(text)
                await conn.execute(
                    "insert into embeddings (id,user_id,object_type,object_id,embedding) values ($1,$2,$3,$4,$5::vector)",
                    uuid.uuid4(), uuid.UUID(user_id), tbl, r[0], _vec_literal(vec)
                )
                total += 1
    # invalidate any caches relying on embeddings (none specific yet)
    return {"ok": True, "indexed": total}


@app.get("/search/semantic")
async def semantic_search(q: str, k: int = 10, pool=Depends(get_db), user_id: str = Depends(get_current_user)):
    # ensure embeddings table exists
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("select 1 from embeddings limit 1")
    except Exception:
        raise HTTPException(400, "Vector/embeddings not available on this database")
    vec = await ai_service.embedding(q)
    veclit = _vec_literal(vec)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select object_type, object_id, 1 - (embedding <=> $1::vector) as score
            from embeddings
            where user_id=$2
            order by embedding <=> $1::vector
            limit $3
            """,
            veclit, uuid.UUID(user_id), max(1, min(50, k))
        )
        results = []
        for r in rows:
            text = await _get_object_text(conn, r[0], str(r[1]))
            results.append({
                "object_type": r[0],
                "object_id": str(r[1]),
                "score": float(r[2]),
                "text": text,
            })
    return {"results": results}

@app.post("/auth/set-type")
async def set_type(user_id: str, account_type: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        await conn.execute("update users set account_type=$2 where id=$1", user_id, account_type)
    return {"ok": True}

@app.get("/dashboard/stats")
async def dashboard_stats(user_id: str, pool=Depends(get_db)):
    # Return minimal placeholders; real data comes in demo generation
    async with pool.acquire() as conn:
        prof_count = await conn.fetchval("select count(*) from creator_profiles where user_id=$1", user_id)
        uploads = await conn.fetchval(
            "select count(*) from content_uploads where profile_id in (select id from creator_profiles where user_id=$1)",
            user_id,
        )
        comments = await conn.fetchval(
            "select count(*) from comments where upload_id in (select id from content_uploads where profile_id in (select id from creator_profiles where user_id=$1))",
            user_id,
        )
    return {"profiles": prof_count or 0, "uploads": uploads or 0, "comments": comments or 0}

@app.post("/demo/setup")
async def demo_setup(user_id: str, answers: DemoAnswers, pool=Depends(get_db)):
    # Generate a single profile and some uploads/comments based on answers
    async with pool.acquire() as conn:
        profile_id = uuid.uuid4()
        await conn.execute(
            "insert into creator_profiles(id, user_id, name, platforms, voice_data) values($1,$2,$3,$4,$5)",
            profile_id,
            user_id,
            "Demo Creator",
            answers.platforms,
            json.dumps({"tone":"friendly","style":"concise"})
        )
        # Create 10 uploads last 30 days
        import random, datetime
        now = datetime.datetime.utcnow()
        titles = []
        niche = answers.content_type
        for i in range(10):
            days_ago = random.randint(0, 29)
            posted_at = now - datetime.timedelta(days=days_ago, hours=random.randint(0,23))
            title = f"{niche} Tips #{i+1}"
            titles.append(title)
            platform = random.choice(answers.platforms)
            upload_id = uuid.uuid4()
            await conn.execute(
                "insert into content_uploads(id, profile_id, platform, title, url, posted_at) values($1,$2,$3,$4,$5,$6)",
                upload_id, profile_id, platform, title, None, posted_at
            )
            # Comments based on followers band
            band = answers.followers
            base = {
                "<10k": 40, "10-50k": 120, "50-100k": 200, "100k-500k": 300, "500k-1M": 400, "1M+": 500
            }.get(band, 100)
            count = int(base * random.uniform(0.5,1.2))
            # Sentiment mix with occasional negative spike
            crisis = random.random() < 0.15
            for _ in range(count):
                sent_roll = random.random()
                if crisis and sent_roll < 0.45:
                    sentiment = "negative"
                else:
                    sentiment = "positive" if sent_roll < 0.7 else ("neutral" if sent_roll < 0.9 else "negative")
                text = generate_comment_text(niche, sentiment)
                await conn.execute(
                    "insert into comments(id, upload_id, author, text, sentiment, replied) values($1,$2,$3,$4,$5,$6)",
                    uuid.uuid4(), upload_id, "user"+str(random.randint(1000,9999)), text, sentiment, False
                )
        # mark account as demo
        await conn.execute("update users set account_type='demo' where id=$1", user_id)
    return {"ok": True, "profile_id": str(profile_id)}

# Utilities for fake data

def generate_comment_text(niche: str, sentiment: str) -> str:
    import random
    pools = {
        "Gaming": {
            "positive": ["GG!", "Nice clutch!", "Insane play!"],
            "neutral": ["What game is this?", "Settings?", "What sensitivity?"],
            "negative": ["Noob move", "Boring", "Clickbait title"]
        },
        "Beauty": {
            "positive": ["Skin looks flawless!", "Loved this look", "So helpful"],
            "neutral": ["Product list?", "Shade name?", "Brush type?"],
            "negative": ["Terrible blend", "Too sponsored", "Harmful advice"]
        },
        "Tech": {
            "positive": ["Great breakdown", "Finally someone explained it", "Subbed!"],
            "neutral": ["Spec sheet?", "Price?", "Battery life?"],
            "negative": ["Wrong info", "This is biased", "Outdated take"]
        }
    }
    cat = pools.get(niche, pools["Tech"])  # default to Tech-like
    return random.choice(cat.get(sentiment, cat["neutral"]))

@app.get("/health")
async def health():
    return {"ok": True}

@app.get("/ready")
async def ready(pool=Depends(get_db)):
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("select 1")
        return {"ready": True}
    except Exception as e:
        raise HTTPException(503, f"not ready: {e}")

def _sentiment_score(pos: int, neu: int, neg: int) -> int:
    total = max(1, pos+neu+neg)
    raw = (pos*1.0 + neu*0.5 + neg*0.0) / total
    return int(round(raw*100))

@app.get("/reputation/score")
async def reputation_score(user_id: str, pool=Depends(get_db)):
    key = f"rep_score:{user_id}"
    cached = _cache_get(key, ttl=10)
    if cached is not None:
        return cached
    now = dt.datetime.utcnow()
    start = now - dt.timedelta(hours=24)
    prev_start = start - dt.timedelta(hours=24)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select c.sentiment
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            """,
            user_id, start
        )
        prev = await conn.fetch(
            """
            select c.sentiment
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2 and c.created_at < $3
            """,
            user_id, prev_start, start
        )
    def count(rows):
        pos=sum(1 for r in rows if (r[0] or 'neutral')=='positive')
        neu=sum(1 for r in rows if (r[0] or 'neutral')=='neutral')
        neg=sum(1 for r in rows if (r[0] or 'neutral')=='negative')
        return pos,neu,neg
    p1,n1,g1 = count(rows)
    p0,n0,g0 = count(prev)
    score = _sentiment_score(p1,n1,g1)
    prev_score = _sentiment_score(p0,n0,g0)
    trend = score - prev_score
    out = {"score": score, "trend": trend, "stats": {"pos":p1,"neu":n1,"neg":g1,"total":p1+n1+g1, "window_start": start.isoformat(), "window_end": now.isoformat() }}
    _cache_set(key, out)
    return out

@app.get("/reputation/trend")
async def reputation_trend(user_id: str, days: int = 14, pool=Depends(get_db)):
    now = dt.datetime.utcnow().date()
    start = now - dt.timedelta(days=days-1)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select date(c.created_at) as d,
                   sum(case when c.sentiment='positive' then 1 else 0 end) pos,
                   sum(case when c.sentiment='neutral' then 1 else 0 end) neu,
                   sum(case when c.sentiment='negative' then 1 else 0 end) neg
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            group by d
            order by d
            """,
            user_id, dt.datetime.combine(start, dt.time.min)
        )
    by_day = { r[0]: _sentiment_score(r[1] or 0, r[2] or 0, r[3] or 0) for r in rows }
    data = []
    for i in range(days):
        d = start + dt.timedelta(days=i)
        data.append({"date": d.isoformat(), "score": int(by_day.get(d, 50))})
    return data

@app.get("/reputation/summary")
async def reputation_summary(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select c.text, c.sentiment
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= now() - interval '24 hours'
            limit 1000
            """,
            user_id
        )
    pos = [r[0] for r in rows if (r[1] or 'neutral')=='positive']
    neg = [r[0] for r in rows if (r[1] or 'neutral')=='negative']
    neu = [r[0] for r in rows if (r[1] or 'neutral')=='neutral']
    summary = f"In the last 24h, {len(pos)} positive, {len(neu)} neutral, and {len(neg)} negative comments."
    if neg:
        summary += " Key concerns: " + ", ".join(sorted(set(_extract_keywords(neg)))[:5])
    else:
        summary += " Audience is largely supportive."
    return {"summary": summary}

def _extract_keywords(texts: List[str]) -> List[str]:
    words = []
    for t in texts:
        words += re.findall(r"[a-zA-Z]{4,}", t.lower())
    stop = set(["this","that","with","have","will","from","your","about","what","when","where","which","there","their","would","could","should","because","really"])
    freq: Dict[str,int] = {}
    for w in words:
        if w in stop: continue
        freq[w] = freq.get(w,0)+1
    return [w for w,_ in sorted(freq.items(), key=lambda x: -x[1])]

@app.get("/reputation/alerts")
async def reputation_alerts(user_id: str, pool=Depends(get_db)):
    key = f"rep_alerts:{user_id}"
    cached = _cache_get(key, ttl=15)
    if cached is not None:
        return cached
    now = dt.datetime.utcnow()
    last6 = now - dt.timedelta(hours=6)
    last24 = now - dt.timedelta(hours=24)
    async with pool.acquire() as conn:
        neg6 = await conn.fetchval(
            """
            select count(*) from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2 and c.sentiment='negative'
            """,
            user_id, last6
        )
        tot6 = await conn.fetchval(
            """
            select count(*) from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            """,
            user_id, last6
        )
        neg24 = await conn.fetchval(
            """
            select count(*) from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2 and c.sentiment='negative'
            """,
            user_id, last24
        )
        tot24 = await conn.fetchval(
            """
            select count(*) from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            """,
            user_id, last24
        )
    ratio6 = (neg6 or 0)/max(1,(tot6 or 0))
    ratio24 = (neg24 or 0)/max(1,(tot24 or 0))
    alerts = []
    if ratio6 > 0.35 and ratio6 > ratio24 + 0.1:
        alerts.append({"type":"crisis","message":"Spike in negative sentiment in the last 6h"})
    if (tot6 or 0) > (tot24 or 0)/3:
        alerts.append({"type":"surge","message":"High comment velocity"})
    _cache_set(key, alerts)
    return alerts

@app.get("/social/themes")
async def social_themes(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select c.text, c.sentiment
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= now() - interval '7 days'
            limit 2000
            """,
            user_id
        )
    pos = [r[0] for r in rows if (r[1] or 'neutral')=='positive']
    neg = [r[0] for r in rows if (r[1] or 'neutral')=='negative']
    top_pos = _extract_keywords(pos)[:10]
    top_neg = _extract_keywords(neg)[:10]
    return {"positive": top_pos, "negative": top_neg}

@app.get("/social/mentions")
async def social_mentions(user_id: str, page: int = 1, page_size: int = 50, pool=Depends(get_db)):
    page = max(1, page)
    page_size = max(1, min(200, page_size))
    offset = (page - 1) * page_size
    async with pool.acquire() as conn:
        rows = await conn.fetch("select id,source,title,url,text,sentiment,created_at from mentions where user_id=$1 order by created_at desc offset $2 limit $3", user_id, offset, page_size)
    return [{"id": str(r[0]), "source": r[1], "title": r[2], "url": r[3], "text": r[4], "sentiment": r[5], "created_at": r[6].isoformat() if r[6] else None} for r in rows]

@app.post("/social/seed-mentions")
async def seed_mentions(user_id: str, pool=Depends(get_db)):
    # simple seeding from recent negative and positive comments
    import random
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select c.text, c.sentiment
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1
            order by c.created_at desc limit 100
            """,
            user_id
        )
        for t,s in rows[:20]:
            mid = uuid.uuid4()
            src = random.choice(["twitter","news","forum","reddit","web"])
            await conn.execute(
                "insert into mentions(id,user_id,source,title,url,text,sentiment,created_at) values($1,$2,$3,$4,$5,$6,$7,$8)",
                mid, user_id, src, None, None, t or "", s or "neutral", dt.datetime.utcnow() - dt.timedelta(minutes=random.randint(0,600))
            )
    # invalidate related caches
    for key in [f"sources:{user_id}", f"rep_alerts:{user_id}", f"scorecard:{user_id}"]:
        _cache.pop(key, None)
    return {"ok": True}

@app.get("/social/sources")
async def social_sources(user_id: str, pool=Depends(get_db)):
    key = f"sources:{user_id}"
    cached = _cache_get(key, ttl=60)
    if cached is not None:
        return cached
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "select source, count(*) from mentions where user_id=$1 group by source order by count(*) desc",
            user_id
        )
    out = [{"source": r[0] or "unknown", "count": int(r[1] or 0)} for r in rows]
    _cache_set(key, out)
    return out

@app.get("/social/mentions-trend")
async def social_mentions_trend(user_id: str, days: int = 14, pool=Depends(get_db)):
    start = dt.datetime.combine(dt.datetime.utcnow().date() - dt.timedelta(days=days-1), dt.time.min)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select date(created_at) d, count(*)
            from mentions
            where user_id=$1 and created_at >= $2
            group by d order by d
            """,
            user_id, start
        )
    by_day = { r[0]: int(r[1] or 0) for r in rows }
    data = []
    for i in range(days):
        d = start.date() + dt.timedelta(days=i)
        data.append({"date": d.isoformat(), "count": by_day.get(d, 0)})
    return data

@app.get("/social/watch-hits")
async def social_watch_hits(user_id: str, pool=Depends(get_db)):
    # Look for watch_keywords in last 7 days across comments and mentions
    async with pool.acquire() as conn:
        settings = await conn.fetchval("select settings from users where id=$1", user_id)
        watch = (settings or {}).get("watch_keywords", [])
        if not watch:
            return {"keywords": [], "hits": []}
        since = dt.datetime.utcnow() - dt.timedelta(days=7)
        comm = await conn.fetch(
            """
            select c.text from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            """,
            user_id, since
        )
        ment = await conn.fetch("select text from mentions where user_id=$1 and created_at >= $2", user_id, since)
    texts = [r[0] or "" for r in comm] + [r[0] or "" for r in ment]
    hits = []
    for k in watch:
        k_low = (k or "").lower()
        cnt = 0
        samples = []
        for t in texts:
            low = (t or "").lower()
            if k_low and k_low in low:
                cnt += 1
                if len(samples) < 5:
                    samples.append(t[:160])
        hits.append({"keyword": k, "count": cnt, "samples": samples})
    hits.sort(key=lambda x: -x["count"])
    return {"keywords": watch, "hits": hits}

@app.get("/reputation/scorecard")
async def reputation_scorecard(user_id: str, pool=Depends(get_db)):
    # combine multiple signals for a compact summary
    key = f"scorecard:{user_id}"
    cached = _cache_get(key, ttl=20)
    if cached is not None:
        return cached
    score = await reputation_score(user_id, pool)  # type: ignore
    themes = await social_themes(user_id, pool)    # type: ignore
    sources = await social_sources(user_id, pool)  # type: ignore
    # share of voice from mentions: user vs competitor-tagged sources (source containing ':')
    async with (await get_db()).acquire() as conn:  # type: ignore
        user_mentions = await conn.fetchval("select count(*) from mentions where user_id=$1 and (source not like '%:%' or source is null)", user_id)
        comp_mentions = await conn.fetchval("select count(*) from mentions where user_id=$1 and source like '%:%'", user_id)
    sov_total = max(1, int((user_mentions or 0) + (comp_mentions or 0)))
    sov = round(100.0 * (user_mentions or 0) / sov_total, 1)
    out = {"score": score, "themes": themes, "sources": sources, "share_of_voice": {"you": int(user_mentions or 0), "competitors": int(comp_mentions or 0), "percent_you": sov}}
    _cache_set(key, out)
    return out

@app.get("/reputation/compare")
async def reputation_compare(user_id: str, pool=Depends(get_db)):
    # your score (comments last 24h) vs competitors (mentions with source 'platform:handle') last 24h
    now = dt.datetime.utcnow()
    since = now - dt.timedelta(hours=24)
    async with pool.acquire() as conn:
        your_rows = await conn.fetch(
            """
            select c.sentiment from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            """,
            user_id, since
        )
        comp_rows = await conn.fetch(
            "select sentiment from mentions where user_id=$1 and created_at >= $2 and source like '%:%'",
            user_id, since
        )
    def count_s(rows):
        pos=sum(1 for r in rows if (r[0] or 'neutral')=='positive')
        neu=sum(1 for r in rows if (r[0] or 'neutral')=='neutral')
        neg=sum(1 for r in rows if (r[0] or 'neutral')=='negative')
        return _sentiment_score(pos,neu,neg), pos+neu+neg
    your_score, your_n = count_s(your_rows)
    comp_score, comp_n = count_s(comp_rows)
    return {"you": {"score": your_score, "n": your_n}, "competitors": {"score": comp_score, "n": comp_n}, "delta": your_score - comp_score}

@app.post("/social/report")
async def social_report(user_id: str, pool=Depends(get_db)):
    # A simple 7-day summary report
    trend = await reputation_trend(user_id, 7, pool)  # type: ignore
    score = await reputation_score(user_id, pool)     # type: ignore
    themes = await social_themes(user_id, pool)       # type: ignore
    alerts = await reputation_alerts(user_id, pool)   # type: ignore
    sources = await social_sources(user_id, pool)     # type: ignore
    compare = await reputation_compare(user_id, pool) # type: ignore
    lines = []
    lines.append("Reputation Report (7 days)\n")
    lines.append(f"Current 24h score: {score['score']} ({'+' if score['trend']>=0 else ''}{score['trend']} vs prior)")
    avg7 = int(sum(d['score'] for d in trend)/max(1,len(trend)))
    lines.append(f"7-day average score: {avg7}")
    lines.append(f"Vs competitors: you {compare['you']['score']} vs comps {compare['competitors']['score']} (Δ {compare['delta']})\n")
    if themes.get('negative'):
        lines.append("Top negative themes: " + ", ".join(themes['negative'][:5]))
    if themes.get('positive'):
        lines.append("Top positive themes: " + ", ".join(themes['positive'][:5]))
    if sources:
        top_src = ", ".join(f"{s['source']}({s['count']})" for s in sources[:5])
        lines.append(f"Top sources: {top_src}")
    if alerts:
        lines.append("Active alerts:")
        for a in alerts:
            lines.append(f" - [{a['type']}] {a['message']}")
    text = "\n".join(lines)
    return {"text": text}

@app.delete("/social/mentions/{mention_id}")
async def delete_mention(mention_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id from mentions where id=$1 and user_id=$2", uuid.UUID(mention_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("delete from mentions where id=$1", uuid.UUID(mention_id))
    # invalidate related caches
    for key in [f"sources:{user_id}", f"rep_alerts:{user_id}", f"scorecard:{user_id}"]:
        _cache.pop(key, None)
    return {"ok": True}

def slugify_title(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s

@app.get("/profiles")
async def list_profiles(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("select id, name, platforms from creator_profiles where user_id=$1", user_id)
    return [{"id": str(r[0]), "name": r[1], "platforms": r[2]} for r in rows]

@app.post("/platform/connect")
async def platform_connect(body: ConnectBody, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        pid = uuid.UUID(body.profile_id)
        rec_id = uuid.uuid4()
        await conn.execute(
            "insert into platform_connections(id, profile_id, platform, tokens, last_sync) values($1,$2,$3,$4,$5)",
            rec_id, pid, body.platform, json.dumps(body.tokens), dt.datetime.utcnow()
        )
    return {"ok": True, "id": str(rec_id)}

@app.get("/uploads")
async def list_uploads(user_id: str, page: int = 1, page_size: int = 50, pool=Depends(get_db)):
    page = max(1, page)
    page_size = max(1, min(200, page_size))
    offset = (page - 1) * page_size
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select cu.id, cu.platform, cu.title, cu.url, cu.posted_at, p.id as profile_id, p.voice_data
            from content_uploads cu
            join creator_profiles p on p.id = cu.profile_id
            where p.user_id=$1
            order by cu.posted_at desc
            offset $2 limit $3
            """,
            user_id, offset, page_size
        )
    items = []
    for r in rows:
        dedupe_key = slugify_title(r[2])
        items.append({
            "id": str(r[0]),
            "platform": r[1],
            "title": r[2],
            "url": r[3],
            "posted_at": r[4].isoformat() if r[4] else None,
            "dedupe_key": dedupe_key,
            "profile_id": str(r[5]) if r[5] else None,
            "voice_data": r[6] or {},
        })
    return items

@app.get("/comments/{upload_id}")
async def get_comments(upload_id: str, page: int = 1, page_size: int = 100, pool=Depends(get_db)):
    page = max(1, page)
    page_size = max(1, min(500, page_size))
    offset = (page - 1) * page_size
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "select id, author, text, sentiment, replied, flagged, hidden, created_at from comments where upload_id=$1 order by created_at desc offset $2 limit $3",
            uuid.UUID(upload_id), offset, page_size
        )
    return [{
        "id": str(r[0]),
        "author": r[1],
        "text": r[2],
        "sentiment": r[3],
        "replied": r[4],
        "flagged": r[5],
        "hidden": r[6],
        "created_at": r[7].isoformat() if r[7] else None
    } for r in rows]

@app.post("/comments/{comment_id}/reply")
async def reply_comment(comment_id: str, body: ReplyBody, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        await conn.execute(
            "insert into responses(id, comment_id, text, sent_at, ai_generated) values($1,$2,$3,$4,$5)",
            uuid.uuid4(), uuid.UUID(comment_id), body.text, dt.datetime.utcnow(), body.ai_generated if body.ai_generated is not None else True
        )
        await conn.execute("update comments set replied=true where id=$1", uuid.UUID(comment_id))
    # For now, simulate platform send success
    return {"ok": True}

@app.get("/comments/group")
async def comments_group(user_id: str, dedupe_key: str, pool=Depends(get_db)):
    # Gather comments from all uploads for this user matching dedupe_key
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select c.id, c.author, c.text, c.sentiment, c.replied, c.flagged, c.hidden, c.created_at
            from comments c
            join content_uploads u on u.id = c.upload_id
            join creator_profiles p on p.id = u.profile_id
            where p.user_id=$1 and lower(regexp_replace(u.title, '[^a-z0-9\s]', '', 'g')) = $2
            order by c.created_at desc
            """,
            user_id, dedupe_key
        )
    return [{
        "id": str(r[0]),
        "author": r[1],
        "text": r[2],
        "sentiment": r[3],
        "replied": r[4],
        "flagged": r[5],
        "hidden": r[6],
        "created_at": r[7].isoformat() if r[7] else None
    } for r in rows]

@app.post("/ai/generate-response")
async def ai_generate(body: AIRq):
    prompt = f"Reply to this comment in a friendly, concise creator voice. Comment: '{body.comment_text}'"
    tone = body.voice_data.get("tone") if body.voice_data else None
    if tone:
        prompt += f"\nPrefer tone: {tone}."
    if openai and OPENAI_API_KEY:
        try:
            resp = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role":"user","content":prompt}],
                temperature=0.7,
                max_tokens=100,
            )
            text = resp.choices[0].message.content.strip()
            return {"text": text}
        except Exception as e:
            pass
    # fallback if no API key or error
    fallback = "Thanks for sharing! Appreciate you being here."
    return {"text": fallback}

@app.post("/voice/learn")
async def voice_learn(body: VoiceLearnRq, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select r.text
            from responses r
            join comments c on c.id = r.comment_id
            join content_uploads u on u.id = c.upload_id
            join creator_profiles p on p.id = u.profile_id
            where p.user_id=$1
            """,
            body.user_id
        )
        sample = [r[0] for r in rows][:200]
        if not sample:
            data = {"tone":"friendly","style":"concise"}
        else:
            avg_len = sum(len(x) for x in sample)/len(sample)
            exclam = sum(x.count("!") for x in sample)/max(1,len(sample))
            data = {"tone":"friendly" if exclam<1 else "excited", "avg_len": avg_len, "style":"concise" if avg_len<120 else "detailed"}
        # store on all profiles for this user (simple approach)
        await conn.execute("update creator_profiles set voice_data=$2 where user_id=$1", body.user_id, json.dumps(data))
    return {"ok": True, "voice_data": data}

@app.get("/users/settings")
async def get_settings(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select settings from users where id=$1", user_id)
    return row[0] if row else {}

@app.post("/users/settings")
async def set_settings(body: SettingsRq, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        await conn.execute("update users set settings=$2 where id=$1", body.user_id, json.dumps(body.settings))
    return {"ok": True}

@app.get("/competitors")
async def list_competitors(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            select c.id, c.competitor_handle, c.platform
            from competitors c
            where c.profile_id in (select id from creator_profiles where user_id=$1)
            order by c.platform, c.competitor_handle
            """,
            user_id
        )
    return [{"id": str(r[0]), "handle": r[1], "platform": r[2]} for r in rows]

@app.post("/competitors")
async def add_competitor(body: CompetitorBody, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        prof = await conn.fetchrow("select id from creator_profiles where user_id=$1 order by created_at limit 1", body.user_id)
        if not prof:
            raise HTTPException(400, "No profile found for user")
        cid = uuid.uuid4()
        await conn.execute(
            "insert into competitors(id, profile_id, competitor_handle, platform) values($1,$2,$3,$4)",
            cid, prof[0], body.competitor_handle, body.platform
        )
    return {"ok": True, "id": str(cid)}

@app.delete("/competitors/{comp_id}")
async def delete_competitor(comp_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        # Ensure it belongs to this user
        row = await conn.fetchrow(
            """
            select c.id
            from competitors c
            join creator_profiles p on p.id = c.profile_id
            where c.id=$1 and p.user_id=$2
            """,
            uuid.UUID(comp_id), user_id
        )
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("delete from competitors where id=$1", uuid.UUID(comp_id))
    return {"ok": True}

@app.post("/competitors/seed-mentions")
async def competitors_seed_mentions(user_id: str, pool=Depends(get_db)):
    import random
    async with pool.acquire() as conn:
        comps = await conn.fetch(
            """
            select c.competitor_handle, c.platform
            from competitors c
            join creator_profiles p on p.id=c.profile_id
            where p.user_id=$1
            """,
            user_id
        )
        for handle, platform in comps:
            for _ in range(random.randint(3,7)):
                sentiment = random.choice(["positive","neutral","negative","positive","neutral"])  # skew positive/neutral
                txt = generate_comment_text("Tech", sentiment)
                mid = uuid.uuid4()
                src = f"{platform}:{handle}"
                await conn.execute(
                    "insert into mentions(id,user_id,source,title,url,text,sentiment,created_at) values($1,$2,$3,$4,$5,$6,$7,$8)",
                    mid, user_id, src, None, None, txt, sentiment, dt.datetime.utcnow() - dt.timedelta(minutes=random.randint(0,1440))
                )
    return {"ok": True}

@app.get("/competitors/insights")
async def competitors_insights(user_id: str, pool=Depends(get_db)):
    import random
    async with pool.acquire() as conn:
        comps = await conn.fetch(
            """
            select c.competitor_handle, c.platform
            from competitors c
            join creator_profiles p on p.id=c.profile_id
            where p.user_id=$1
            order by c.platform, c.competitor_handle
            """,
            user_id
        )
    results = []
    for handle, platform in comps:
        # synthesize some comments to derive keywords
        sample = []
        for _ in range(50):
            sentiment = random.choice(["positive","neutral","negative","positive","positive"])  # skew positive
            sample.append(generate_comment_text("Tech", sentiment))
        themes = _extract_keywords(sample)[:8]
        score = random.randint(45, 85)
        cadence = random.randint(2, 7)  # posts/week
        engagement = random.randint(1000, 50000)
        results.append({
            "handle": handle,
            "platform": platform,
            "reputation_score": score,
            "posting_cadence_per_week": cadence,
            "avg_engagement": engagement,
            "top_themes": themes,
            "recent_highlights": sample[:5]
        })
    return results

@app.get("/competitors/topics")
async def competitors_topics(user_id: str, pool=Depends(get_db)):
    # Extract top shared topics across competitors' synthesized highlights
    comps = await competitors_insights(user_id, pool)  # type: ignore
    all_texts: List[str] = []
    for c in comps:
        all_texts.extend(c.get("recent_highlights", []))
    topics = _extract_keywords(all_texts)[:20]
    return {"topics": topics}

@app.get("/competitors/top-posts")
async def competitors_top_posts(user_id: str, pool=Depends(get_db)):
    # Return synthesized top posts with engagement
    import random
    comps = await competitors_insights(user_id, pool)  # type: ignore
    posts = []
    for c in comps:
        for i, t in enumerate(c.get("recent_highlights", [])[:3]):
            posts.append({
                "handle": c["handle"],
                "platform": c["platform"],
                "title": t[:60] + ("…" if len(t)>60 else ""),
                "engagement": int(c["avg_engagement"]) + random.randint(-500, 5000)
            })
    posts.sort(key=lambda x: -x["engagement"])
    return posts[:10]

@app.get("/competitors/opportunities")
async def competitors_opportunities(user_id: str, pool=Depends(get_db)):
    # naive: cross-reference your negative themes vs competitor positive themes
    themes = await social_themes(user_id, pool)  # type: ignore
    comps = await competitors_insights(user_id, pool)  # type: ignore
    comp_pos: Dict[str,int] = {}
    for c in comps:
        for k in c.get("top_themes", []):
            comp_pos[k] = comp_pos.get(k,0)+1
    you_neg = set(themes.get("negative", []))
    ranked = sorted(({"topic":k, "competitor_support":v} for k,v in comp_pos.items() if k in you_neg), key=lambda x: -x["competitor_support"])
    return ranked[:10]

# ---------- Phase 4: Ideas & Assistant ----------

def _peel(lst: Optional[List[str]], n: int) -> List[str]:
    return list(dict.fromkeys((lst or [])[:n]))

@app.post("/ideas/generate")
async def ideas_generate(body: IdeasGenRq, pool=Depends(get_db)):
    # Use social themes and competitor topics as seed signals
    themes = await social_themes(body.user_id, pool)  # type: ignore
    comps = await competitors_topics(body.user_id, pool)  # type: ignore
    pos = _peel(themes.get('positive'), 8)
    neg = _peel(themes.get('negative'), 8)
    tops = _peel(comps.get('topics'), 12)
    seeds = pos + tops + neg
    ideas: List[str] = []
    for i, t in enumerate(seeds[: max(1, body.count or 10)]):
        # simple templates
        ideas.append(f"Why {t} matters now (+ quick tips)")
        if len(ideas) >= (body.count or 10): break
        ideas.append(f"{t.title()} myths vs facts")
        if len(ideas) >= (body.count or 10): break
        ideas.append(f"I tried {t} so you don't have to")
        if len(ideas) >= (body.count or 10): break
    # insert unique ideas
    async with pool.acquire() as conn:
        existing = await conn.fetch("select title from ideas where user_id=$1", body.user_id)
        exist_set = set(r[0] for r in existing)
        created = []
        for title in ideas:
            if title in exist_set: continue
            iid = uuid.uuid4()
            await conn.execute("insert into ideas(id,user_id,title,status) values($1,$2,$3,'backlog')", iid, body.user_id, title)
            created.append({"id": str(iid), "title": title, "status": "backlog"})
    return {"ok": True, "created": created}

@app.get("/ideas")
async def ideas_list(user_id: str, page: int = 1, page_size: int = 100, pool=Depends(get_db)):
    page = max(1, page)
    page_size = max(1, min(200, page_size))
    offset = (page - 1) * page_size
    async with pool.acquire() as conn:
        rows = await conn.fetch("select id,title,status,created_at from ideas where user_id=$1 order by created_at desc offset $2 limit $3", user_id, offset, page_size)
    return [{"id": str(r[0]), "title": r[1], "status": r[2], "created_at": r[3].isoformat() if r[3] else None} for r in rows]

@app.post("/ideas/{idea_id}/status")
async def idea_set_status(idea_id: str, body: IdeaStatusRq, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id from ideas where id=$1 and user_id=$2", uuid.UUID(idea_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("update ideas set status=$2 where id=$1", uuid.UUID(idea_id), body.status)
    return {"ok": True}

@app.delete("/ideas/{idea_id}")
async def idea_delete(idea_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id from ideas where id=$1 and user_id=$2", uuid.UUID(idea_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("delete from ideas where id=$1", uuid.UUID(idea_id))
    return {"ok": True}

@app.post("/briefs/generate")
async def briefs_generate(body: BriefGenRq, pool=Depends(get_db)):
    # build a simple brief for the idea
    async with pool.acquire() as conn:
        idea = await conn.fetchrow("select title from ideas where id=$1 and user_id=$2", uuid.UUID(body.idea_id), body.user_id)
        if not idea:
            raise HTTPException(404, "Idea not found")
    title = idea[0]
    themes = await social_themes(body.user_id, pool)  # type: ignore
    pos = ", ".join(_peel(themes.get('positive'), 5))
    neg = ", ".join(_peel(themes.get('negative'), 5))
    prompt = f"Create a concise content brief for the idea '{title}'. Include: Hook, 3-5 Key Points, and a clear CTA. Audience themes: positive: {pos}; negative: {neg}. Tone: practical, friendly."
    content = None
    if openai and OPENAI_API_KEY:
        try:
            resp = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role":"user","content": prompt}],
                temperature=0.7,
                max_tokens=400,
            )
            content = resp.choices[0].message.content.strip()
        except Exception:
            content = None
    if not content:
        content = (
            f"Brief: {title}\n"
            f"Hook: A sharp one-liner that tees up {title}.\n"
            f"Key Points:\n- Why it matters now\n- What to do first\n- Common mistakes\n- Quick win\n"
            f"CTA: Comment with your biggest question about {title}."
        )
    bid = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute("insert into briefs(id,user_id,idea_id,content) values($1,$2,$3,$4)", bid, body.user_id, uuid.UUID(body.idea_id), content)
    return {"ok": True, "id": str(bid), "content": content}

@app.get("/briefs")
async def briefs_list(user_id: str, idea_id: Optional[str] = None, page: int = 1, page_size: int = 50, pool=Depends(get_db)):
    page = max(1, page)
    page_size = max(1, min(200, page_size))
    offset = (page - 1) * page_size
    async with pool.acquire() as conn:
        if idea_id:
            rows = await conn.fetch("select id,idea_id,content,created_at from briefs where user_id=$1 and idea_id=$2 order by created_at desc offset $3 limit $4", user_id, uuid.UUID(idea_id), offset, page_size)
        else:
            rows = await conn.fetch("select id,idea_id,content,created_at from briefs where user_id=$1 order by created_at desc offset $2 limit $3", user_id, offset, page_size)
    return [{"id": str(r[0]), "idea_id": str(r[1]) if r[1] else None, "content": r[2], "created_at": r[3].isoformat() if r[3] else None} for r in rows]

@app.post("/assistant/caption")
async def assistant_caption(body: CaptionRq, pool=Depends(get_db)):
    # Generate a short caption from idea or brief
    base = body.brief or body.idea or "A helpful post"
    voice = {}
    async with pool.acquire() as conn:
        voice = await conn.fetchval("select voice_data from creator_profiles where user_id=$1 order by created_at limit 1", body.user_id) or {}
    tone = (voice or {}).get("tone", "friendly")
    prompt = f"Write a short social caption in a {tone} tone for: {base}. Keep it under 200 characters and include a subtle CTA."
    text = None
    if openai and OPENAI_API_KEY:
        try:
            resp = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role":"user","content": prompt}],
                temperature=0.8,
                max_tokens=80,
            )
            text = resp.choices[0].message.content.strip()
        except Exception:
            text = None
    if not text:
        text = f"Quick take: {base} — what would you add? 👇"
    return {"text": text}

@app.post("/assistant/titles")
async def assistant_titles(body: CaptionRq):
    topic = body.idea or "Your topic"
    titles = [
        f"{topic}: 5 Things I Wish I Knew Sooner",
        f"Stop Doing This With {topic}",
        f"{topic} in 60 Seconds",
        f"The {topic} Playbook",
        f"{topic} Mistakes (and how to avoid them)",
    ]
    return {"titles": titles}

@app.post("/ideas/prepare")
async def ideas_prepare(body: PrepareRq, pool=Depends(get_db)):
    # Generate brief + caption + titles in one call
    b = await briefs_generate(BriefGenRq(user_id=body.user_id, idea_id=body.idea_id), pool)  # type: ignore
    # fetch idea title
    async with pool.acquire() as conn:
        title = await conn.fetchval("select title from ideas where id=$1 and user_id=$2", uuid.UUID(body.idea_id), body.user_id)
    cap = await assistant_caption(CaptionRq(user_id=body.user_id, idea=title, brief=b.get('content')), pool)  # type: ignore
    ttl = await assistant_titles(CaptionRq(user_id=body.user_id, idea=title))  # type: ignore
    return {"ok": True, "brief": b.get('content'), "caption": cap.get('text'), "titles": ttl.get('titles')}

@app.get("/ideas/export")
async def ideas_export(user_id: str, format: str = 'csv', pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("select title,status,created_at from ideas where user_id=$1 order by created_at desc", user_id)
    if format == 'md':
        lines = ["# Ideas\n"]
        for r in rows:
            lines.append(f"- [{r[1]}] {r[0]} ({(r[2] or dt.datetime.utcnow()).date().isoformat()})")
        return {"text": "\n".join(lines)}
    # csv default
    csv_lines = ["title,status,created_at"]
    for r in rows:
        created = (r[2] or dt.datetime.utcnow()).isoformat()
        title = (r[0] or '').replace('"','""')
        csv_lines.append(f'"{title}",{r[1]},{created}')
    return {"text": "\n".join(csv_lines)}

@app.get("/briefs/export")
async def briefs_export(user_id: str, idea_id: Optional[str] = None, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        if idea_id:
            rows = await conn.fetch("select content from briefs where user_id=$1 and idea_id=$2 order by created_at desc", user_id, uuid.UUID(idea_id))
        else:
            rows = await conn.fetch("select content from briefs where user_id=$1 order by created_at desc", user_id)
    text = "\n\n---\n\n".join(r[0] for r in rows)
    return {"text": text}

@app.post("/schedule/create")
async def schedule_create(body: ScheduleCreateRq, pool=Depends(get_db)):
    when = dt.datetime.fromisoformat(body.scheduled_at)
    caption = body.caption
    if not caption and body.idea_id:
        # try to make a caption from idea title and latest brief
        async with pool.acquire() as conn:
            title = await conn.fetchval("select title from ideas where id=$1 and user_id=$2", uuid.UUID(body.idea_id), body.user_id)
            b = await conn.fetchrow("select content from briefs where user_id=$1 and idea_id=$2 order by created_at desc", body.user_id, uuid.UUID(body.idea_id))
        cap = await assistant_caption(CaptionRq(user_id=body.user_id, idea=title, brief=b[0] if b else None), pool)  # type: ignore
        caption = cap.get('text')
    sid = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute(
            "insert into schedules(id,user_id,idea_id,platform,caption,scheduled_at,status) values($1,$2,$3,$4,$5,$6,'scheduled')",
            sid, body.user_id, uuid.UUID(body.idea_id) if body.idea_id else None, body.platform, caption, when
        )
    return {"ok": True, "id": str(sid)}

@app.get("/schedule")
async def schedule_list(user_id: str, page: int = 1, page_size: int = 100, pool=Depends(get_db)):
    page = max(1, page)
    page_size = max(1, min(500, page_size))
    offset = (page - 1) * page_size
    async with pool.acquire() as conn:
        rows = await conn.fetch("select id,idea_id,platform,caption,scheduled_at,status from schedules where user_id=$1 order by scheduled_at offset $2 limit $3", user_id, offset, page_size)
    return [{"id": str(r[0]), "idea_id": str(r[1]) if r[1] else None, "platform": r[2], "caption": r[3], "scheduled_at": r[4].isoformat() if r[4] else None, "status": r[5]} for r in rows]

@app.post("/schedule/{sched_id}/publish")
async def schedule_publish(sched_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id,idea_id from schedules where id=$1 and user_id=$2", uuid.UUID(sched_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("update schedules set status='posted' where id=$1", uuid.UUID(sched_id))
        if row[1]:
            await conn.execute("update ideas set status='posted' where id=$1", row[1])
    return {"ok": True}

@app.delete("/schedule/{sched_id}")
async def schedule_delete(sched_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id from schedules where id=$1 and user_id=$2", uuid.UUID(sched_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("delete from schedules where id=$1", uuid.UUID(sched_id))
    return {"ok": True}

@app.post("/schedule/bulk-create")
async def schedule_bulk_create(body: BulkScheduleRq, pool=Depends(get_db)):
    results = []
    for it in body.items:
        try:
            r = await schedule_create(ScheduleCreateRq(user_id=body.user_id, idea_id=it.idea_id, platform=it.platform, caption=it.caption, scheduled_at=it.scheduled_at), pool)  # type: ignore
            results.append({"ok": True, "id": r.get('id')})
        except Exception as e:
            results.append({"ok": False, "error": str(e)})
    return {"results": results}

@app.post("/schedule/from-shortlist")
async def schedule_from_shortlist(body: FromShortlistRq, pool=Depends(get_db)):
    start = dt.datetime.fromisoformat(body.start_at)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "select id from ideas where user_id=$1 and status='shortlist' order by created_at",
            body.user_id
        )
    ids = [str(r[0]) for r in rows]
    if body.limit:
        ids = ids[: body.limit]
    results = []
    for idx, iid in enumerate(ids):
        when = start + dt.timedelta(minutes=body.spacing_minutes * idx)
        try:
            cap = None
            if body.auto_caption:
                # try grab title and latest brief to generate caption
                async with pool.acquire() as conn:
                    title = await conn.fetchval("select title from ideas where id=$1", uuid.UUID(iid))
                    b = await conn.fetchrow("select content from briefs where user_id=$1 and idea_id=$2 order by created_at desc", body.user_id, uuid.UUID(iid))
                cap_resp = await assistant_caption(CaptionRq(user_id=body.user_id, idea=title, brief=b[0] if b else None), pool)  # type: ignore
                cap = cap_resp.get('text')
            r = await schedule_create(ScheduleCreateRq(user_id=body.user_id, idea_id=iid, platform=body.platform, caption=cap, scheduled_at=when.isoformat()), pool)  # type: ignore
            results.append({"ok": True, "id": r.get('id')})
        except Exception as e:
            results.append({"ok": False, "error": str(e)})
    return {"results": results}

@app.post("/ideas/prepare-batch")
async def ideas_prepare_batch(body: BatchPrepareRq, pool=Depends(get_db)):
    results = []
    for iid in body.ids:
        try:
            r = await ideas_prepare(PrepareRq(user_id=body.user_id, idea_id=iid), pool)  # type: ignore
            results.append({"idea_id": iid, "ok": True})
        except Exception as e:
            results.append({"idea_id": iid, "ok": False, "error": str(e)})
    return {"results": results}

@app.get("/schedule/export")
async def schedule_export(user_id: str, format: str = 'ics', pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("select platform, caption, scheduled_at, id from schedules where user_id=$1 order by scheduled_at", user_id)
    if format == 'csv':
        out = ["platform,caption,scheduled_at,id"]
        for r in rows:
            cap = (r[1] or '').replace('"','""')
            out.append(f'{r[0]},"{cap}",{(r[2] or dt.datetime.utcnow()).isoformat()},{r[3]}')
        return {"text": "\n".join(out)}
    # ICS format
    def fmt(dtval: dt.datetime) -> str:
        if dtval.tzinfo is None:
            dtval = dtval.replace(tzinfo=dt.timezone.utc)
        return dtval.astimezone(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Repruv//Schedule//EN",
    ]
    now = fmt(dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc))
    for r in rows:
        start = fmt(r[2] or dt.datetime.utcnow())
        summary = (r[1] or f"Post on {r[0]}").replace('\n',' ')
        lines += [
            "BEGIN:VEVENT",
            f"UID:{r[3]}",
            f"DTSTAMP:{now}",
            f"DTSTART:{start}",
            f"SUMMARY:{summary}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return {"text": "\n".join(lines)}

@app.post("/automation/run")
async def automation_run(user_id: str, pool=Depends(get_db)):
    # Read rules from user settings and apply to last 200 comments
    async with pool.acquire() as conn:
        settings = await conn.fetchval("select settings from users where id=$1", user_id)
        settings = settings or {}
        auto_reply_pos = settings.get("auto_reply_positive", False)
        negative_keywords = settings.get("negative_keywords", [])
        spam_keywords = settings.get("spam_keywords", [])
        # fetch recent comments not replied/hidden
        rows = await conn.fetch(
            """
            select c.id, c.text, c.sentiment
            from comments c
            join content_uploads u on u.id = c.upload_id
            join creator_profiles p on p.id = u.profile_id
            where p.user_id=$1 and c.hidden=false
            order by c.created_at desc
            limit 200
            """,
            user_id
        )
        actions = {"replied":0, "flagged":0, "hidden":0}
        for r in rows:
            cid, text, sentiment = str(r[0]), r[1], r[2] or "neutral"
            low = (text or "").lower()
            if auto_reply_pos and sentiment == "positive":
                await conn.execute(
                    "insert into responses(id, comment_id, text, sent_at, ai_generated) values($1,$2,$3,$4,$5)",
                    uuid.uuid4(), uuid.UUID(cid), "Thanks so much! 🙏", dt.datetime.utcnow(), True
                )
                await conn.execute("update comments set replied=true where id=$1", uuid.UUID(cid))
                actions["replied"] += 1
            if any(k.lower() in low for k in negative_keywords):
                await conn.execute("update comments set flagged=true where id=$1", uuid.UUID(cid))
                actions["flagged"] += 1
            if any(k.lower() in low for k in spam_keywords):
                await conn.execute("update comments set hidden=true where id=$1", uuid.UUID(cid))
                actions["hidden"] += 1
    return {"ok": True, "actions": actions}

@app.get("/templates")
async def list_templates(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("select id,name,text from response_templates where user_id=$1 order by created_at desc", user_id)
    return [{"id": str(r[0]), "name": r[1], "text": r[2]} for r in rows]

@app.post("/templates")
async def create_template(body: TemplatesRq, pool=Depends(get_db)):
    tid = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute("insert into response_templates(id,user_id,name,text) values($1,$2,$3,$4)", tid, body.user_id, body.name, body.text)
    return {"ok": True, "id": str(tid)}

@app.delete("/templates/{template_id}")
async def delete_template(template_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        await conn.execute("delete from response_templates where id=$1", uuid.UUID(template_id))
    return {"ok": True}

@app.post("/comments/bulk")
async def comments_bulk(body: BulkActionRq, pool=Depends(get_db)):
    ids = [uuid.UUID(x) for x in body.ids]
    async with pool.acquire() as conn:
        if body.action == 'reply':
            text = body.text or "Thanks!"
            for cid in ids:
                await conn.execute(
                    "insert into responses(id, comment_id, text, sent_at, ai_generated) values($1,$2,$3,$4,$5)",
                    uuid.uuid4(), cid, text, dt.datetime.utcnow(), body.ai_generated if body.ai_generated is not None else True
                )
                await conn.execute("update comments set replied=true where id=$1", cid)
        elif body.action == 'flag':
            await conn.execute("update comments set flagged=true where id = any($1)", ids)
        elif body.action == 'hide':
            await conn.execute("update comments set hidden=true where id = any($1)", ids)
        elif body.action == 'approve':
            await conn.execute("update comments set hidden=false, flagged=false where id = any($1)", ids)
        elif body.action == 'report':
            await conn.execute("update comments set flagged=true, hidden=true where id = any($1)", ids)
        elif body.action == 'delete':
            await conn.execute("delete from comments where id = any($1)", ids)
        else:
            raise HTTPException(400, 'unknown action')
    return {"ok": True}

@app.post("/platform/sync-uploads")
async def platform_sync_uploads(profile_id: str, platform: str, pool=Depends(get_db)):
    # For Phase 2: mock sync by creating a handful of uploads for this platform
    async with pool.acquire() as conn:
        now = dt.datetime.utcnow()
        for i in range(3):
            uid = uuid.uuid4()
            title = f"Synced {platform.title()} Upload {i+1}"
            await conn.execute(
                "insert into content_uploads(id, profile_id, platform, title, url, posted_at) values($1,$2,$3,$4,$5,$6)",
                uid, uuid.UUID(profile_id), platform, title, None, now - dt.timedelta(days=i)
            )
    return {"ok": True}

@app.post("/platform/sync-comments")
async def platform_sync_comments(profile_id: str, platform: str, pool=Depends(get_db)):
    # Mock: generate comments for the last 5 uploads on this profile+platform
    import random
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "select id, title from content_uploads where profile_id=$1 and platform=$2 order by posted_at desc limit 5",
            uuid.UUID(profile_id), platform
        )
        for u in rows:
            upload_id = u[0]
            for _ in range(random.randint(30,80)):
                sent_roll = random.random()
                sentiment = 'positive' if sent_roll < 0.7 else ('neutral' if sent_roll < 0.9 else 'negative')
                text = generate_comment_text('Tech', sentiment)
                await conn.execute(
                    "insert into comments(id, upload_id, author, text, sentiment, replied) values($1,$2,$3,$4,$5,$6)",
                    uuid.uuid4(), upload_id, f'user{random.randint(1000,9999)}', text, sentiment, False
                )
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)

# ---------------- Phase 5: Analytics & Reporting ----------------

@app.post("/analytics/overview")
async def analytics_overview(body: AnalyticsRq, pool=Depends(get_db)):
    # Basic engagement proxies from comments and uploads for last N days
    since = dt.datetime.utcnow() - dt.timedelta(days=max(1, body.days))
    async with pool.acquire() as conn:
        # comments per platform
        rows = await conn.fetch(
            """
            select u.platform,
                   count(c.*) as comments,
                   sum(case when c.sentiment='positive' then 1 else 0 end) as pos,
                   sum(case when c.sentiment='negative' then 1 else 0 end) as neg
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            group by u.platform
            order by comments desc
            """,
            body.user_id, since
        )
        # posts per platform
        posts = await conn.fetch(
            """
            select u.platform, count(*) as posts
            from content_uploads u
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and u.posted_at >= $2
            group by u.platform
            """,
            body.user_id, since
        )
    by_platform = []
    posts_map = { r[0]: int(r[1] or 0) for r in posts }
    for r in rows:
        platform = r[0]
        comments = int(r[1] or 0)
        pos = int(r[2] or 0)
        neg = int(r[3] or 0)
        by_platform.append({
            "platform": platform,
            "comments": comments,
            "positive": pos,
            "negative": neg,
            "comments_per_post": round(comments/max(1, posts_map.get(platform, 0)), 1)
        })
    # best time to post: hour of day with most positive comments density
    async with pool.acquire() as conn:
        rows2 = await conn.fetch(
            """
            select extract(hour from c.created_at) as h,
                   sum(case when c.sentiment='positive' then 1 else 0 end) as pos,
                   count(*) as total
            from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            group by h
            order by h
            """,
            body.user_id, since
        )
    best_hour = None
    best_score = -1.0
    hours = []
    for r in rows2:
        h = int(r[0]) if r[0] is not None else 0
        pos = int(r[1] or 0)
        total = int(r[2] or 0)
        score = (pos / max(1, total))
        hours.append({"hour": h, "positive_ratio": round(score, 3), "total": total})
        if score > best_score and total >= 5:
            best_score = score
            best_hour = h
    return {"by_platform": by_platform, "best_hour": best_hour, "hours": hours}

@app.get("/analytics/posting-times")
async def analytics_posting_times(user_id: str, days: int = 30, pool=Depends(get_db)):
    data = await analytics_overview(AnalyticsRq(user_id=user_id, days=days), pool)  # type: ignore
    return {"best_hour": data.get("best_hour"), "hours": data.get("hours")}

@app.get("/analytics/score")
async def analytics_score(user_id: str, days: int = 30, pool=Depends(get_db)):
    # An overall score combining average reputation and growth in comments
    trend = await reputation_trend(user_id, min(30, days), pool)  # type: ignore
    avg = sum(x["score"] for x in trend) / max(1, len(trend))
    # growth proxy: comments last 3 days vs prior 3
    now = dt.datetime.utcnow()
    start = now - dt.timedelta(days=days)
    async with pool.acquire() as conn:
        recent = await conn.fetchval(
            """
            select count(*) from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2
            """,
            user_id, now - dt.timedelta(days=3)
        )
        prior = await conn.fetchval(
            """
            select count(*) from comments c
            join content_uploads u on u.id=c.upload_id
            join creator_profiles p on p.id=u.profile_id
            where p.user_id=$1 and c.created_at >= $2 and c.created_at < $3
            """,
            user_id, now - dt.timedelta(days=6), now - dt.timedelta(days=3)
        )
    growth = ((recent or 0) - (prior or 0)) / max(1, (prior or 1))
    score = int(round((avg * 0.8) + (min(1.0, max(-1.0, growth)) * 20)))
    return {"score": score, "avg_sentiment": round(avg,1), "growth_ratio": round(growth,3)}

@app.get("/analytics/export")
async def analytics_export(user_id: str, days: int = 30, kind: str = "overview", pool=Depends(get_db)):
    """Export analytics data as CSV: kind=overview|hours"""
    data = await analytics_overview(AnalyticsRq(user_id=user_id, days=days), pool)  # type: ignore
    if kind == "hours":
        lines = ["hour,positive_ratio,total"]
        for h in data.get("hours", []):
            lines.append(f"{int(h['hour'])},{h['positive_ratio']},{int(h['total'])}")
        return {"text": "\n".join(lines)}
    # overview default
    lines = ["platform,comments,positive,negative,comments_per_post"]
    for bp in data.get("by_platform", []):
        lines.append(f"{bp['platform']},{bp['comments']},{bp['positive']},{bp['negative']},{bp['comments_per_post']}")
    return {"text": "\n".join(lines)}

@app.post("/reports")
async def create_report(body: ReportCreateRq, pool=Depends(get_db)):
    # Compile a digest using analytics + socials
    rng = max(1, body.range_days)
    trend = await reputation_trend(body.user_id, rng, pool)  # type: ignore
    score = await reputation_score(body.user_id, pool)       # type: ignore
    overview = await analytics_overview(AnalyticsRq(user_id=body.user_id, days=rng), pool)  # type: ignore
    scorecard = await reputation_scorecard(body.user_id, pool)  # type: ignore
    title = body.title or f"Creator Performance Report ({rng}d)"
    lines = [title, ""]
    lines.append(f"Reputation (24h): {score['score']} ({'+' if score['trend']>=0 else ''}{score['trend']})")
    avg = int(sum(d['score'] for d in trend)/max(1,len(trend)))
    lines.append(f"Average sentiment ({rng}d): {avg}")
    if overview.get('best_hour') is not None:
        lines.append(f"Best posting hour: {int(overview['best_hour']):02d}:00")
    if overview.get('by_platform'):
        lines.append("By platform:")
        for bp in overview['by_platform']:
            lines.append(f" - {bp['platform']}: {bp['comments']} comments ({bp['comments_per_post']} per post)")
    sov = scorecard.get('share_of_voice', {})
    if sov:
        lines.append(f"Share of voice: You {sov.get('you',0)} vs Competitors {sov.get('competitors',0)} ({sov.get('percent_you',0)}% you)")
    text = "\n".join(lines)
    rid = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute("insert into reports(id,user_id,title,content) values($1,$2,$3,$4)", rid, body.user_id, title, text)
    return {"ok": True, "id": str(rid), "title": title, "text": text}

@app.get("/reports")
async def list_reports(user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("select id,title,created_at from reports where user_id=$1 order by created_at desc", user_id)
    return [{"id": str(r[0]), "title": r[1], "created_at": (r[2] or dt.datetime.utcnow()).isoformat()} for r in rows]

@app.get("/reports/{report_id}")
async def get_report(report_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id,title,content,created_at from reports where id=$1 and user_id=$2", uuid.UUID(report_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
    return {"id": str(row[0]), "title": row[1], "content": row[2], "created_at": (row[3] or dt.datetime.utcnow()).isoformat()}

@app.delete("/reports/{report_id}")
async def delete_report(report_id: str, user_id: str, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id from reports where id=$1 and user_id=$2", uuid.UUID(report_id), user_id)
        if not row:
            raise HTTPException(404, "Not found")
        await conn.execute("delete from reports where id=$1", uuid.UUID(report_id))
    return {"ok": True}

@app.post("/reports/email")
async def email_report(body: ReportEmailRq, pool=Depends(get_db)):
    # Stub: no real email; log-to-db by creating a report-note or simply echo back
    async with pool.acquire() as conn:
        row = await conn.fetchrow("select id,title from reports where id=$1 and user_id=$2", uuid.UUID(body.report_id), body.user_id)
        if not row:
            raise HTTPException(404, "Report not found")
    return {"ok": True, "sent": True, "to": body.to, "subject": body.subject or f"Report: {row[1]}"}
