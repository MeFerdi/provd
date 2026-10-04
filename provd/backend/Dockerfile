FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    WEB_CONCURRENCY=2
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN useradd --create-home --uid 10001 provd
USER provd

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/v1/health', timeout=4).status == 200 else 1)"
# Workers: WEB_CONCURRENCY (read by gunicorn). Graceful shutdown lets in-flight checks finish on deploys.
CMD ["gunicorn", "app.main:app", "-k", "app.gunicorn_worker.ProvdUvicornWorker", "--bind", "0.0.0.0:8000", \
     "--timeout", "60", "--graceful-timeout", "30", "--keep-alive", "5", \
     "--max-requests", "5000", "--max-requests-jitter", "500", "--access-logfile", "-"]
