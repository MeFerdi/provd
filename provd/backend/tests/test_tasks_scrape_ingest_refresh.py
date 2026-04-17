from typing import Any, cast

from app.tasks.community_scrape import scrape_community
from app.tasks.graph_ingest import ingest_graph_data
from app.tasks.score_refresh import refresh_scores


class _FakeResponse:
    def __init__(self, content_type: str, payload):
        self._content_type = content_type
        self._payload = payload
        self.text = payload if isinstance(payload, str) else ""
        self.headers = {"content-type": content_type}

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, timeout: int, follow_redirects: bool):
        self.timeout = timeout
        self.follow_redirects = follow_redirects

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url: str):
        if "json" in url:
            return _FakeResponse("application/json", [{"title": "scam warning"}])
        return _FakeResponse("text/html", "normal text with fraud notice")


def test_scrape_community_task(monkeypatch):
    monkeypatch.setattr("app.tasks.community_scrape.httpx.Client", _FakeClient)

    result = cast(Any, scrape_community).run(["https://x/json", "https://x/html"], 5)

    assert result["scanned_sources"] == 2
    assert result["processed_records"] >= 2
    assert "aggregate_risk_score" in result


def test_ingest_graph_data_task():
    result = cast(Any, ingest_graph_data).run(
        {
            "nodes": [{"id": "a"}],
            "edges": [
                {"source": "a", "target": "b", "relationship": "trade"},
                {"source": "a", "target": "", "relationship": "trade"},
            ],
        },
    )

    assert result["nodes_ingested"] >= 2
    assert result["edges_ingested"] == 1
    assert result["edges_rejected"] == 1


def test_refresh_scores_task(monkeypatch):
    captured = []

    async def _fake_refresh(cache_key: str, payload: dict, ttl_seconds: int):
        captured.append((cache_key, payload, ttl_seconds))

    monkeypatch.setattr("app.tasks.score_refresh._refresh_cache", _fake_refresh)
    result = cast(Any, refresh_scores).run(
        [
            {"entity_id": "e1", "amount": 5.0, "currency": "USDT"},
            {"entity_id": "e2", "amount": 15.0, "currency": "USDT"},
        ],
        120,
    )

    assert result["processed"] == 2
    assert len(captured) == 2
