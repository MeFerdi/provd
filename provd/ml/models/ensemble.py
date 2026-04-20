from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import pickle
from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml.data.features import FEATURE_COLUMNS


NUMERIC_FEATURES = [
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
]

CATEGORICAL_FEATURES = [
    "currency",
    "context.rail",
    "context.fiat_currency",
    "context.asset",
    "context.side",
    "context.channel",
]


def score_to_risk_level(score: float) -> str:
    if score >= 0.8:
        return "low"
    if score >= 0.5:
        return "medium"
    return "high"


def build_ensemble_model(random_state: int = 42) -> Pipeline:
    """Return the baseline regression pipeline for trust score prediction."""

    preprocess = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
            ("numeric", "passthrough", NUMERIC_FEATURES),
        ]
    )

    regressor = RandomForestRegressor(
        n_estimators=250,
        random_state=random_state,
        n_jobs=-1,
        min_samples_leaf=2,
    )

    return Pipeline([
        ("preprocess", preprocess),
        ("regressor", regressor),
    ])


@dataclass
class TrustScoreModel:
    pipeline: Pipeline
    feature_columns: list[str] = field(default_factory=lambda: list(FEATURE_COLUMNS))

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "TrustScoreModel":
        self.pipeline.fit(X[self.feature_columns], y)
        return self

    def predict_scores(self, X: pd.DataFrame) -> pd.Series:
        raw = self.pipeline.predict(X[self.feature_columns])
        return pd.Series(raw, index=X.index, dtype="float64").clip(0.0, 1.0)

    def predict_risk_levels(self, X: pd.DataFrame) -> pd.Series:
        scores = self.predict_scores(X)
        return scores.map(score_to_risk_level)

    def predict_row(self, row: dict[str, Any]) -> dict[str, Any]:
        frame = pd.DataFrame([row])
        score = float(self.predict_scores(frame).iloc[0])
        return {
            "entity_id": str(row.get("entity_id", "unknown_entity")),
            "score": score,
            "risk_level": score_to_risk_level(score),
            "cached": False,
        }

    def save(self, path: str | Path) -> None:
        artifact = {
            "pipeline": self.pipeline,
            "feature_columns": self.feature_columns,
        }
        with Path(path).open("wb") as handle:
            pickle.dump(artifact, handle)

    @classmethod
    def load(cls, path: str | Path) -> "TrustScoreModel":
        with Path(path).open("rb") as handle:
            artifact = pickle.load(handle)

        return cls(
            pipeline=artifact["pipeline"],
            feature_columns=list(artifact.get("feature_columns", FEATURE_COLUMNS)),
        )
