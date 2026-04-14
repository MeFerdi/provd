from datetime import datetime, timezone

import httpx

from app.tasks.celery_app import celery_app

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


@celery_app.task(name="community.scrape")
def scrape_community(urls: list[str], timeout_seconds: int = 8) -> dict:
    """Scrape community sources and return lightweight risk signals."""
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
    return {
        "scanned_sources": len(urls),
        "processed_records": len(records),
        "aggregate_risk_score": total_score,
        "failed_sources": failed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
