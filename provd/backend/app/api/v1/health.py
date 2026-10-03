from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session
from app.engine.scoring import engine_config
from app.models.rails import Checkpoint, FlaggedAddress
from app.schemas.actions import SCORED_CHAINS, SCORED_INTENT_TYPES

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", summary="Engine version, signal coverage and dependency status")
async def health(db: AsyncSession = Depends(get_db_session)) -> dict:
	cfg = engine_config()
	try:
		flagged = (await db.execute(select(func.count()).select_from(FlaggedAddress).where(FlaggedAddress.active.is_(True)))).scalar_one()
		checkpoint = await db.get(Checkpoint, "tron:usdt_freeze_events")
		database = "ok"
	except Exception:  # noqa: BLE001 - health must answer even when the database doesn't
		flagged, checkpoint, database = None, None, "unavailable"
	return {
		"status": "ok" if database == "ok" else "degraded",
		"timestamp": datetime.now(timezone.utc).isoformat(),
		"engine_version": cfg["engine_version"],
		"scored": {"chains": sorted(SCORED_CHAINS), "intent_types": sorted(SCORED_INTENT_TYPES)},
		"signals": {name: ("enabled" if spec["enabled"] else f"planned (phase {spec.get('phase', '?')})") for name, spec in cfg["signals"].items()},
		"dependencies": {
			"database": database,
			"risk_list": {
				"active_flagged_addresses": flagged,
				"last_sync": checkpoint.updated_at.isoformat() if checkpoint else None,
			},
		},
	}
