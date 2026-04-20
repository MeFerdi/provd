from __future__ import annotations

from typing import Iterable

import numpy as np
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, r2_score, root_mean_squared_error


def _risk_level(score: float) -> str:
    if score >= 0.8:
        return "low"
    if score >= 0.5:
        return "medium"
    return "high"


def compute_metrics(y_true: Iterable[float], y_pred: Iterable[float]) -> dict[str, float]:
    y_true_arr = np.asarray(list(y_true), dtype="float64")
    y_pred_arr = np.asarray(list(y_pred), dtype="float64")

    true_risk = np.asarray([_risk_level(value) for value in y_true_arr])
    pred_risk = np.asarray([_risk_level(value) for value in y_pred_arr])

    return {
        "mae": float(mean_absolute_error(y_true_arr, y_pred_arr)),
        "rmse": float(root_mean_squared_error(y_true_arr, y_pred_arr)),
        "r2": float(r2_score(y_true_arr, y_pred_arr)),
        "risk_accuracy": float(accuracy_score(true_risk, pred_risk)),
        "risk_f1_macro": float(f1_score(true_risk, pred_risk, average="macro")),
    }
