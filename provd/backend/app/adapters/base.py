"""Chain adapters translate chain-native data into these normalized types.

The signal engine imports ONLY this module from the adapter layer (enforced by
tests/test_import_boundaries.py), so adding a chain never touches scoring code.
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Protocol


class AdapterUnavailable(RuntimeError):
	"""The upstream data source failed; callers degrade instead of failing the request."""


class InvalidAddress(ValueError):
	pass


@dataclass(frozen=True)
class NormalizedTransfer:
	chain: str
	tx_hash: str
	timestamp: datetime
	from_address: str
	to_address: str
	asset: str
	amount: Decimal


@dataclass(frozen=True)
class NormalizedEvent:
	"""A chain event the indexer stores, e.g. an issuer freezing an address."""

	chain: str
	kind: str  # "address_frozen" | "address_unfrozen"
	address: str
	tx_hash: str
	timestamp: datetime
	source: str


@dataclass
class NormalizedHistory:
	chain: str
	address: str
	transfers: list[NormalizedTransfer] = field(default_factory=list)  # stablecoin transfers (counted in volumes)
	truncated: bool = False  # True when only the most recent N transfers (or a recent window) were read
	native_transfers: list[NormalizedTransfer] = field(default_factory=list)  # gas-token transfers (e.g. SOL), not in volumes

	@property
	def counterparties(self) -> set[str]:
		return {t.to_address if t.from_address == self.address else t.from_address for t in self.transfers}

	@property
	def first_seen(self) -> datetime | None:
		return min((t.timestamp for t in self.transfers), default=None)

	@property
	def last_seen(self) -> datetime | None:
		return max((t.timestamp for t in self.transfers), default=None)

	def volume(self, direction: str) -> Decimal:
		if direction == "in":
			return sum((t.amount for t in self.transfers if t.to_address == self.address), Decimal(0))
		return sum((t.amount for t in self.transfers if t.from_address == self.address), Decimal(0))


@dataclass(frozen=True)
class NormalizedAsset:
	chain: str
	ref: str
	symbol: str
	decimals: int
	issuer: str | None = None
	well_known: bool = False


class ChainAdapter(Protocol):
	chain: str

	def validate_address(self, address: str) -> str: ...

	async def fetch_events(self, cursor: str | None) -> tuple[list[NormalizedEvent], str | None]: ...

	async def counterparty_history(self, address: str) -> NormalizedHistory: ...

	async def asset_metadata(self, asset_ref: str) -> NormalizedAsset | None: ...
