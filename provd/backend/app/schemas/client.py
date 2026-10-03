from datetime import datetime

from pydantic import BaseModel, Field


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
	scopes: list[str] = Field(default_factory=lambda: ["actions:evaluate"])
	client_id: str | None = Field(default=None, max_length=36, description="Platform this key belongs to; usage is metered per client")


class ApiKeyResponse(BaseModel):
	id: str
	name: str
	prefix: str
	scopes: list[str]
	created_at: datetime
	active: bool = True


class ApiKeyCreateResponse(ApiKeyResponse):
	api_key: str

