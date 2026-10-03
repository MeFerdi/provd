"""Proof endpoints: what a third party needs to verify a decision without trusting Provd."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session
from app.models.rails import AnchorBatch, Decision
from app.proof.signing import ALGORITHM, signer

router = APIRouter(prefix="/proof", tags=["proof"])

MERKLE_ALGORITHM = "leaf=SHA256(0x00||record_hash); node=SHA256(0x01||left||right); odd node promoted"
VERIFY_STEPS = [
	"1. sha256(canonical JSON of `record` — sorted keys, no whitespace, UTF-8) must equal `record_hash`.",
	"2. `signature` (secp256k1, compact r||s) must verify over `record_hash` with the public key from GET /v1/proof/keys.",
	"3. Folding `merkle.proof` from leaf_hash(record_hash) must reproduce `merkle.root`.",
	"4. `merkle.root` is anchored: download GET /v1/proof/batches/{batch_id}/ots and run `ots verify -d <root> batch.ots`.",
]


def _batch_view(batch: AnchorBatch) -> dict:
	return {
		"batch_id": batch.id,
		"merkle_root": batch.merkle_root,
		"leaf_count": batch.leaf_count,
		"sealed_at": batch.sealed_at.isoformat(),
		"anchor": {
			"method": batch.anchor_method,
			"status": batch.anchor_status,
			"reference": batch.anchor_reference,
			"anchored_at": batch.anchored_at.isoformat() if batch.anchored_at else None,
			"proof_url": f"/v1/proof/batches/{batch.id}/ots" if batch.anchor_proof else None,
		},
	}


async def proof_bundle(db: AsyncSession, decision: Decision) -> dict:
	batch = await db.get(AnchorBatch, decision.batch_id) if decision.batch_id else None
	key = signer()
	return {
		"intent_id": decision.intent_id,
		"record": {k: v for k, v in decision.record.items() if k != "response"},
		"record_hash": decision.record_hash,
		"hash_algorithm": "sha256 over canonical JSON (sorted keys, no whitespace)",
		"signature": {
			"algorithm": ALGORITHM,
			"key_id": decision.signing_key_id,
			"public_key": key.public_key_hex if decision.signing_key_id == key.key_id else None,
			"value": decision.signature,
		} if decision.signature else None,
		"merkle": {
			"algorithm": MERKLE_ALGORITHM,
			"leaf_index": decision.leaf_index,
			"proof": decision.merkle_proof,
			"root": batch.merkle_root if batch else None,
		} if batch else None,
		"batch": _batch_view(batch) if batch else None,
		"proof_status": (
			"anchored" if batch and batch.anchor_status == "anchored"
			else "anchoring" if batch and batch.anchor_status in ("pending", "failed")
			else "batched (not anchored)" if batch
			else "signed — joins the next batch within minutes"
		),
		"verify": VERIFY_STEPS,
	}


@router.get("/keys", summary="Public keys that sign decision records")
async def keys() -> dict:
	key = signer()
	return {"keys": [{"key_id": key.key_id, "algorithm": ALGORITHM, "public_key": key.public_key_hex, "encoding": "SEC1 compressed, hex"}]}


@router.get("/batches/{batch_id}", summary="A Merkle batch and its anchor status")
async def batch(batch_id: str, db: AsyncSession = Depends(get_db_session)) -> dict:
	found = await db.get(AnchorBatch, batch_id)
	if found is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
	return _batch_view(found)


@router.get("/batches/{batch_id}/ots", summary="OpenTimestamps proof for the batch root (verify with `ots verify -d <root>`)")
async def batch_ots(batch_id: str, db: AsyncSession = Depends(get_db_session)) -> Response:
	found = await db.get(AnchorBatch, batch_id)
	if found is None or not found.anchor_proof:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No anchor proof for this batch")
	return Response(
		content=found.anchor_proof,
		media_type="application/vnd.opentimestamps.v1",
		headers={"Content-Disposition": f'attachment; filename="provd-batch-{found.id}.ots"'},
	)
