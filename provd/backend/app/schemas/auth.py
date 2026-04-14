from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
	client_id: str = Field(min_length=3)
	client_secret: str = Field(min_length=3)


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
