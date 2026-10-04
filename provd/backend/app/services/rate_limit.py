"""Fixed-window rate limiting.

Backends: in-memory (one process) or Redis (shared across instances; required in production). If Redis is
unreachable, counting falls back to memory for that process rather than failing open.

Keys:
  public:<ip>           every unauthenticated endpoint (PUBLIC_RATE_LIMIT_PER_MINUTE)
  scanner:<ip>          the public counterparty check (SCANNER_RATE_LIMIT_PER_MINUTE)
  key:<api key id>      every authenticated call made with an API key (API_KEY_RATE_LIMIT_PER_MINUTE)
  sub:<token subject>   every authenticated call made with a bearer token
  badauth:<ip>          failed API keys / bearer tokens (INVALID_CREDENTIALS_PER_MINUTE)
  auth:<ip>             token requests (AUTH_RATE_LIMIT_PER_MINUTE)
  lockout:<client>:<ip> failed client logins (AUTH_LOCKOUT_FAILURES per AUTH_LOCKOUT_MINUTES)
  webhook:<ip>          inbound webhooks (WEBHOOK_RATE_LIMIT_PER_MINUTE)
  global:<ip>           every request, as flood protection (GLOBAL_RATE_LIMIT_PER_MINUTE)
"""
import ipaddress
import logging
import time
from collections.abc import Callable

from fastapi import HTTPException, Request, status

from app.config import get_settings

logger = logging.getLogger(__name__)


class _MemoryWindow:
	def __init__(self) -> None:
		self._counts: dict[str, tuple[int, int]] = {}

	async def hit(self, key: str, window_seconds: int, amount: int = 1) -> int:
		window = int(time.time() // window_seconds)
		current_window, count = self._counts.get(key, (window, 0))
		count = count + amount if current_window == window else amount
		self._counts[key] = (window, count)
		if len(self._counts) > 50_000:  # bound memory under a flood of distinct keys
			self._counts = {k: v for k, v in self._counts.items() if v[0] == window}
		return count


class _RedisWindow:
	def __init__(self) -> None:
		self._fallback = _MemoryWindow()
		self._warned = False

	async def hit(self, key: str, window_seconds: int, amount: int = 1) -> int:
		from app.services.cache import _redis_client

		window_key = f"rl:{key}:{int(time.time() // window_seconds)}"
		try:
			pipe = _redis_client.pipeline()
			pipe.incrby(window_key, amount)
			pipe.expire(window_key, window_seconds + 1)
			count, _ = await pipe.execute()
			self._warned = False
			return int(count)
		except Exception:  # noqa: BLE001 - never fail open because Redis is down
			if not self._warned:
				logger.warning("rate_limit.redis_unavailable falling back to in-memory counters")
				self._warned = True
			return await self._fallback.hit(key, window_seconds, amount)


_backend: _MemoryWindow | _RedisWindow | None = None


def _get_backend() -> _MemoryWindow | _RedisWindow:
	global _backend
	if _backend is None:
		_backend = _RedisWindow() if get_settings().effective_rate_limit_backend == "redis" else _MemoryWindow()
	return _backend


def reset_rate_limits() -> None:
	global _backend
	_backend = None


def _valid_ip(value: str) -> str | None:
	try:
		return str(ipaddress.ip_address(value.strip()))
	except ValueError:
		return None


def client_ip(request: Request) -> str:
	"""The caller's IP. Proxy headers are only used when TRUST_PROXY_HEADERS is set, and never the
	leftmost X-Forwarded-For entry (which the client controls)."""
	settings = get_settings()
	if settings.trust_proxy_headers:
		if settings.client_ip_header:
			ip = _valid_ip(request.headers.get(settings.client_ip_header, ""))
			if ip:
				return ip
		forwarded = [p for p in (request.headers.get("X-Forwarded-For") or "").split(",") if p.strip()]
		if len(forwarded) >= settings.trusted_proxy_hops:
			ip = _valid_ip(forwarded[-settings.trusted_proxy_hops])
			if ip:
				return ip
	return request.client.host if request.client else "unknown"


def _too_many(window_seconds: int, detail: str = "Too many requests. Please try again shortly.") -> HTTPException:
	retry = window_seconds - int(time.time()) % window_seconds
	return HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail, headers={"Retry-After": str(max(1, retry))})


async def enforce(key: str, limit: int, window_seconds: int) -> int:
	count = await _get_backend().hit(key, window_seconds)
	if count > limit:
		raise _too_many(window_seconds)
	return count


async def current(key: str, window_seconds: int) -> int:
	"""Current count without adding to it."""
	return await _get_backend().hit(key, window_seconds, amount=0)


def rate_limit(name: str, limit: Callable[[], int], window_seconds: int):
	async def _dependency(request: Request) -> None:
		await enforce(f"{name}:{client_ip(request)}", limit(), window_seconds)

	return _dependency


public_limit = rate_limit("public", lambda: get_settings().public_rate_limit_per_minute, 60)
webhook_limit = rate_limit("webhook", lambda: get_settings().webhook_rate_limit_per_minute, 60)
auth_limit = rate_limit("auth", lambda: get_settings().auth_rate_limit_per_minute, 60)


async def guard_bad_credentials(ip: str) -> None:
	"""Refuse early (before any database lookup) once an IP has sent too many bad credentials."""
	if await current(f"badauth:{ip}", 60) >= get_settings().invalid_credentials_per_minute:
		raise _too_many(60, "Too many failed authentication attempts. Please try again shortly.")


async def record_bad_credentials(ip: str) -> None:
	await _get_backend().hit(f"badauth:{ip}", 60)


def _lockout_key(client_id: str, ip: str) -> str:
	return f"lockout:{client_id[:64]}:{ip}"


async def check_login_lockout(client_id: str, ip: str) -> None:
	settings = get_settings()
	window = settings.auth_lockout_minutes * 60
	if await current(_lockout_key(client_id, ip), window) >= settings.auth_lockout_failures:
		raise _too_many(window, "Too many failed sign-in attempts. Try again later.")


async def record_login_failure(client_id: str, ip: str) -> None:
	settings = get_settings()
	await _get_backend().hit(_lockout_key(client_id, ip), settings.auth_lockout_minutes * 60)
