from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.dispute import router as dispute_router
from app.api.v1.health import router as health_router
from app.api.v1.keys import router as keys_router
from app.api.v1.trust import router as trust_router

router = APIRouter()
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(trust_router)
router.include_router(dispute_router)
router.include_router(keys_router)
