from datetime import datetime, timezone

from app.services.hasher import sha256_hex
from app.tasks.celery_app import celery_app


def _normalize_edge(edge: dict) -> tuple[str, str, str]:
    source = str(edge.get("source", "")).strip()
    target = str(edge.get("target", "")).strip()
    rel = str(edge.get("relationship", "transacted_with")).strip().lower()
    return source, target, rel


@celery_app.task(name="graph.ingest")
def ingest_graph_data(payload: dict) -> dict:
    """Ingest graph payload and return ingestion stats.

    Expected payload shape:
    {
      "nodes": [{"id": "alice"}, ...],
      "edges": [{"source": "alice", "target": "bob", "relationship": "trade"}, ...]
    }
    """
    nodes = payload.get("nodes", [])
    edges = payload.get("edges", [])

    node_ids = {
        str(node.get("id", "")).strip()
        for node in nodes
        if isinstance(node, dict) and str(node.get("id", "")).strip()
    }

    unique_edges: set[tuple[str, str, str]] = set()
    rejected_edges = 0
    for edge in edges:
        if not isinstance(edge, dict):
            rejected_edges += 1
            continue
        source, target, relationship = _normalize_edge(edge)
        if not source or not target:
            rejected_edges += 1
            continue
        node_ids.add(source)
        node_ids.add(target)
        unique_edges.add((source, target, relationship))

    fingerprint = sha256_hex(
        "|".join(sorted(node_ids)) + "::" + "|".join(sorted(f"{s}>{r}>{t}" for s, t, r in unique_edges))
    )

    return {
        "nodes_ingested": len(node_ids),
        "edges_ingested": len(unique_edges),
        "edges_rejected": rejected_edges,
        "graph_fingerprint": fingerprint,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }
