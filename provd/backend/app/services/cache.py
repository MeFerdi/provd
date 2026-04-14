from datetime import datetime, timedelta, timezone
from typing import Any

_CACHE: dict[str, tuple[Any, datetime]] = {}


def get_cached(key: str) -> Any | None:
	record = _CACHE.get(key)
	if not record:
		return None

	value, expires_at = record
	if datetime.now(timezone.utc) >= expires_at:
		_CACHE.pop(key, None)
		return None

	return value


def set_cached(key: str, value: Any, ttl_seconds: int = 300) -> None:
	expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
	_CACHE[key] = (value, expires_at)
