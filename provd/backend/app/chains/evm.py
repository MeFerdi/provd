"""Minimal async EVM JSON-RPC client: batched eth_call with endpoint fallback.

Posture reads are hundreds of independent view calls, so they go out as JSON-RPC batches. Endpoints
come from config and are tried in order; a batch that fails on one endpoint is retried on the next.
"""
import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx
from eth_abi import decode, encode
from eth_utils import keccak

logger = logging.getLogger("provd.rpc")

ZERO_ADDRESS = "0x" + "0" * 40


class RpcError(RuntimeError):
	"""Every configured endpoint failed for a request."""


@dataclass(frozen=True)
class Call:
	to: str
	signature: str
	arg_types: tuple[str, ...] = ()
	args: tuple[Any, ...] = ()
	returns: tuple[str, ...] = ()

	def data(self) -> str:
		selector = keccak(text=self.signature)[:4]
		return "0x" + (selector + encode(list(self.arg_types), list(self.args))).hex()


class CallFailed:
	"""Placeholder for a call that reverted or returned undecodable data."""

	def __init__(self, reason: str) -> None:
		self.reason = reason

	def __bool__(self) -> bool:
		return False

	def __repr__(self) -> str:
		return f"CallFailed({self.reason!r})"


class EvmClient:
	def __init__(self, urls: list[str], timeout: float = 20.0, batch_size: int = 50, concurrency: int = 4) -> None:
		if not urls:
			raise ValueError("At least one RPC URL is required")
		self._urls = urls
		self._timeout = timeout
		self._batch_size = batch_size
		self._semaphore = asyncio.Semaphore(concurrency)

	async def _post(self, payload: Any) -> Any:
		last: Exception | None = None
		async with httpx.AsyncClient(timeout=self._timeout) as http:
			for url in self._urls:
				for attempt in range(3):
					try:
						response = await http.post(url, json=payload)
						if response.status_code == 429:
							# Public endpoints rate-limit bursts; back off before retrying or moving on.
							retry_after = response.headers.get("Retry-After", "")
							await asyncio.sleep(float(retry_after) if retry_after.isdigit() else 2.0 * (attempt + 1))
						response.raise_for_status()
						return response.json()
					except (httpx.HTTPError, ValueError) as exc:
						last = exc
						await asyncio.sleep(0.5 * (attempt + 1))
				logger.warning("rpc.endpoint_failed host=%s error=%s", httpx.URL(url).host, type(last).__name__)
		raise RpcError(f"All RPC endpoints failed: {type(last).__name__}")

	async def request(self, method: str, params: list) -> Any:
		body = await self._post({"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
		if "error" in body:
			raise RpcError(str(body["error"].get("message", body["error"])))
		return body.get("result")

	async def get_code(self, address: str) -> str:
		return await self.request("eth_getCode", [address, "latest"])

	async def call_many(self, calls: list[Call], block: str = "latest") -> list[Any]:
		"""Run view calls in concurrent batches; reverted calls come back as CallFailed rather than raising."""
		chunks = [calls[i : i + self._batch_size] for i in range(0, len(calls), self._batch_size)]
		results = await asyncio.gather(*(self._call_chunk(chunk, block) for chunk in chunks))
		return [item for chunk in results for item in chunk]

	async def _call_chunk(self, chunk: list[Call], block: str) -> list[Any]:
		payload = [
			{"jsonrpc": "2.0", "id": i, "method": "eth_call", "params": [{"to": c.to, "data": c.data()}, block]}
			for i, c in enumerate(chunk)
		]
		async with self._semaphore:
			body = await self._post(payload)
		if not isinstance(body, list):
			raise RpcError("RPC endpoint does not support batch requests")
		by_id = {item.get("id"): item for item in body}
		results: list[Any] = []
		for i, call in enumerate(chunk):
			item = by_id.get(i, {})
			if "error" in item or item.get("result") in (None, "0x"):
				results.append(CallFailed(str(item.get("error", {}).get("message", "empty result"))))
				continue
			try:
				decoded = decode(list(call.returns), bytes.fromhex(item["result"][2:]))
				results.append(decoded[0] if len(decoded) == 1 else decoded)
			except Exception as exc:  # noqa: BLE001 - malformed return data is a per-call failure
				results.append(CallFailed(f"decode: {exc}"))
		return results
