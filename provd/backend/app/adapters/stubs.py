"""Documented stubs for chains on the roadmap. Each raises NotImplementedError so a mis-wired call
fails loudly; the evaluate API returns `not_yet_supported` for these chains before reaching them.

- StellarAdapter: Horizon (`/accounts/{id}/payments`, `/operations`); assets are code+issuer.
- EvmAdapter: ERC-20 Transfer logs via an archive-capable RPC or indexer.
"""
from app.adapters.base import NormalizedAsset, NormalizedEvent, NormalizedHistory


class _Stub:
	chain = "stub"

	def validate_address(self, address: str) -> str:
		raise NotImplementedError(f"{self.chain} adapter is not implemented yet")

	async def fetch_events(self, cursor: str | None) -> tuple[list[NormalizedEvent], str | None]:
		raise NotImplementedError(f"{self.chain} adapter is not implemented yet")

	async def counterparty_history(self, address: str) -> NormalizedHistory:
		raise NotImplementedError(f"{self.chain} adapter is not implemented yet")

	async def asset_metadata(self, asset_ref: str) -> NormalizedAsset | None:
		raise NotImplementedError(f"{self.chain} adapter is not implemented yet")


class StellarAdapter(_Stub):
	chain = "stellar"


class EvmAdapter(_Stub):
	chain = "evm"
