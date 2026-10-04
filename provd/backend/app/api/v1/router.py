from fastapi import APIRouter

from app.api.v1.actions import router as actions_router
from app.api.v1.auth import router as auth_router
from app.api.v1.clients import router as clients_router
from app.api.v1.health import admin_router as health_admin_router
from app.api.v1.health import router as health_router
from app.api.v1.keys import router as keys_router
from app.api.v1.proof import router as proof_router
from app.api.v1.webhooks import router as webhooks_router

router = APIRouter()
router.include_router(health_router)
router.include_router(health_admin_router, include_in_schema=False)
router.include_router(actions_router)
router.include_router(proof_router)
router.include_router(auth_router, include_in_schema=False)
router.include_router(clients_router, include_in_schema=False)
router.include_router(keys_router, include_in_schema=False)
router.include_router(webhooks_router, include_in_schema=False)
