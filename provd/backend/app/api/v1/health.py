from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", summary="Health check")
def health_check() -> dict[str, str]:
	return {
		"status": "ok",
		"timestamp": datetime.now(timezone.utc).isoformat(),
	}
