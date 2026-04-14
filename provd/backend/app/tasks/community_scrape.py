from datetime import datetime, timezone

import httpx
from celery.utils.log import get_task_logger

from app.config import get_settings
from app.tasks.celery_app import celery_app

settings = get_settings()
logger = get_task_logger(__name__)

_RISK_KEYWORDS = [
    "scam",
    "fraud",
    "chargeback",
    "frozen",
    "stolen",
    "fake",
]


def _extract_text(payload: dict) -> str:
    parts: list[str] = []
    for field in ("title", "body", "content", "text", "message"):
        value = payload.get(field)
        if isinstance(value, str):
            parts.append(value)
    return " ".join(parts).lower()


def _keyword_score(text: str) -> tuple[int, list[str]]:
    hits = [word for word in _RISK_KEYWORDS if word in text]
    return len(hits), hits


@celery_app.task(
    name="community.scrape",
    bind=True,
    autoretry_for=(httpx.HTTPError,),
    retry_backoff=settings.celery_task_retry_backoff,
    retry_kwargs={"max_retries": settings.celery_task_max_retries},
)
def scrape_community(self, urls: list[str], timeout_seconds: int = 8) -> dict:
    """Scrape community sources and return lightweight risk signals."""
    logger.info("Starting community scrape", extra={"task_id": self.request.id, "url_count": len(urls)})
    records: list[dict] = []
    failed: list[dict] = []

    with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
        for url in urls:
            try:
                response = client.get(url)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")

                if "application/json" in content_type:
                    data = response.json()
                    if isinstance(data, list):
                        for item in data[:25]:
                            if isinstance(item, dict):
                                text = _extract_text(item)
                                score, keywords = _keyword_score(text)
                                records.append({"source": url, "score": score, "keywords": keywords})
                    elif isinstance(data, dict):
                        text = _extract_text(data)
                        score, keywords = _keyword_score(text)
                        records.append({"source": url, "score": score, "keywords": keywords})
                else:
                    text = response.text.lower()[:5000]
                    score, keywords = _keyword_score(text)
                    records.append({"source": url, "score": score, "keywords": keywords})
            except (httpx.HTTPError, ValueError) as exc:
                failed.append({"source": url, "error": str(exc)})

    total_score = sum(item["score"] for item in records)
    logger.info(
        "Completed community scrape",
        extra={"task_id": self.request.id, "processed_records": len(records), "failed_sources": len(failed)},
    )
    return {
        "scanned_sources": len(urls),
        "processed_records": len(records),
        "aggregate_risk_score": total_score,
        "failed_sources": failed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
