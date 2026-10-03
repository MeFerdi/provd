"""Anchor adapters: publish a batch's Merkle root somewhere public and tamper-proof.

- OpenTimestampsAnchor (default): free, no wallet. Submits the root to public OpenTimestamps calendars,
  which aggregate it into a Bitcoin transaction. The proof is "pending" immediately and becomes
  "anchored" once the calendar's transaction confirms (typically a few hours). Verify with
  `ots verify -d <root> batch.ots`.
- NullAnchor: records the root locally only (development, or when anchoring is disabled).
- TronMemoAnchor: documented stub. Would write the root into a Tron transaction memo; needs a funded
  wallet and signing key, so it is not enabled.
"""
import asyncio
import logging
from dataclasses import dataclass
from typing import Protocol

from opentimestamps.calendar import RemoteCalendar
from opentimestamps.core.notary import BitcoinBlockHeaderAttestation, PendingAttestation
from opentimestamps.core.op import OpSHA256
from opentimestamps.core.serialize import BytesDeserializationContext, BytesSerializationContext
from opentimestamps.core.timestamp import DetachedTimestampFile, Timestamp

from app.config import get_settings

logger = logging.getLogger("provd.anchor")


@dataclass
class AnchorResult:
	status: str  # pending | anchored | not_anchored | failed
	proof: bytes | None = None
	reference: str | None = None  # e.g. "bitcoin:block:<height>"
	detail: str | None = None


class AnchorAdapter(Protocol):
	method: str

	async def submit(self, root_hex: str) -> AnchorResult: ...

	async def upgrade(self, root_hex: str, proof: bytes) -> AnchorResult: ...


class NullAnchor:
	method = "none"

	async def submit(self, root_hex: str) -> AnchorResult:
		return AnchorResult(status="not_anchored", detail="Anchoring disabled; root recorded locally.")

	async def upgrade(self, root_hex: str, proof: bytes) -> AnchorResult:
		return AnchorResult(status="not_anchored")


class TronMemoAnchor:
	method = "tron_memo"

	async def submit(self, root_hex: str) -> AnchorResult:
		raise NotImplementedError("Tron memo anchoring needs a funded wallet; use opentimestamps or none")

	async def upgrade(self, root_hex: str, proof: bytes) -> AnchorResult:
		raise NotImplementedError


def _serialize(detached: DetachedTimestampFile) -> bytes:
	ctx = BytesSerializationContext()
	detached.serialize(ctx)
	return ctx.getbytes()


def _deserialize(proof: bytes) -> DetachedTimestampFile:
	return DetachedTimestampFile.deserialize(BytesDeserializationContext(proof))


def _walk(stamp: Timestamp):
	if stamp.attestations:
		yield stamp
	for child in stamp.ops.values():
		yield from _walk(child)


def _bitcoin_height(stamp: Timestamp) -> int | None:
	heights = [a.height for _, a in stamp.all_attestations() if isinstance(a, BitcoinBlockHeaderAttestation)]
	return min(heights) if heights else None


class OpenTimestampsAnchor:
	method = "opentimestamps"

	def __init__(self, calendars: list[str], timeout: float = 15.0, min_calendars: int = 2):
		self._calendars = calendars
		self._timeout = timeout
		self._min = min_calendars

	def _submit_sync(self, root: bytes) -> AnchorResult:
		# The "file" is the 32-byte root itself: its SHA-256 op starts the proof, matching `ots verify -d`.
		detached = DetachedTimestampFile(OpSHA256(), Timestamp(root))
		ok, errors = 0, []
		for url in self._calendars:
			try:
				detached.timestamp.merge(RemoteCalendar(url).submit(root, timeout=self._timeout))
				ok += 1
			except Exception as exc:  # noqa: BLE001 - one calendar failing must not lose the others
				errors.append(f"{url}: {type(exc).__name__}")
		if ok < min(self._min, len(self._calendars)):
			return AnchorResult(status="failed", detail=f"{ok} calendar(s) accepted; errors: {'; '.join(errors)}")
		return AnchorResult(status="pending", proof=_serialize(detached), detail=f"Submitted to {ok} calendar(s).")

	def _upgrade_sync(self, proof: bytes) -> AnchorResult:
		detached = _deserialize(proof)
		for stamp in list(_walk(detached.timestamp)):
			for attestation in list(stamp.attestations):
				if isinstance(attestation, PendingAttestation):
					try:
						stamp.merge(RemoteCalendar(attestation.uri).get_timestamp(stamp.msg, timeout=self._timeout))
					except Exception:  # noqa: BLE001 - not confirmed yet, or calendar unreachable
						continue
		height = _bitcoin_height(detached.timestamp)
		if height is None:
			return AnchorResult(status="pending", proof=_serialize(detached))
		return AnchorResult(status="anchored", proof=_serialize(detached), reference=f"bitcoin:block:{height}")

	async def submit(self, root_hex: str) -> AnchorResult:
		return await asyncio.to_thread(self._submit_sync, bytes.fromhex(root_hex))

	async def upgrade(self, root_hex: str, proof: bytes) -> AnchorResult:
		return await asyncio.to_thread(self._upgrade_sync, proof)


def ots_proof_root(proof: bytes) -> str:
	"""The digest an .ots proof commits to (for consistency checks)."""
	return _deserialize(proof).file_digest.hex()


_override: AnchorAdapter | None = None


def set_anchor(adapter: AnchorAdapter | None) -> None:
	"""Test hook."""
	global _override
	_override = adapter


def anchor_adapter() -> AnchorAdapter:
	if _override is not None:
		return _override
	settings = get_settings()
	if settings.anchor_method == "opentimestamps":
		return OpenTimestampsAnchor([u.strip() for u in settings.ots_calendars.split(",") if u.strip()])
	if settings.anchor_method == "tron_memo":
		return TronMemoAnchor()
	return NullAnchor()

