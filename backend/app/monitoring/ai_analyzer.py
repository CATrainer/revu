"""AIAnalyzer: advanced AI-driven analysis for social monitoring.

Implements:
1. analyze_sentiment_batch
2. extract_topics_and_entities
3. identify_narrative_threads
4. generate_embeddings_batch
5. assess_toxicity_and_priority

Features:
- OpenAI GPT-4 style JSON output parsing (JSON mode where available)
- Embedding batching (text-embedding-ada-002)
- Basic clustering using cosine similarity (naive implementation)
- Caching to avoid re-embedding identical texts (in-memory; replaceable)
- Token & cost estimation (approx; relies on length heuristics if tiktoken absent)
"""
from __future__ import annotations

import asyncio
import os
import math
import json
import hashlib
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Sequence, Tuple, Optional
from uuid import UUID

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from .data_processor import ProcessedMention

try:  # Optional dependency
    import tiktoken  # type: ignore
except Exception:  # noqa: BLE001
    tiktoken = None  # type: ignore

try:
    from openai import OpenAI  # new SDK style
except Exception:  # noqa: BLE001
    OpenAI = None  # type: ignore


EMBED_MODEL = "text-embedding-ada-002"
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
MAX_EMBED_BATCH = 100


@dataclass
class EmbeddingCacheEntry:
    text_hash: str
    embedding: List[float]


