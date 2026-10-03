"""Fixed-window rate limiting for the public, unauthenticated endpoints."""
import time
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.config import get_settings


class _MemoryWindow:
	def __init__(self) -> None:
		self._counts: dict[str, tuple[int, int]] = {}

	async def hit(self, key: str, window_seconds: int) -> int:
		window = int(time.time() // window_seconds)
		current_window, count = self._counts.get(key, (window, 0))
		count = count + 1 if current_window == window else 1
		self._counts[key] = (window, count)
		if len(self._counts) > 50_000:  # crude bound so a flood of distinct IPs can't grow memory forever
			self._counts = {k: v for k, v in self._counts.items() if v[0] == window}
		return count


class _RedisWindow:
	async def hit(self, key: str, window_seconds: int) -> int:
		from app.services.cache import _redis_client

		window_key = f"rl:{key}:{int(time.time() // window_seconds)}"
		count = await _redis_client.incr(window_key)
		if count == 1:
			await _redis_client.expire(window_key, window_seconds)
		return count


_backend: _MemoryWindow | _RedisWindow | None = None


def _get_backend() -> _MemoryWindow | _RedisWindow:
	global _backend
	if _backend is None:
		_backend = _RedisWindow() if get_settings().rate_limit_backend == "redis" else _MemoryWindow()
	return _backend


def reset_rate_limits() -> None:
	global _backend
	_backend = None


def client_ip(request: Request) -> str:
	if get_settings().trust_proxy_headers:
		forwarded = request.headers.get("X-Forwarded-For")
		if forwarded:
			return forwarded.split(",")[0].strip()
	return request.client.host if request.client else "unknown"


async def enforce(key: str, limit: int, window_seconds: int) -> None:
	if await _get_backend().hit(key, window_seconds) > limit:
		raise HTTPException(
			status_code=status.HTTP_429_TOO_MANY_REQUESTS,
			detail="Too many requests. Please try again shortly.",
			headers={"Retry-After": str(window_seconds)},
		)


def rate_limit(name: str, limit: Callable[[], int], window_seconds: int):
	async def _dependency(request: Request) -> None:
		await enforce(f"{name}:{client_ip(request)}", limit(), window_seconds)

	return _dependency
