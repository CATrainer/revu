Run API locally:

1) Ensure Postgres is running and apply schema from ../supabase_schema.sql (or let the app create tables on first run)
2) Copy `.env.example` to `.env` and set DATABASE_URL=postgresql://user:pass@host:5432/db
3) Install deps and start server.

Config:
- DATABASE_URL: Postgres connection string
- PORT: port for uvicorn (default 8000)
- ALLOW_ORIGINS: CORS allow list (comma-separated or `*`)
- TRUSTED_HOSTS: optional comma-separated list of allowed hosts (Host header protection)
- RATE_LIMIT_RPS: simple per-IP rate limit for POST/DELETE (default 5)
- OPENAI_API_KEY: optional API key to enable AI text generation

Operational notes (production-lite):
- Health `/health` and readiness `/ready`
- Simple request metrics at `/metrics`
- In-memory rate limiting and small response time buffer
- GZip compression enabled and basic security headers set

