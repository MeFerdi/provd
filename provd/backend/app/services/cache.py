import json
from typing import Any

import redis

from app.config import get_settings

settings = get_settings()

_redis_client = redis.from_url(settings.redis_url, decode_responses=True)


def get_cached(key: str) -> Any | None:
	value = _redis_client.get(key)
	if value is None:
		return None
	return json.loads(value)


def set_cached(key: str, value: Any, ttl_seconds: int = 300) -> None:
	_redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
