from __future__ import annotations

import argparse
import json
from pathlib import Path

from sklearn.model_selection import train_test_split

from ml.data.features import build_features
from ml.data.synthetic import generate_synthetic_trust_data
from ml.models.ensemble import TrustScoreModel, build_ensemble_model
from ml.utils.metrics import compute_metrics


def train_ensemble(rows: int = 5000, output_path: str | Path = "artifacts/trust_score_model.pkl", seed: int = 42) -> dict[str, float]:
    """Train and persist the baseline trust-score model."""

    dataset = generate_synthetic_trust_data(rows=rows, seed=seed)
    features = build_features(dataset)

    X = features[[column for column in features.columns if column not in {"label_score", "label_risk_level"}]].copy()
    y_score = features["label_score"].astype(float)
    y_risk = features["label_risk_level"].astype(str)

    stratify = y_risk if y_risk.value_counts().min() >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_score,
        test_size=0.2,
        random_state=seed,
        stratify=stratify,
    )

    pipeline = build_ensemble_model(random_state=seed)
    model = TrustScoreModel(pipeline=pipeline, feature_columns=list(X.columns))
    model.fit(X_train, y_train)

    predictions = model.predict_scores(X_test)
    metrics = compute_metrics(y_test, predictions)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    model.save(output_path)

    metrics_path = output_path.with_suffix(".metrics.json")
    metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True), encoding="utf-8")

    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Provd trust-score baseline model")
    parser.add_argument("--rows", type=int, default=5000, help="Number of synthetic rows to generate")
    parser.add_argument("--output", type=str, default="artifacts/trust_score_model.pkl", help="Model artifact path")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    metrics = train_ensemble(rows=args.rows, output_path=args.output, seed=args.seed)
    print(json.dumps(metrics, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
