from __future__ import annotations

import hashlib

import numpy as np
from typing import Iterable

import pandas as pd


FEATURE_COLUMNS = [
    "amount",
    "amount_log1p",
    "amount_bucket",
    "entity_id_length",
    "entity_has_watchlist_hint",
    "entity_has_flagged_hint",
    "entity_has_highvalue_hint",
    "entity_hash_float",
    "entity_age_days",
    "dispute_count_90d",
    "chargeback_ratio",
    "velocity_spike",
    "graph_reputation",
    "n_trades_30d",
    "n_countries_90d",
    "currency",
    "context.rail",
    "context.fiat_currency",
    "context.asset",
    "context.side",
    "context.channel",
]


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of the raw frame with engineered trust-score features."""

    enriched = frame.copy()
    if "amount" not in enriched.columns:
        raise ValueError("amount is required to build trust-score features")

    enriched["amount"] = pd.to_numeric(enriched["amount"], errors="coerce").fillna(0.0).astype(float)
    enriched["amount_log1p"] = np.log1p(enriched["amount"])

    if "amount_bucket" not in enriched.columns:
        enriched["amount_bucket"] = pd.cut(
            enriched["amount"],
            bins=[0, 100, 1_000, 5_000, 20_000, np.inf],
            labels=False,
            include_lowest=True,
        ).fillna(0).astype(int)
    else:
        enriched["amount_bucket"] = pd.to_numeric(enriched["amount_bucket"], errors="coerce").fillna(0).astype(int)

    entity_ids = enriched.get("entity_id", pd.Series(["unknown_entity"] * len(enriched), index=enriched.index)).astype(str)
    enriched["entity_id"] = entity_ids
    enriched["entity_id_length"] = entity_ids.str.len().astype(int)
    enriched["entity_has_watchlist_hint"] = entity_ids.str.contains("watchlist", case=False, na=False).astype(int)
    enriched["entity_has_flagged_hint"] = entity_ids.str.contains("flagged", case=False, na=False).astype(int)
    enriched["entity_has_highvalue_hint"] = entity_ids.str.contains("highvalue", case=False, na=False).astype(int)
    enriched["entity_hash_float"] = entity_ids.map(
        lambda value: int(hashlib.sha256(value.encode("utf-8")).hexdigest()[:12], 16) / float(16**12 - 1)
    )

    numeric_fill_defaults = {
        "entity_age_days": 0,
        "dispute_count_90d": 0,
        "chargeback_ratio": 0.0,
        "velocity_spike": 0.0,
        "graph_reputation": 0.0,
        "n_trades_30d": 0,
        "n_countries_90d": 0,
    }
    for column, default_value in numeric_fill_defaults.items():
        if column not in enriched.columns:
            enriched[column] = default_value
        else:
            enriched[column] = pd.to_numeric(enriched[column], errors="coerce").fillna(default_value)

    categorical_fill_defaults = {
        "currency": "UNKNOWN",
        "context.rail": "unknown",
        "context.fiat_currency": "UNKNOWN",
        "context.asset": "UNKNOWN",
        "context.side": "buy",
        "context.channel": "api",
    }
    for column, default_value in categorical_fill_defaults.items():
        if column not in enriched.columns:
            enriched[column] = default_value
        else:
            enriched[column] = enriched[column].astype(str).replace({"nan": default_value})

    return enriched


def split_features_and_targets(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Split engineered features from the trust-score labels."""

    enriched = build_features(frame)
    y_score = enriched["label_score"].astype(float)
    y_risk = enriched["label_risk_level"].astype(str)
    X = enriched[[column for column in FEATURE_COLUMNS if column in enriched.columns]].copy()
    return X, y_score, y_risk
