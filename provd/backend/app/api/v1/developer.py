"""The developer reference behind the playground: the endpoint spec and the sandbox test wallets.

The endpoint reference isn't published on the public websites. It's served here, to callers with a valid API key
(in the playground: a sandbox key), so it never sits in a public page or bundle.
"""
from fastapi import APIRouter, Depends, Request

from app.dependencies import require_permissions
from app.schemas.auth import AuthContext
from app.services import sandbox

router = APIRouter(prefix="/developer", tags=["developer"])
_evaluator = require_permissions(["actions:evaluate"])


@router.get("/reference", summary="Endpoint reference and sandbox test wallets (needs an API key)")
async def reference(request: Request, ctx: AuthContext = Depends(_evaluator)) -> dict:
	return {
		"environment": ctx.environment,
		"openapi": request.app.openapi(),
		"sandbox": sandbox.scenarios(),
	}
