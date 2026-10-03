from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.clients import router as clients_router
from app.api.v1.health import router as health_router
from app.api.v1.keys import router as keys_router
from app.api.v1.posture import router as posture_router

router = APIRouter()
router.include_router(health_router)
router.include_router(posture_router)
router.include_router(auth_router)
router.include_router(clients_router)
router.include_router(keys_router)
