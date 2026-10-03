"""Seal signed decisions into Merkle batches, anchor each batch root, and upgrade pending anchors."""
import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.rails import AnchorBatch, Decision
from app.proof import merkle
from app.proof.anchors import AnchorResult, anchor_adapter
from app.proof.signing import signer

logger = logging.getLogger("provd.proof")
UPGRADE_EVERY = timedelta(minutes=20)


def _aware(value: datetime | None) -> datetime | None:
	return value if value is None or value.tzinfo else value.replace(tzinfo=timezone.utc)


def _apply(batch: AnchorBatch, result: AnchorResult, now: datetime) -> None:
	batch.anchor_status = result.status
	batch.last_attempt_at = now
	if result.proof is not None:
		batch.anchor_proof = result.proof
	if result.reference:
		batch.anchor_reference = result.reference
	if result.detail:
		batch.anchor_detail = result.detail[:512]
	if result.status == "anchored" and batch.anchored_at is None:
		batch.anchored_at = now


async def seal_batch(db: AsyncSession, now: datetime | None = None, force: bool = False) -> AnchorBatch | None:
	settings = get_settings()
	now = now or datetime.now(timezone.utc)
	if not force:
		last = (await db.execute(select(AnchorBatch.sealed_at).order_by(AnchorBatch.sealed_at.desc()).limit(1))).scalar_one_or_none()
		if last and now - _aware(last) < timedelta(seconds=settings.batch_interval_seconds):
			return None
	decisions = (
		await db.execute(
			select(Decision)
			.where(Decision.batch_id.is_(None))
			.order_by(Decision.created_at, Decision.intent_id)
			.limit(settings.batch_max_decisions)
		)
	).scalars().all()
	if not decisions:
		return None
	key = signer()
	for decision in decisions:  # decisions recorded before signing was enabled are signed when first batched
		if decision.signature is None:
			decision.signature = key.sign(decision.record_hash)
			decision.signing_key_id = key.key_id
	root, proofs = merkle.build([d.record_hash for d in decisions])
	adapter = anchor_adapter()
	batch = AnchorBatch(id=str(uuid4()), merkle_root=root, leaf_count=len(decisions), sealed_at=now,
	                    anchor_method=adapter.method, anchor_status="failed")
	for index, (decision, proof) in enumerate(zip(decisions, proofs)):
		decision.batch_id, decision.leaf_index, decision.merkle_proof = batch.id, index, proof
	db.add(batch)
	try:
		result = await adapter.submit(root)
	except Exception as exc:  # noqa: BLE001 - keep the batch; the next pass retries the submission
		result = AnchorResult(status="failed", detail=f"{type(exc).__name__}: {exc}")
	_apply(batch, result, now)
	await db.commit()
	logger.info("proof.batch_sealed id=%s leaves=%d status=%s", batch.id, batch.leaf_count, batch.anchor_status)
	return batch


async def advance_anchors(db: AsyncSession, now: datetime | None = None) -> int:
	"""Retry failed submissions and upgrade pending proofs. Returns how many batches changed status."""
	now = now or datetime.now(timezone.utc)
	batches = (
		await db.execute(select(AnchorBatch).where(AnchorBatch.anchor_status.in_(["pending", "failed"])))
	).scalars().all()
	adapter = anchor_adapter()
	changed = 0
	for batch in batches:
		last = _aware(batch.last_attempt_at)
		if batch.anchor_status == "pending" and last and now - last < UPGRADE_EVERY:
			continue
		before = batch.anchor_status
		try:
			if batch.anchor_status == "failed" or batch.anchor_proof is None:
				result = await adapter.submit(batch.merkle_root)
			else:
				result = await adapter.upgrade(batch.merkle_root, batch.anchor_proof)
		except Exception as exc:  # noqa: BLE001
			result = AnchorResult(status=before, detail=f"{type(exc).__name__}: {exc}")
		_apply(batch, result, now)
		changed += int(batch.anchor_status != before)
	await db.commit()
	return changed
