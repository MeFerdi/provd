"""Developer onboarding: self-serve sandbox keys, and the reference behind the playground.

The endpoint reference isn't published on the public websites. It's served here, to callers with a valid API key
(in the playground: a sandbox key), so it never sits in a public page or bundle.

Anyone can create a sandbox key from the website: sandbox keys only score test wallets, can't spend money or read
live data, and act for their own sandbox account. Live keys are still issued by Provd after a conversation.
"""
import hashlib
import hmac
from secrets import token_hex, token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies import get_db_session, require_permissions
from app.models.api_key import ApiKey
from app.models.client import Client, DeveloperSignup
from app.schemas.actions import clean_text
from app.schemas.auth import AuthContext
from app.services import sandbox
from app.services.hasher import sha256_hex
from app.services.rate_limit import client_ip, enforce
from app.services.sites import SITE_URLS

router = APIRouter(prefix="/developer", tags=["developer"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])
_evaluator = require_permissions(["actions:evaluate"])
_admin = require_permissions(["keys:read"], allowed_roles=["admin"])


class SandboxSignup(BaseModel):
	email: EmailStr = Field(description="Where Provd can reach you about your integration")
	name: str | None = Field(default=None, max_length=100)
	company: str | None = Field(default=None, max_length=150)
	# Honeypot: hidden on the form, so only bots fill it in.
	website: str | None = Field(default=None, max_length=200)


def _ip_hash(ip: str) -> str:
	key = get_settings().secret_key.encode()
	return hmac.new(key, f"signup-ip|{ip}".encode(), hashlib.sha256).hexdigest()[:32]


@router.post("/sandbox-keys", status_code=status.HTTP_201_CREATED, summary="Create a sandbox key (no account needed)")
async def create_sandbox_key(body: SandboxSignup, request: Request, db: AsyncSession = Depends(get_db_session)) -> dict:
	settings = get_settings()
	if not settings.self_serve_signup_enabled:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sandbox sign-up is paused. Email hello@provd.tech for a key.")
	if body.website:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
	ip = client_ip(request)
	await enforce(f"signup:{ip}", settings.signup_per_ip_per_hour, 3600)
	try:
		await enforce("signup:all", settings.signup_daily_cap, 86400)
	except HTTPException as exc:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Sandbox sign-up has reached today's limit. Try again tomorrow, or email hello@provd.tech.",
		) from exc

	email = body.email.lower()
	company = clean_text(body.company or "", 150).strip() or None
	name = clean_text(body.name or "", 100).strip() or None
	label = company or email.split("@", 1)[1]
	client = Client(id=str(uuid4()), name=f"Self-serve: {label[:120]} ({token_hex(3)})", active=True)
	raw_key = "sbx_" + token_urlsafe(32)
	key = ApiKey(
		id=str(uuid4()), client_id=client.id, name="Sandbox (self-serve)", prefix=raw_key[:8], key_hash=sha256_hex(raw_key),
		scopes=["actions:evaluate"], active=True, environment="sandbox",
	)
	db.add(client)
	await db.flush()  # the client row must exist before the rows that reference it
	db.add(key)
	db.add(DeveloperSignup(id=str(uuid4()), email=email, name=name, company=company, client_id=client.id, ip_hash=_ip_hash(ip), source="website"))
	await db.commit()
	return {
		"api_key": raw_key,
		"environment": "sandbox",
		"prefix": key.prefix,
		"playground_url": SITE_URLS["playground"],
		"docs_url": f"{SITE_URLS['docs']}/quickstart",
		"note": "Shown once: store it in your secret store. Sandbox keys score test wallets for free. For a live key, email hello@provd.tech.",
	}


@admin_router.get("/signups", summary="Admin: recent self-serve sandbox signups")
async def list_signups(
	limit: int = Query(default=100, ge=1, le=500),
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(_admin),
) -> list[dict]:
	rows = await db.execute(select(DeveloperSignup).order_by(DeveloperSignup.created_at.desc()).limit(limit))
	return [
		{"email": r.email, "name": r.name, "company": r.company, "client_id": r.client_id, "created_at": r.created_at.isoformat()}
		for r in rows.scalars().all()
	]


@router.get("/reference", summary="Endpoint reference and sandbox test wallets (needs an API key)")
async def reference(request: Request, ctx: AuthContext = Depends(_evaluator)) -> dict:
	return {
		"environment": ctx.environment,
		"openapi": request.app.openapi(),
		"sandbox": sandbox.scenarios(),
	}
