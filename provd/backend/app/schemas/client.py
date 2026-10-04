from datetime import datetime

from pydantic import BaseModel, Field, field_validator

# Scopes an API key may carry. No wildcards: every permission is granted explicitly.
KNOWN_SCOPES = {"actions:evaluate", "keys:read", "keys:write", "billing:admin"}


class ClientCreateRequest(BaseModel):
	name: str = Field(min_length=2, max_length=150)


class ClientResponse(BaseModel):
	id: str
	name: str
	active: bool
	created_at: datetime
	updated_at: datetime


class ApiKeyCreateRequest(BaseModel):
	name: str = Field(min_length=2, max_length=100)
	scopes: list[str] = Field(default_factory=lambda: ["actions:evaluate"], min_length=1, max_length=len(KNOWN_SCOPES))
	client_id: str | None = Field(default=None, max_length=36, description="Platform this key belongs to; usage is metered per client")

	@field_validator("scopes")
	@classmethod
	def _known_scopes(cls, value: list[str]) -> list[str]:
		unknown = sorted(set(value) - KNOWN_SCOPES)
		if unknown:
			raise ValueError(f"unknown scopes: {', '.join(unknown)}; allowed: {', '.join(sorted(KNOWN_SCOPES))}")
		return sorted(set(value))


class ApiKeyResponse(BaseModel):
	id: str
	name: str
	prefix: str
	scopes: list[str]
	created_at: datetime
	active: bool = True


class ApiKeyCreateResponse(ApiKeyResponse):
	api_key: str

