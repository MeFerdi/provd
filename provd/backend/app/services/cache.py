import json
from typing import Any

import redis.asyncio as redis

from app.config import get_settings

settings = get_settings()

_redis_client = redis.from_url(settings.redis_url, decode_responses=True)


async def get_cached(key: str) -> Any | None:
	value = await _redis_client.get(key)
	if value is None:
		return None
	try:
		return json.loads(value)
	except json.JSONDecodeError:
		_redis_client.delete(key)
		return None


async def set_cached(key: str, value: Any, ttl_seconds: int = 300) -> None:
	await _redis_client.setex(key, ttl_seconds, json.dumps(value, default=str))
