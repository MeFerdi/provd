"""Tron adapter (TronGrid): USDT-TRC20 transfer history and Tether's freeze/unfreeze events.

Tether freezes ("blacklists") USDT addresses on-chain via the USDT contract's AddedBlackList event,
which makes a public, authoritative list of addresses linked to theft, scams and sanctions.
"""
import asyncio
import hashlib
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.adapters.base import (
	AdapterUnavailable,
	InvalidAddress,
	NormalizedAsset,
	NormalizedEvent,
	NormalizedHistory,
	NormalizedTransfer,
)

_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_INDEX = {c: i for i, c in enumerate(_ALPHABET)}
USDT_DECIMALS = 6


def _sha256d(data: bytes) -> bytes:
	return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def b58check_encode(payload: bytes) -> str:
	data = payload + _sha256d(payload)[:4]
	n = int.from_bytes(data, "big")
	out = ""
	while n:
		n, rem = divmod(n, 58)
		out = _ALPHABET[rem] + out
	pad = len(data) - len(data.lstrip(b"\x00"))
	return "1" * pad + out


def b58check_decode(text: str) -> bytes:
	n = 0
	for char in text:
		if char not in _INDEX:
			raise InvalidAddress("not base58")
		n = n * 58 + _INDEX[char]
	raw = n.to_bytes(25, "big") if n else b""
	if len(raw) != 25:
		raise InvalidAddress("wrong length")
	payload, checksum = raw[:-4], raw[-4:]
	if _sha256d(payload)[:4] != checksum:
		raise InvalidAddress("bad checksum")
	return payload


def hex_to_tron(hex_address: str) -> str:
	"""0x-prefixed 20-byte EVM-style hex (as TronGrid reports event args) -> base58 'T…' address."""
	if hex_address.startswith("T"):
		return validate_tron_address(hex_address)
	body = hex_address.lower().removeprefix("0x")
	if len(body) == 42 and body.startswith("41"):  # already carries the Tron mainnet prefix
		body = body[2:]
	if len(body) != 40:
		raise InvalidAddress("expected 20-byte hex address")
	return b58check_encode(bytes.fromhex("41" + body))


def validate_tron_address(address: str) -> str:
	address = (address or "").strip()
	if not address.startswith("T") or not 30 <= len(address) <= 36:
		raise InvalidAddress("Not a Tron address (expected base58 starting with T).")
	payload = b58check_decode(address)
	if payload[0] != 0x41:
		raise InvalidAddress("Not a Tron mainnet address.")
	return address


def _ts(ms: int) -> datetime:
	return datetime.fromtimestamp(ms / 1000, timezone.utc)


class TronAdapter:
	chain = "tron"

	def __init__(self, base_url: str, usdt_contract: str, api_key: str = "", timeout: float = 10.0, max_transfers: int = 200):
		self._base = base_url.rstrip("/")
		self._usdt = usdt_contract
		self._headers = {"TRON-PRO-API-KEY": api_key} if api_key else {}
		self._timeout = timeout
		self._max = max_transfers

	def validate_address(self, address: str) -> str:
		return validate_tron_address(address)

	async def _get(self, path: str, params: dict) -> dict:
		try:
			async with httpx.AsyncClient(timeout=self._timeout, headers=self._headers) as http:
				response = await http.get(f"{self._base}{path}", params=params)
				response.raise_for_status()
				body = response.json()
		except (httpx.HTTPError, ValueError, asyncio.TimeoutError, OSError) as exc:
			raise AdapterUnavailable(f"TronGrid request failed: {type(exc).__name__}") from exc
		if body.get("success") is False:
			raise AdapterUnavailable(f"TronGrid error: {body.get('error', 'unknown')}")
		return body

	async def counterparty_history(self, address: str) -> NormalizedHistory:
		address = self.validate_address(address)
		history = NormalizedHistory(chain=self.chain, address=address)
		params = {"contract_address": self._usdt, "limit": 200, "only_confirmed": "true"}
		while len(history.transfers) < self._max:
			body = await self._get(f"/v1/accounts/{address}/transactions/trc20", params)
			for row in body.get("data", []):
				history.transfers.append(
					NormalizedTransfer(
						chain=self.chain,
						tx_hash=row["transaction_id"],
						timestamp=_ts(row["block_timestamp"]),
						from_address=row["from"],
						to_address=row["to"],
						asset="USDT_TRC20",
						amount=Decimal(row["value"]) / (10 ** int(row.get("token_info", {}).get("decimals", USDT_DECIMALS))),
					)
				)
			fingerprint = body.get("meta", {}).get("fingerprint")
			if not fingerprint or not body.get("data"):
				break
			params["fingerprint"] = fingerprint
		if len(history.transfers) >= self._max:
			history.transfers = history.transfers[: self._max]
			history.truncated = True
		return history

	async def fetch_events(self, cursor: str | None) -> tuple[list[NormalizedEvent], str | None]:
		"""USDT freeze/unfreeze events newer than `cursor` (a millisecond timestamp), oldest first."""
		events: list[NormalizedEvent] = []
		since = int(cursor or 0)
		newest = since
		for name, kind in (("AddedBlackList", "address_frozen"), ("RemovedBlackList", "address_unfrozen")):
			params = {"event_name": name, "limit": 200, "order_by": "block_timestamp,asc", "min_block_timestamp": since + 1}
			while True:
				body = await self._get(f"/v1/contracts/{self._usdt}/events", params)
				for row in body.get("data", []):
					target = (row.get("result") or {}).get("_user") or (row.get("result") or {}).get("0")
					if not target:
						continue
					events.append(
						NormalizedEvent(
							chain=self.chain,
							kind=kind,
							address=hex_to_tron(target),
							tx_hash=row["transaction_id"],
							timestamp=_ts(row["block_timestamp"]),
							source="tether_usdt_freeze",
						)
					)
					newest = max(newest, row["block_timestamp"])
				fingerprint = body.get("meta", {}).get("fingerprint")
				if not fingerprint or not body.get("data"):
					break
				params["fingerprint"] = fingerprint
		events.sort(key=lambda e: e.timestamp)
		return events, str(newest) if newest else cursor

	async def asset_metadata(self, asset_ref: str) -> NormalizedAsset | None:
		if asset_ref in ("USDT_TRC20", self._usdt):
			return NormalizedAsset(chain=self.chain, ref=self._usdt, symbol="USDT", decimals=USDT_DECIMALS, issuer="Tether", well_known=True)
		return None
