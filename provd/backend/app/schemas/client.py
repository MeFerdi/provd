from datetime import datetime

from pydantic import BaseModel, Field


class ClientResponse(BaseModel):
	id: str
	name: str
	active: bool = True


class ApiKeyCreateRequest(BaseModel):
	name: str = Field(min_length=2, max_length=100)
	scopes: list[str] = Field(default_factory=lambda: ["trust:read"])


class ApiKeyResponse(BaseModel):
	id: str
	name: str
	prefix: str
	scopes: list[str]
	created_at: datetime
	active: bool = True


class ApiKeyCreateResponse(ApiKeyResponse):
	api_key: str
