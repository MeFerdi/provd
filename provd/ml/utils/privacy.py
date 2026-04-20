from __future__ import annotations

from typing import Iterable

import numpy as np


def _validate_dp_parameters(epsilon: float, sensitivity: float) -> tuple[float, float]:
    epsilon = float(epsilon)
    sensitivity = float(sensitivity)

    if not np.isfinite(epsilon) or epsilon <= 0:
        raise ValueError("epsilon must be a finite positive number")
    if not np.isfinite(sensitivity) or sensitivity < 0:
        raise ValueError("sensitivity must be a finite non-negative number")

    return epsilon, sensitivity


def laplace_mechanism(
    value: float,
    epsilon: float,
    *,
    sensitivity: float = 1.0,
    min_value: float | None = None,
    max_value: float | None = None,
    rng: np.random.Generator | None = None,
) -> float:
    """Apply Laplace noise for $\\epsilon$-differential privacy.

    Args:
        value: Raw aggregate value.
        epsilon: Privacy budget ($\\epsilon > 0$).
        sensitivity: Global sensitivity of the query.
        min_value: Optional lower bound for clipped output.
        max_value: Optional upper bound for clipped output.
        rng: Optional NumPy generator for deterministic testing.
    """

    epsilon, sensitivity = _validate_dp_parameters(epsilon, sensitivity)
    value = float(value)
    if not np.isfinite(value):
        raise ValueError("value must be finite")

    if min_value is not None and max_value is not None and min_value > max_value:
        raise ValueError("min_value cannot be greater than max_value")

    if sensitivity == 0.0:
        noisy = value
    else:
        generator = rng or np.random.default_rng()
        scale = sensitivity / epsilon
        noise = float(generator.laplace(loc=0.0, scale=scale))
        noisy = value + noise

    if min_value is not None:
        noisy = max(float(min_value), noisy)
    if max_value is not None:
        noisy = min(float(max_value), noisy)

    return float(noisy)


def privatize_aggregate_series(
    values: Iterable[float],
    epsilon: float,
    *,
    sensitivity: float = 1.0,
    min_value: float | None = None,
    max_value: float | None = None,
    rng: np.random.Generator | None = None,
) -> list[float]:
    """Apply Laplace mechanism to each value in an aggregate series."""

    generator = rng or np.random.default_rng()
    return [
        laplace_mechanism(
            value,
            epsilon,
            sensitivity=sensitivity,
            min_value=min_value,
            max_value=max_value,
            rng=generator,
        )
        for value in values
    ]
