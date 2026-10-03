"""Combine signal results into a score, risk level, recommended action and a canonical decision record."""
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from app.engine.signals import REGISTRY, Flag, SignalContext, SignalResult

CONFIG_PATH = Path(__file__).with_name("config.json")
SEVERITY_RANK = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


@lru_cache(maxsize=1)
def engine_config() -> dict:
	return json.loads(CONFIG_PATH.read_text())


@dataclass
class Evaluation:
	score: int
	risk_level: str
	recommended_action: str
	flags: list[Flag]
	results: list[SignalResult]
	coverage: dict[str, str]
	units: int


def signals_for(intent_type: str) -> list[str]:
	return [name for name, spec in engine_config()["signals"].items() if spec["enabled"] and intent_type in spec["intents"]]


def coverage_map(results: list[SignalResult]) -> dict[str, str]:
	coverage = {name: "not_implemented" for name, spec in engine_config()["signals"].items() if not spec["enabled"]}
	coverage.update({r.name: r.coverage for r in results})
	return coverage


def evaluate(ctx: SignalContext) -> Evaluation:
	cfg = engine_config()
	names = signals_for(ctx.intent_type)
	results = [REGISTRY[name](ctx) for name in names]
	raw = sum(round(cfg["signals"][r.name]["weight"] * r.contribution) for r in results)
	flags = sorted((f for r in results for f in r.flags), key=lambda f: -SEVERITY_RANK[f.severity])
	score = max(0, min(1000, raw))
	for severity, floor in cfg["severity_floor"].items():
		if any(f.severity == severity for f in flags):
			score = max(score, floor)
	thresholds = cfg["thresholds"]
	level = "critical" if score >= thresholds["critical"] else "high" if score >= thresholds["high"] else "medium" if score >= thresholds["medium"] else "low"
	units = max(1, sum(cfg["signals"][name]["cost_units"] for name in names))
	return Evaluation(
		score=score,
		risk_level=level,
		recommended_action=cfg["actions"][level],
		flags=flags,
		results=results,
		coverage=coverage_map(results),
		units=units,
	)


def _canonical_default(value):
	if isinstance(value, Decimal):
		return format(value, "f")
	if isinstance(value, datetime):
		return value.isoformat()
	raise TypeError(f"not serializable: {type(value).__name__}")


def canonical_json(record: dict) -> str:
	"""Deterministic serialization: sorted keys, no whitespace. The hash of this string is the decision hash."""
	return json.dumps(record, sort_keys=True, separators=(",", ":"), default=_canonical_default, ensure_ascii=False)


def record_hash(record: dict) -> str:
	return hashlib.sha256(canonical_json(record).encode("utf-8")).hexdigest()
