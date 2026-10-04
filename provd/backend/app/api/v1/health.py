from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session, require_permissions
from app.engine.scoring import engine_config
from app.models.rails import AnchorBatch, Checkpoint, Decision, FlaggedAddress
from app.schemas.actions import SCORED_CHAINS, SCORED_INTENT_TYPES
from app.schemas.auth import AuthContext
from app.services.rate_limit import public_limit

router = APIRouter(prefix="/health", tags=["health"], dependencies=[Depends(public_limit)])
admin_router = APIRouter(prefix="/admin/health", tags=["admin"])


async def _database_ok(db: AsyncSession) -> bool:
	try:
		await db.execute(text("SELECT 1"))
		return True
	except Exception:  # noqa: BLE001 - health must answer even when the database doesn't
		return False


@router.get("", summary="Service status (public): up or degraded, and the engine version")
async def health(db: AsyncSession = Depends(get_db_session)) -> dict:
	"""Deliberately minimal: what's public is whether the service is up and which engine scored.
	Internals (signals, dependencies, risk-list size) are on the admin health endpoint."""
	ok = await _database_ok(db)
	return {
		"status": "ok" if ok else "degraded",
		"timestamp": datetime.now(timezone.utc).isoformat(),
		"engine_version": engine_config()["engine_version"],
		"scored": {"chains": sorted(SCORED_CHAINS), "intent_types": sorted(SCORED_INTENT_TYPES)},
	}


@admin_router.get("", summary="Admin: engine, signals, dependencies, risk list and proof pipeline")
async def health_details(
	db: AsyncSession = Depends(get_db_session),
	_: AuthContext = Depends(require_permissions(["billing:admin"], allowed_roles=["admin"])),
) -> dict:
	cfg = engine_config()
	ok = await _database_ok(db)
	flagged = checkpoint = unsealed = last_batch = None
	if ok:
		flagged = (await db.execute(select(func.count()).select_from(FlaggedAddress).where(FlaggedAddress.active.is_(True)))).scalar_one()
		checkpoint = await db.get(Checkpoint, "tron:usdt_freeze_events")
		unsealed = (await db.execute(select(func.count()).select_from(Decision).where(Decision.batch_id.is_(None)))).scalar_one()
		last_batch = (await db.execute(select(AnchorBatch).order_by(AnchorBatch.sealed_at.desc()).limit(1))).scalar_one_or_none()
	return {
		"status": "ok" if ok else "degraded",
		"timestamp": datetime.now(timezone.utc).isoformat(),
		"engine_version": cfg["engine_version"],
		"signals": {name: ("enabled" if spec["enabled"] else f"planned (phase {spec.get('phase', '?')})") for name, spec in cfg["signals"].items()},
		"dependencies": {
			"database": "ok" if ok else "unavailable",
			"risk_list": {
				"active_flagged_addresses": flagged,
				"last_sync": checkpoint.updated_at.isoformat() if checkpoint else None,
			},
		},
		"proof": {
			"unsealed_decisions": unsealed,
			"last_batch_sealed_at": last_batch.sealed_at.isoformat() if last_batch else None,
			"last_batch_anchor_status": last_batch.anchor_status if last_batch else None,
		},
	}
