from collections.abc import AsyncGenerator

from neo4j import AsyncDriver, AsyncGraphDatabase

import asyncio
from collections.abc import AsyncGenerator

from neo4j import AsyncDriver, AsyncGraphDatabase

from app.config import get_settings

_driver: AsyncDriver | None = None
_driver_lock = asyncio.Lock()


async def _get_or_create_neo4j_driver() -> AsyncDriver:
    global _driver

    if _driver is not None:
        return _driver

    async with _driver_lock:
        if _driver is None:
            settings = get_settings()
            auth = (
                (settings.neo4j_user, settings.neo4j_password)
                if settings.neo4j_user
                else None
            )
            _driver = AsyncGraphDatabase.driver(settings.neo4j_uri, auth=auth)

    return _driver


async def get_neo4j_driver() -> AsyncGenerator[AsyncDriver, None]:
    yield await _get_or_create_neo4j_driver()


async def verify_neo4j() -> bool:
    driver = await _get_or_create_neo4j_driver()
    await driver.verify_connectivity()
    return True


async def close_neo4j() -> None:
    global _driver

    if _driver is None:
        return

    await _driver.close()
    _driver = None
