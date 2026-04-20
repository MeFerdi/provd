from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Any

import numpy as np
import pandas as pd


RISK_LEVELS = ("low", "medium", "high")
RAILS = ("p2p", "otc", "exchange", "card", "bank")
FIAT_CURRENCIES = ("NGN", "KES", "GHS", "USD", "EUR", "ZAR")
ASSETS = ("USDT", "USDC", "BTC", "ETH")
SIDES = ("buy", "sell")
CHANNELS = ("playground", "mobile", "web", "api")


@dataclass(frozen=True)
class SyntheticTrustConfig:
    rows: int = 5000
    seed: int = 42


def _stable_unit_float(value: str) -> float:
    digest = sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:12], 16) / float(16**12 - 1)


def _risk_level(score: float) -> str:
    if score >= 0.8:
        return "low"
    if score >= 0.5:
        return "medium"
    return "high"


def _choose(rng: np.random.Generator, values: tuple[str, ...], weights: tuple[float, ...] | None = None) -> str:
    return str(rng.choice(values, p=weights))


def _entity_id(profile: str, index: int, rng: np.random.Generator) -> str:
    suffix = f"{rng.integers(1000, 9999)}{index:04d}"
    return f"{profile}-{suffix}"


def _generate_row(index: int, rng: np.random.Generator) -> dict[str, Any]:
    profile = _choose(rng, ("clean", "flagged", "watchlist", "highvalue"), (0.56, 0.2, 0.12, 0.12))
    entity_id = _entity_id(profile, index, rng)

    amount = float(np.exp(rng.uniform(np.log(10.0), np.log(20000.0))))
    currency = _choose(rng, ("USDT", "USDC", "BTC", "ETH"), (0.48, 0.26, 0.16, 0.10))
    rail = _choose(rng, RAILS, (0.38, 0.18, 0.18, 0.12, 0.14))
    fiat_currency = _choose(rng, FIAT_CURRENCIES, (0.35, 0.16, 0.14, 0.12, 0.08, 0.15))
    asset = currency
    side = _choose(rng, SIDES)
    channel = _choose(rng, CHANNELS)

    entity_age_days = int(rng.integers(3, 3650))
    dispute_count_90d = int(rng.poisson(0.8 if profile == "clean" else 1.5))
    chargeback_ratio = float(np.clip(rng.normal(0.02 if profile == "clean" else 0.08, 0.03), 0.0, 1.0))
    velocity_spike = float(np.clip(rng.normal(0.08 if profile == "clean" else 0.4, 0.15), 0.0, 1.0))
    graph_reputation = float(np.clip(rng.normal(0.84 if profile == "clean" else 0.46, 0.18), 0.0, 1.0))
    n_trades_30d = int(rng.integers(1, 500))
    n_countries_90d = int(rng.integers(1, 7 if profile == "clean" else 12))

    amount_factor = min(np.log1p(amount) / np.log1p(20000.0), 1.0)
    age_factor = 1.0 - min(np.log1p(entity_age_days) / np.log1p(3650.0), 1.0)

    score = 0.96
    score -= 0.34 * amount_factor
    score -= 0.08 if rail == "otc" else 0.0
    score -= 0.05 if rail == "p2p" else 0.0
    score -= 0.03 if side == "sell" else 0.0
    score -= 0.18 * chargeback_ratio
    score -= 0.12 * min(dispute_count_90d / 6.0, 1.0)
    score -= 0.18 * velocity_spike
    score -= 0.22 * (1.0 - graph_reputation)
    score -= 0.08 * min(n_countries_90d / 10.0, 1.0)
    score -= 0.05 * age_factor

    if profile == "flagged":
        score -= 0.12
    elif profile == "watchlist":
        score -= 0.28
    elif profile == "highvalue":
        score -= 0.08

    if "watchlist" in entity_id:
        score -= 0.12
    if "flagged" in entity_id:
        score -= 0.08
    if "highvalue" in entity_id:
        score -= 0.06

    score += rng.normal(0.0, 0.035)
    score = float(np.clip(score, 0.0, 1.0))

    return {
        "entity_id": entity_id,
        "amount": round(amount, 2),
        "currency": currency,
        "context.rail": rail,
        "context.fiat_currency": fiat_currency,
        "context.asset": asset,
        "context.side": side,
        "context.channel": channel,
        "entity_id_length": len(entity_id),
        "entity_has_watchlist_hint": int("watchlist" in entity_id),
        "entity_has_flagged_hint": int("flagged" in entity_id),
        "entity_has_highvalue_hint": int("highvalue" in entity_id),
        "entity_hash_float": _stable_unit_float(entity_id),
        "amount_log1p": float(np.log1p(amount)),
        "amount_bucket": int(pd.cut([amount], bins=[0, 100, 1_000, 5_000, 20_000, np.inf], labels=False)[0]),
        "entity_age_days": entity_age_days,
        "dispute_count_90d": dispute_count_90d,
        "chargeback_ratio": chargeback_ratio,
        "velocity_spike": velocity_spike,
        "graph_reputation": graph_reputation,
        "n_trades_30d": n_trades_30d,
        "n_countries_90d": n_countries_90d,
        "label_score": score,
        "label_risk_level": _risk_level(score),
    }


def generate_synthetic_trust_data(rows: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generate a synthetic trust-score dataset for baseline training."""

    rng = np.random.default_rng(seed)
    records = [_generate_row(index, rng) for index in range(rows)]
    return pd.DataFrame.from_records(records)


def generate_synthetic_data(rows: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Backward-compatible alias for trust-score dataset generation."""

    return generate_synthetic_trust_data(rows=rows, seed=seed)
