from typing import Any

from pydantic import BaseModel, Field


class TrustScoreRequest(BaseModel):
	entity_id: str = Field(min_length=2, max_length=128)
	amount: float = Field(default=0.0, ge=0)
	currency: str = Field(default="USDT", min_length=2, max_length=10)
	context: dict[str, Any] | None = None


class TrustSignal(BaseModel):
	name: str
	value: float
	weight: float


class TrustScoreResponse(BaseModel):
	entity_id: str
	score: float = Field(ge=0, le=1)
	risk_level: str
	signals: list[TrustSignal]
	cached: bool = False
