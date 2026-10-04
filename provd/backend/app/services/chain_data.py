"""Chain data access for the API: adapter selection, cached histories, public risk-list lookups, GoPlus.

Every upstream failure is converted into "unavailable" so evaluate degrades instead of erroring.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import AdapterUnavailable, ChainAdapter, NormalizedHistory, NormalizedTransfer
from app.adapters.solana import SolanaAdapter
from app.adapters.stubs import EvmAdapter, StellarAdapter
from app.adapters.tron import TronAdapter
from app.config import get_settings
from app.models.rails import FlaggedAddress, HistoryCache

_adapter_override: dict[str, ChainAdapter] = {}


def adapter_for(chain: str) -> ChainAdapter:
	if chain in _adapter_override:
		return _adapter_override[chain]
	settings = get_settings()
	if chain == "tron":
		return TronAdapter(settings.trongrid_url, settings.usdt_trc20_contract, settings.trongrid_api_key, settings.http_timeout_seconds)
	if chain == "solana":
		return SolanaAdapter(
			settings.solana_rpc_url, settings.solana_index_rpc_url, settings.http_timeout_seconds,
			settings.solana_max_transactions, settings.solana_history_window_limited,
		)
	return {"stellar": StellarAdapter, "evm": EvmAdapter}[chain]()


def set_adapter(chain: str, adapter: ChainAdapter | None) -> None:
	"""Test hook: replace the adapter for a chain (None restores the default)."""
	if adapter is None:
		_adapter_override.pop(chain, None)
	else:
		_adapter_override[chain] = adapter


def _serialize(history: NormalizedHistory) -> dict:
	def rows(transfers):
		return [[t.tx_hash, t.timestamp.isoformat(), t.from_address, t.to_address, t.asset, format(t.amount, "f")] for t in transfers]

	return {"truncated": history.truncated, "transfers": rows(history.transfers), "native": rows(history.native_transfers)}


def _deserialize(chain: str, address: str, payload: dict) -> NormalizedHistory:
	def transfers(rows):
		return [NormalizedTransfer(chain, h, datetime.fromisoformat(ts), f, t, asset, Decimal(amount)) for h, ts, f, t, asset, amount in rows]

	return NormalizedHistory(
		chain=chain,
		address=address,
		truncated=payload.get("truncated", False),
		transfers=transfers(payload.get("transfers", [])),
		native_transfers=transfers(payload.get("native", [])),
	)


async def history(db: AsyncSession, chain: str, address: str) -> tuple[NormalizedHistory | None, str | None]:
	"""Cached counterparty history; returns (None, reason) when the chain source is unavailable."""
	ttl = timedelta(seconds=get_settings().history_cache_seconds)
	cached = await db.get(HistoryCache, (chain, address))
	now = datetime.now(timezone.utc)
	if cached and now - _aware(cached.fetched_at) < ttl:
		return _deserialize(chain, address, cached.payload), None
	try:
		fresh = await adapter_for(chain).counterparty_history(address)
	except AdapterUnavailable as exc:
		if cached:  # stale data beats no data
			return _deserialize(chain, address, cached.payload), None
		return None, str(exc)
	payload = _serialize(fresh)
	if cached:
		cached.payload, cached.fetched_at = payload, now
	else:
		db.add(HistoryCache(chain=chain, address=address, payload=payload, fetched_at=now))
	return fresh, None


def _aware(value: datetime) -> datetime:
	return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def public_flags(db: AsyncSession, chain: str, addresses: set[str]) -> dict[str, str]:
	if not addresses:
		return {}
	found: dict[str, str] = {}
	ordered = sorted(addresses)
	for i in range(0, len(ordered), 500):
		rows = await db.execute(
			select(FlaggedAddress.address, FlaggedAddress.source).where(
				FlaggedAddress.chain == chain,
				FlaggedAddress.active.is_(True),
				FlaggedAddress.address.in_(ordered[i : i + 500]),
			)
		)
		found.update(dict(rows.all()))
	return found


async def token_security(chain: str, contract: str) -> tuple[dict | None, str | None]:
	settings = get_settings()
	headers = {"Authorization": settings.goplus_api_key} if settings.goplus_api_key else {}
	try:
		async with httpx.AsyncClient(timeout=settings.http_timeout_seconds, headers=headers) as http:
			response = await http.get(
				f"{settings.goplus_url.rstrip('/')}/api/v1/token_security/{chain}", params={"contract_addresses": contract}
			)
			response.raise_for_status()
			body = response.json()
	except (httpx.HTTPError, ValueError, TimeoutError, OSError) as exc:
		return None, f"GoPlus unavailable: {type(exc).__name__}"
	report = (body.get("result") or {}).get(contract) or (body.get("result") or {}).get(contract.lower())
	return (report, None) if report else (None, "GoPlus has no data for this token")
