#!/usr/bin/env bash
set -euo pipefail

ROLE="${SERVICE_ROLE:-web}"
PORT="${PORT:-8080}"

echo "[start.sh] Starting service role: ${ROLE}"

case "${ROLE}" in
  web)
    # Runs FastAPI web (migrations handled in run.py)
    exec python run.py
    ;;
  worker)
    # Celery worker subscribing to all configured queues
    exec celery -A app.core.celery worker --loglevel=info -Q default,reviews,analytics,email,automation
    ;;
  beat)
    # Celery beat (scheduler)
    exec celery -A app.core.celery beat --loglevel=info
    ;;
  flower)
    # Flower monitoring UI (bind to the platform-provided PORT)
    exec celery -A app.core.celery flower --port "${PORT}"
    ;;
  *)
    echo "[start.sh] Unknown SERVICE_ROLE: ${ROLE}" >&2
    exit 1
    ;;
fi
