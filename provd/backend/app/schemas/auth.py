from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
	client_id: str = Field(min_length=3, max_length=128)
	client_secret: str = Field(min_length=3, max_length=256)


class TokenResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
	expires_in: int
	scopes: list[str] = Field(default_factory=list)
	role: str = "user"


class AuthContext(BaseModel):
	principal_id: str
	auth_type: str
	scopes: list[str] = Field(default_factory=list)
	role: str = "user"
	# The platform (client) an API key belongs to; usage is metered and data isolated per client.
	client_id: str | None = None
	# "sandbox" for sandbox API keys: free checks against test wallets, in a separate account.
	environment: str = "live"
