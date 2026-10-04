"""Solana adapter: wallet validation, recent USDC/USDT (SPL) and SOL transfers, issuer-frozen accounts.

On Solana a wallet's stablecoins sit in token accounts it owns, so a wallet's own signature list misses most
incoming tokens. We derive the wallet's associated token accounts (ATAs) for USDC and USDT locally (no indexed
RPC needed) and read their signatures too. Non-associated token accounts aren't covered.

Providers: any Solana JSON-RPC. Free public endpoints keep only recent history (about a day on PublicNode),
which suits lookalike detection (poisoning addresses are minutes old); set SOLANA_RPC_URL to a Helius or
Alchemy endpoint for full history. History from a window-limited provider is marked truncated.
"""
import asyncio
import base64
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

TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
STABLECOINS = {
	"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": ("USDC_SPL", "USDC", "Circle"),
	"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": ("USDT_SPL", "USDT", "Tether"),
}
FREEZE_SOURCES = {"USDC_SPL": "circle_usdc_freeze_solana", "USDT_SPL": "tether_usdt_freeze_solana"}


def b58decode(text: str) -> bytes:
	num = 0
	for ch in text:
		if ch not in _INDEX:
			raise InvalidAddress("Not a base58 string")
		num = num * 58 + _INDEX[ch]
	raw = num.to_bytes((num.bit_length() + 7) // 8, "big") if num else b""
	return b"\x00" * (len(text) - len(text.lstrip("1"))) + raw


def b58encode(raw: bytes) -> str:
	num = int.from_bytes(raw, "big")
	out = ""
	while num:
		num, rem = divmod(num, 58)
		out = _ALPHABET[rem] + out
	return "1" * (len(raw) - len(raw.lstrip(b"\x00"))) + out


def validate_solana_address(address: str) -> str:
	address = (address or "").strip()
	if not 32 <= len(address) <= 44:
		raise InvalidAddress("A Solana address is 32 to 44 base58 characters")
	if len(b58decode(address)) != 32:
		raise InvalidAddress("Not a valid Solana address (must decode to 32 bytes)")
	return address


# --- program-derived addresses (to find a wallet's associated token accounts) ---------------------------

_P = 2**255 - 19
_D = (-121665 * pow(121666, _P - 2, _P)) % _P


def _on_ed25519_curve(key: bytes) -> bool:
	"""True if the 32 bytes decode to a point on the ed25519 curve (PDAs must not)."""
	y = int.from_bytes(key, "little") & ((1 << 255) - 1)
	if y >= _P:
		return False
	y2 = y * y % _P
	x2 = (y2 - 1) * pow(_D * y2 + 1, _P - 2, _P) % _P
	return x2 == 0 or pow(x2, (_P - 1) // 2, _P) == 1


def find_program_address(seeds: list[bytes], program: str) -> str:
	program_id = b58decode(program)
	for bump in range(255, -1, -1):
		digest = hashlib.sha256(b"".join(seeds) + bytes([bump]) + program_id + b"ProgramDerivedAddress").digest()
		if not _on_ed25519_curve(digest):
			return b58encode(digest)
	raise ValueError("no viable bump")


def associated_token_account(owner: str, mint: str) -> str:
	return find_program_address([b58decode(owner), b58decode(TOKEN_PROGRAM), b58decode(mint)], ATA_PROGRAM)


def _ts(seconds: int | None) -> datetime:
	return datetime.fromtimestamp(seconds or 0, tz=timezone.utc)


class SolanaAdapter:
	chain = "solana"

	def __init__(self, rpc_url: str, index_rpc_url: str, timeout: float = 10.0, max_transactions: int = 30, window_limited: bool = True):
		self._rpc = rpc_url
		self._index_rpc = index_rpc_url
		self._timeout = timeout
		self._max = max_transactions
		self._window_limited = window_limited

	def validate_address(self, address: str) -> str:
		return validate_solana_address(address)

	async def _call(self, payload, url: str | None = None, timeout: float | None = None):
		try:
			async with httpx.AsyncClient(timeout=timeout or self._timeout, headers={"content-type": "application/json"}) as http:
				for attempt in range(3):
					response = await http.post(url or self._rpc, json=payload)
					if response.status_code == 429 and attempt < 2:
						await asyncio.sleep(0.5 * (attempt + 1))
						continue
					response.raise_for_status()
					body = response.json()
					break
		except (httpx.HTTPError, ValueError, asyncio.TimeoutError, OSError) as exc:
			raise AdapterUnavailable(f"Solana RPC request failed: {type(exc).__name__}") from exc
		if isinstance(body, dict) and "error" in body:
			raise AdapterUnavailable(f"Solana RPC error: {body['error'].get('message', 'unknown')}")
		return body

	async def _rpc_call(self, method: str, params: list, url: str | None = None, timeout: float | None = None):
		return (await self._call({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, url, timeout))["result"]

	async def counterparty_history(self, address: str) -> NormalizedHistory:
		address = validate_solana_address(address)
		accounts = [address] + [associated_token_account(address, mint) for mint in STABLECOINS]
		pages = await asyncio.gather(*(self._rpc_call("getSignaturesForAddress", [a, {"limit": self._max}]) for a in accounts))
		seen: dict[str, int] = {}
		for page in pages:
			for sig in page:
				if not sig.get("err"):
					seen[sig["signature"]] = sig.get("blockTime") or 0
		ordered = sorted(seen, key=lambda s: seen[s], reverse=True)
		chosen = ordered[: self._max]
		history = NormalizedHistory(chain=self.chain, address=address, truncated=self._window_limited or len(ordered) > len(chosen))
		if not chosen:
			return history
		# Parallel single requests: free providers cap batches (PublicNode allows one getTransaction per batch).
		gate = asyncio.Semaphore(8)

		async def fetch(signature: str):
			async with gate:
				return await self._rpc_call("getTransaction", [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}])

		for signature, tx in zip(chosen, await asyncio.gather(*(fetch(s) for s in chosen))):
			if tx and tx.get("meta"):
				self._parse(address, signature, tx, history)
		return history

	def _parse(self, address: str, signature: str, tx: dict, history: NormalizedHistory) -> None:
		when = _ts(tx.get("blockTime"))
		meta = tx["meta"]
		delta: dict[tuple[str, str], Decimal] = {}
		for side, sign in (("preTokenBalances", -1), ("postTokenBalances", 1)):
			for b in meta.get(side) or []:
				mint, owner = b.get("mint"), b.get("owner")
				if mint in STABLECOINS and owner:
					amount = Decimal(str(b["uiTokenAmount"].get("uiAmountString") or "0"))
					delta[(owner, mint)] = delta.get((owner, mint), Decimal(0)) + sign * amount
		for (owner, mint), change in list(delta.items()):
			if owner != address or change == 0:
				continue
			asset = STABLECOINS[mint][0]
			others = [(o, d) for (o, m), d in delta.items() if m == mint and o != address and d != 0 and (d > 0) != (change > 0)]
			if not others:
				continue
			other = max(others, key=lambda od: abs(od[1]))[0]
			src, dst = (other, address) if change > 0 else (address, other)
			history.transfers.append(NormalizedTransfer(self.chain, signature, when, src, dst, asset, abs(change)))
		message = tx["transaction"]["message"]
		instructions = list(message.get("instructions", []))
		for inner in meta.get("innerInstructions") or []:
			instructions += inner.get("instructions", [])
		for ix in instructions:
			parsed = ix.get("parsed")
			if ix.get("program") == "system" and isinstance(parsed, dict) and parsed.get("type") == "transfer":
				info = parsed["info"]
				if address in (info.get("source"), info.get("destination")):
					history.native_transfers.append(
						NormalizedTransfer(self.chain, signature, when, info["source"], info["destination"], "SOL", Decimal(info["lamports"]) / Decimal(10**9))
					)

	async def frozen_owners(self) -> dict[str, str]:
		"""Owners of currently frozen USDC/USDT token accounts -> source. Uses the index RPC (getProgramAccounts)."""
		owners: dict[str, str] = {}
		for mint, (asset, _symbol, _issuer) in STABLECOINS.items():
			accounts = await self._rpc_call(
				"getProgramAccounts",
				[TOKEN_PROGRAM, {"encoding": "base64", "dataSlice": {"offset": 32, "length": 32},
				                 "filters": [{"dataSize": 165}, {"memcmp": {"offset": 0, "bytes": mint}}, {"memcmp": {"offset": 108, "bytes": "3"}}]}],
				url=self._index_rpc,
				timeout=90.0,  # a whole-chain scan; runs in the worker, never in a request
			)
			for account in accounts:
				owners[b58encode(base64.b64decode(account["account"]["data"][0]))] = FREEZE_SOURCES[asset]
		return owners

	async def fetch_events(self, cursor: str | None) -> tuple[list[NormalizedEvent], str | None]:
		return [], cursor  # Solana freezes are synced as a snapshot (see indexer.sync_solana_frozen)

	async def asset_metadata(self, asset_ref: str) -> NormalizedAsset | None:
		for mint, (asset, symbol, issuer) in STABLECOINS.items():
			if asset_ref in (mint, asset):
				return NormalizedAsset(self.chain, mint, symbol, 6, issuer, well_known=True)
		return None
