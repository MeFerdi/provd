"""Release attestations: a signed, on-chain verifiable "release" for one scored payment and one escrow."""
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies import get_db_session, require_permissions
from app.models.rails import Decision, ReleaseAttestation
from app.proof import attestations as att
from app.schemas.auth import AuthContext

router = APIRouter(prefix="/decisions", tags=["attestations"])
_evaluator = require_permissions(["actions:evaluate"])
_EVM_ADDRESS = re.compile(r"^0x[0-9a-fA-F]{40}$")
# EVM-style targets can verify a decision about a payment on these chains (Tron's TVM runs EVM contracts).
_TARGET_CHAINS = {"evm": {"tron"}, "solana": {"solana"}}


class AttestationRequest(BaseModel):
	target: Literal["evm", "solana"] = Field(description="evm: EIP-712 for EVM/Tron (TVM) contracts; solana: for Solana programs")
	chain_id: int | None = Field(default=None, ge=1, description="evm: the chain id the escrow contract runs on (Tron mainnet: 728126428)")
	verifying_contract: str | None = Field(default=None, description="evm: the escrow contract that will verify the attestation (0x...)")
	program_id: str | None = Field(default=None, max_length=44, description="solana: the escrow program that will verify it")
	amount_base_units: int = Field(gt=0, lt=2**64, description="Amount to release, in the token's smallest unit (USDT/USDC: 6 decimals)")
	token_decimals: int = Field(default=6, ge=0, le=18)
	ttl_seconds: int = Field(default=600, ge=30, description="How long the attestation stays valid")

	@model_validator(mode="after")
	def _domain(self) -> "AttestationRequest":
		if self.target == "evm":
			if self.chain_id is None or not self.verifying_contract or not _EVM_ADDRESS.match(self.verifying_contract):
				raise ValueError("evm attestations need chain_id and verifying_contract (0x + 40 hex)")
		elif not self.program_id:
			raise ValueError("solana attestations need program_id")
		return self


def _account(ctx: AuthContext) -> str:
	return ctx.client_id or ctx.principal_id


def _aware(value: datetime) -> datetime:
	return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.post("/{intent_id}/attestation", status_code=status.HTTP_201_CREATED, summary="Signed release attestation for an escrow contract")
async def create_attestation(
	intent_id: str, body: AttestationRequest, db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator)
) -> dict:
	settings = get_settings()
	decision = await db.get(Decision, intent_id)
	if decision is None or decision.account_id != _account(ctx):
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
	if decision.recommended_action != "release":
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Only release decisions can be attested; this one is '{decision.recommended_action}'")
	now = datetime.now(timezone.utc)
	if now - _aware(decision.created_at) > timedelta(seconds=settings.attestation_max_decision_age_seconds):
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Decision is too old to attest; run a fresh check")
	if decision.chain not in _TARGET_CHAINS[body.target]:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"A {decision.chain} decision can't be attested for a {body.target} contract")
	if not decision.wallet_address:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Decision has no recipient wallet")
	scored = ((decision.record or {}).get("intent") or {}).get("amounts", {}).get("crypto")
	if scored is None:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Attestations need a decision scored with amounts.crypto")
	max_units = int(Decimal(str(scored)) * (Decimal(10) ** body.token_decimals))
	if body.amount_base_units > max_units:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Amount exceeds the scored amount ({max_units} base units)")

	ttl = min(body.ttl_seconds, settings.attestation_max_ttl_seconds)
	expires_at = int((now + timedelta(seconds=ttl)).timestamp())
	intent_hash = att.intent_id_hash(intent_id)
	recipient = att.recipient_bytes32(decision.chain, decision.wallet_address)
	record_hash = bytes.fromhex(decision.record_hash)
	key = att.attestation_signer()

	if body.target == "evm":
		typed = att.evm_typed_data(body.chain_id, body.verifying_contract, intent_hash, recipient, body.amount_base_units, expires_at, record_hash)
		digest = att.evm_digest(typed)
		domain = f"evm:{body.chain_id}:{typed['domain']['verifyingContract']}"
		payload = {"typed_data": typed}
	else:
		from app.adapters.solana import validate_solana_address, b58decode

		try:
			program = b58decode(validate_solana_address(body.program_id))
		except ValueError as exc:
			raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"program_id: {exc}") from exc
		digest = att.solana_digest(program, intent_hash, recipient, body.amount_base_units, expires_at, record_hash)
		domain = f"solana:{body.program_id}"
		payload = {
			"layout": "keccak256(prefix || program_id || intent_id || recipient || amount u64 BE || expires_at i64 BE || record_hash)",
			"prefix_hex": att.SOLANA_PREFIX.hex(),
			"fields": {
				"program_id": body.program_id, "intent_id": "0x" + intent_hash.hex(), "recipient": "0x" + recipient.hex(),
				"amount": body.amount_base_units, "expires_at": expires_at, "record_hash": "0x" + record_hash.hex(),
			},
		}

	r, s, v = key.sign_digest(digest)
	signature = r.to_bytes(32, "big") + s.to_bytes(32, "big") + bytes([v])
	db.add(ReleaseAttestation(
		id=str(uuid4()), intent_id=intent_id, account_id=decision.account_id, target=body.target, domain=domain[:128],
		recipient=decision.wallet_address, amount_base_units=str(body.amount_base_units), digest=digest.hex(),
		signature=signature.hex(), signer=key.address, expires_at=datetime.fromtimestamp(expires_at, tz=timezone.utc), created_at=now,
	))
	await db.commit()
	return {
		"intent_id": intent_id,
		"target": body.target,
		"recipient": decision.wallet_address,
		"amount_base_units": str(body.amount_base_units),
		"expires_at": expires_at,
		"digest": "0x" + digest.hex(),
		"signature": {"r": "0x" + r.to_bytes(32, "big").hex(), "s": "0x" + s.to_bytes(32, "big").hex(), "v": v, "bytes": "0x" + signature.hex()},
		"signer": {"address": key.address, "key_id": key.key_id, "public_key": key.public_key_hex},
		**payload,
	}