class AIAnalyzer:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if OpenAI and os.getenv("OPENAI_API_KEY") else None
        self._embed_cache: Dict[str, EmbeddingCacheEntry] = {}

    # ---------------- Utility: token & cost estimation -----------------
    def _estimate_tokens(self, text: str, model: str) -> int:
        if tiktoken:
            try:
                enc = tiktoken.encoding_for_model(model)
                return len(enc.encode(text))
            except Exception:  # noqa: BLE001
                pass
        # Fallback heuristic ~4 chars per token
        return max(1, len(text) // 4)

    def _cost_estimate(self, prompt_tokens: int, completion_tokens: int, model: str) -> float:
        # Placeholder pricing table (USD / 1K tokens) - adjust to actual
        pricing = {
            "gpt-4o-mini": (0.15, 0.60),  # input, output per 1K tokens (example placeholder)
            "gpt-4o": (2.50, 10.0),
        }
        inp, outp = pricing.get(model, (0.10, 0.10))
        return round((prompt_tokens / 1000 * inp) + (completion_tokens / 1000 * outp), 6)

    # ---------------- 1. Sentiment Batch -----------------
    async def analyze_sentiment_batch(self, mentions: Sequence[ProcessedMention]) -> List[Dict[str, Any]]:
        if not mentions:
            return []
        texts = [m.text for m in mentions]
        # Build optimized prompt (few-shot with guidelines)
        guidance = {
            "task": "sentiment_analysis",
            "scale": "-1 (very negative) to 1 (very positive)",
            "include": ["score", "confidence", "explanation", "sarcasm_detected"],
            "notes": [
                "Detect sarcasm by contradictory sentiment markers",
                "Consider context length, ignore hashtags for base sentiment unless emotional",
            ],
        }
        payload_items = [
            {"id": i, "text": t[:2000]} for i, t in enumerate(texts)
        ]  # truncate defensive
        system_msg = (
            "You are an expert NLP model. Return STRICT JSON array; each element: {id, score, confidence, explanation, sarcasm_detected}."
        )
        user_msg = json.dumps({"guidance": guidance, "data": payload_items})
        model = CHAT_MODEL
        sentiment_results: List[Dict[str, Any]] = []
        prompt_tokens = sum(self._estimate_tokens(m.text, model) for m in texts)
        completion_tokens = 0
        if self._client:
            try:
                resp = self._client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                )
                content = resp.choices[0].message.content  # type: ignore[attr-defined]
                completion_tokens = getattr(resp.usage, "completion_tokens", 0)
                parsed = json.loads(content)
                items = parsed.get("items") or parsed.get("data") or []
                # Map by id
                by_id = {int(it["id"]): it for it in items if "id" in it}
                for idx, m in enumerate(mentions):
                    r = by_id.get(idx, {})
                    sentiment_results.append(
                        {
                            "score": float(r.get("score", 0.0)),
                            "confidence": float(r.get("confidence", 0.5)),
                            "explanation": r.get("explanation"),
                            "sarcasm_detected": bool(r.get("sarcasm_detected", False)),
                        }
                    )
            except Exception as e:  # noqa: BLE001
                logger.warning("Sentiment batch failed; fallback heuristic: {e}", e=str(e))
        if not sentiment_results:
            # Fallback heuristic
            for t in texts:
                ln = len(t)
                sentiment_results.append(
                    {
                        "score": max(min((ln % 200 - 100) / 100, 1), -1),
                        "confidence": 0.3,
                        "explanation": "Heuristic length-based fallback",
                        "sarcasm_detected": False,
                    }
                )
        cost = self._cost_estimate(prompt_tokens, completion_tokens, model)
        await self._record_cost("sentiment_batch", cost, model)
        return sentiment_results

    # ---------------- 2. Topics & Entities -----------------
    async def extract_topics_and_entities(self, mentions: Sequence[ProcessedMention]) -> List[Dict[str, Any]]:
        if not mentions:
            return []
        texts = [m.text[:1500] for m in mentions]
        examples = [
            {"text": "Love the new Revu dashboard, analytics are sharp!", "topics": ["product experience"], "entities": {"products": ["Revu"], "organizations": [], "people": []}},
            {"text": "The latency in automation rules sucks right now", "topics": ["performance"], "entities": {"products": ["automation rules"], "organizations": [], "people": []}},
        ]
        system_msg = (
            "You extract key topics and entities. Return JSON array items: {id, topics:[..], entities:{people, organizations, products}}"
        )
        user_msg = json.dumps({"examples": examples, "data": [{"id": i, "text": t} for i, t in enumerate(texts)]})
        model = CHAT_MODEL
        prompt_tokens = sum(self._estimate_tokens(t, model) for t in texts)
        completion_tokens = 0
        results: List[Dict[str, Any]] = []
        if self._client:
            try:
                resp = self._client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                content = resp.choices[0].message.content  # type: ignore[attr-defined]
                completion_tokens = getattr(resp.usage, "completion_tokens", 0)
                parsed = json.loads(content)
                items = parsed.get("items") or parsed.get("data") or []
                by_id = {int(it["id"]): it for it in items if "id" in it}
                for idx in range(len(texts)):
                    it = by_id.get(idx, {})
                    results.append(
                        {
                            "topics": it.get("topics", []),
                            "entities": it.get("entities", {"people": [], "organizations": [], "products": []}),
                        }
                    )
            except Exception as e:  # noqa: BLE001
                logger.warning("Topic/entity extraction failed: {e}", e=str(e))
        if not results:
            for t in texts:
                words = [w.lower() for w in t.split() if len(w) > 5][:5]
                results.append(
                    {
                        "topics": list(set(words)),
                        "entities": {"people": [], "organizations": [], "products": []},
                    }
                )
        cost = self._cost_estimate(prompt_tokens, completion_tokens, model)
        await self._record_cost("topics_entities", cost, model)
        return results

    # ---------------- 3. Narrative Threads (Clustering) -----------------
    async def identify_narrative_threads(self, mentions: Sequence[ProcessedMention], embeddings: Optional[List[List[float]]] = None, similarity_threshold: float = 0.82) -> List[Dict[str, Any]]:
        if not mentions:
            return []
        texts = [m.text for m in mentions]
        if embeddings is None:
            embeddings = await self.generate_embeddings_batch(texts)
        # Simple greedy clustering
        clusters: List[Dict[str, Any]] = []
        used = set()
        for i, emb in enumerate(embeddings):
            if i in used:
                continue
            cluster_indices = [i]
            used.add(i)
            for j in range(i + 1, len(embeddings)):
                if j in used:
                    continue
                if self._cosine_sim(emb, embeddings[j]) >= similarity_threshold:
                    cluster_indices.append(j)
                    used.add(j)
            cluster_texts = [texts[k] for k in cluster_indices]
            cluster_mentions = [mentions[k] for k in cluster_indices]
            clusters.append(
                {
                    "thread_id": hashlib.sha1("|".join(sorted(m.external_id for m in cluster_mentions)).encode()).hexdigest()[:16],
                    "size": len(cluster_indices),
                    "sample_text": cluster_texts[0][:280],
                    "type": self._infer_thread_type(cluster_texts),
                    "mention_ids": [m.external_id for m in cluster_mentions],
                }
            )
        await self._record_cost("thread_clustering", 0.0, "internal")
        return clusters

    def _cosine_sim(self, a: List[float], b: List[float]) -> float:
        if not a or not b:
            return 0.0
        num = sum(x * y for x, y in zip(a, b))
        da = math.sqrt(sum(x * x for x in a))
        db = math.sqrt(sum(y * y for y in b))
        return 0.0 if da == 0 or db == 0 else num / (da * db)

    def _infer_thread_type(self, texts: List[str]) -> str:
        joined = " ".join(texts).lower()
        if any(w in joined for w in ["issue", "bug", "error", "fail"]):
            return "support"
        if any(w in joined for w in ["launch", "campaign", "announce"]):
            return "campaign"
        if any(w in joined for w in ["hate", "angry", "toxic"]):
            return "controversy"
        return "trend"

    # ---------------- 4. Embeddings Batch -----------------
    async def generate_embeddings_batch(self, texts: Sequence[str]) -> List[List[float]]:
        if not texts:
            return []
        model = EMBED_MODEL
        results: List[List[float]] = []
        uncached: List[Tuple[int, str]] = []
        for idx, t in enumerate(texts):
            key = hashlib.sha1(t.encode()).hexdigest()
            if key in self._embed_cache:
                results.append(self._embed_cache[key].embedding)
            else:
                results.append([])  # placeholder to fill later
                uncached.append((idx, t[:8000]))  # safety truncation
        prompt_tokens = 0
        completion_tokens = 0
        if self._client and uncached:
            # Batch in chunks of MAX_EMBED_BATCH
            for i in range(0, len(uncached), MAX_EMBED_BATCH):
                batch = uncached[i : i + MAX_EMBED_BATCH]
                batch_texts = [b[1] for b in batch]
                try:
                    resp = self._client.embeddings.create(model=model, input=batch_texts)  # type: ignore[attr-defined]
                    data = resp.data  # type: ignore[attr-defined]
                    for (orig_idx, orig_text), emb_obj in zip(batch, data):
                        emb = emb_obj.embedding  # type: ignore[attr-defined]
                        key = hashlib.sha1(orig_text.encode()).hexdigest()
                        self._embed_cache[key] = EmbeddingCacheEntry(text_hash=key, embedding=emb)
                        results[orig_idx] = emb
                    usage = getattr(resp, "usage", None)
                    if usage:
                        prompt_tokens += getattr(usage, "prompt_tokens", 0)
                        completion_tokens += getattr(usage, "completion_tokens", 0)
                except Exception as e:  # noqa: BLE001
                    logger.warning("Embedding batch failed: {e}", e=str(e))
        # Fallback random-like deterministic vectors for failures
        for idx, vec in enumerate(results):
            if not vec:
                h = hashlib.sha1(texts[idx].encode()).digest()
                results[idx] = [b / 255 for b in h[:32]]  # shorter fallback
        cost = self._cost_estimate(prompt_tokens, completion_tokens, model)
        await self._record_cost("embeddings", cost, model)
        return results

    # ---------------- 5. Toxicity & Priority -----------------
    async def assess_toxicity_and_priority(self, mentions: Sequence[ProcessedMention]) -> List[Dict[str, Any]]:
        if not mentions:
            return []
        texts = [m.text[:1000] for m in mentions]
        system_msg = (
            "Classify toxicity & response priority. JSON array: {id, toxicity_score:0-1, needs_response:bool, priority: (low|normal|high|urgent), flags:[...]}."  # noqa: E501
        )
        user_msg = json.dumps({"data": [{"id": i, "text": t} for i, t in enumerate(texts)]})
        model = CHAT_MODEL
        prompt_tokens = sum(self._estimate_tokens(t, model) for t in texts)
        completion_tokens = 0
        out: List[Dict[str, Any]] = []
        if self._client:
            try:
                resp = self._client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                )
                content = resp.choices[0].message.content  # type: ignore[attr-defined]
                completion_tokens = getattr(resp.usage, "completion_tokens", 0)
                parsed = json.loads(content)
                items = parsed.get("items") or parsed.get("data") or []
                by_id = {int(it["id"]): it for it in items if "id" in it}
                for idx in range(len(texts)):
                    r = by_id.get(idx, {})
                    out.append(
                        {
                            "toxicity_score": float(r.get("toxicity_score", 0.0)),
                            "needs_response": bool(r.get("needs_response", False)),
                            "priority": r.get("priority", "normal"),
                            "flags": r.get("flags", []),
                        }
                    )
            except Exception as e:  # noqa: BLE001
                logger.warning("Toxicity classification failed: {e}", e=str(e))
        if not out:
            for t in texts:
                lower = t.lower()
                toxic = any(w in lower for w in ["hate", "stupid", "idiot", "kill"])
                urgent = any(w in lower for w in ["refund", "lawsuit", "broken", "security"])
                out.append(
                    {
                        "toxicity_score": 0.8 if toxic else 0.1,
                        "needs_response": toxic or urgent,
                        "priority": "urgent" if urgent else ("high" if toxic else "normal"),
                        "flags": [w for w in ["toxic" if toxic else None, "urgent" if urgent else None] if w],
                    }
                )
        cost = self._cost_estimate(prompt_tokens, completion_tokens, model)
        await self._record_cost("toxicity_priority", cost, model)
        return out

    # ---------------- Combined convenience -----------------
    async def analyze_mentions(self, mentions: List[ProcessedMention], user_id: UUID) -> List[Dict[str, Any]]:  # upgrade original method
        if not mentions:
            return []
        sentiment = await self.analyze_sentiment_batch(mentions)
        topics_entities = await self.extract_topics_and_entities(mentions)
        embeddings = await self.generate_embeddings_batch([m.text for m in mentions])
        threads = await self.identify_narrative_threads(mentions, embeddings=embeddings)
        toxicity = await self.assess_toxicity_and_priority(mentions)

        # Index threads by mention id for quick association (simple many-to-one mapping first cluster containing mention)
        thread_map: Dict[str, str] = {}
        for th in threads:
            for mid in th.get("mention_ids", []):
                if mid not in thread_map:
                    thread_map[mid] = th["thread_id"]

        enriched: List[Dict[str, Any]] = []
        for i, m in enumerate(mentions):
            enriched.append(
                {
                    "external_id": m.external_id,
                    "text": m.text,
                    "author_handle": m.author_handle,
                    "author_external_id": m.author_external_id,
                    "published_at": m.published_at,
                    "hashtags": m.hashtags,
                    "mentions": m.mentions,
                    "urls": m.urls,
                    "engagement": m.engagement,
                    "reach_score": m.reach_score,
                    "sentiment": sentiment[i]["score"],
                    "sentiment_confidence": sentiment[i]["confidence"],
                    "sentiment_explanation": sentiment[i]["explanation"],
                    "topics": topics_entities[i]["topics"],
                    "entities": topics_entities[i]["entities"],
                    "embedding": embeddings[i],
                    "thread_id": thread_map.get(m.external_id),
                    "toxicity_score": toxicity[i]["toxicity_score"],
                    "needs_response": toxicity[i]["needs_response"],
                    "priority": toxicity[i]["priority"],
                    "flags": toxicity[i]["flags"],
                }
            )

        # Persist aggregate cost snapshot (summing recent operations) — simplified placeholder cost sum
        await self.session.execute(
            text(
                """INSERT INTO monitoring_snapshots (id, user_id, period_start, period_end, metrics, generated_by)
                VALUES (gen_random_uuid(), :uid, now(), now(), :metrics::jsonb, 'system')"""
            ),
            {"uid": str(user_id), "metrics": json.dumps({"items_analyzed": len(mentions)})},
        )
        return enriched

    # ---------------- Persistence of cost metrics -----------------
    async def _record_cost(self, category: str, cost: float, model: str) -> None:
        try:
            await self.session.execute(
                text(
                    """INSERT INTO ai_cost_tracking (id, created_at, category, model, cost_usd)
                    VALUES (gen_random_uuid(), now(), :cat, :model, :cost)"""
                ),
                {"cat": category, "model": model, "cost": cost},
            )
        except Exception:  # table may not exist yet; swallow
            pass

