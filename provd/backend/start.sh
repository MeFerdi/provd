#!/bin/sh
# Release tasks, then the API. For hosts without a separate release step (e.g. Render's free plan):
# migrations are additive and the seed is idempotent, so running both on every start is safe.
set -e
alembic upgrade head
python -m app.indexer seed
# PORT is set by the host (Render: 10000); 8000 elsewhere.
exec gunicorn app.main:app -k app.gunicorn_worker.ProvdUvicornWorker --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 60 --graceful-timeout 30 --keep-alive 5 --max-requests 5000 --max-requests-jitter 500 --access-logfile -
