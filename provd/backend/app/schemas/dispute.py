from pydantic import BaseModel, Field


class DisputeRequest(BaseModel):
	trade_id: str = Field(min_length=3, max_length=128)
	counterparty_id: str = Field(min_length=2, max_length=128)
	amount: float = Field(default=0.0, ge=0)
	evidence: list[str] = Field(default_factory=list)


class DisputeResponse(BaseModel):
	trade_id: str
	recommendation: str
	confidence: float = Field(ge=0, le=1)
	rationale: list[str]
