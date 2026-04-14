from collections.abc import AsyncGenerator

from neo4j import AsyncDriver, AsyncGraphDatabase

from app.config import get_settings

settings = get_settings()

_auth = (settings.neo4j_user, settings.neo4j_password) if settings.neo4j_user else None
_driver: AsyncDriver = AsyncGraphDatabase.driver(settings.neo4j_uri, auth=_auth)


async def get_neo4j_driver() -> AsyncGenerator[AsyncDriver, None]:
    yield _driver


async def verify_neo4j() -> bool:
    await _driver.verify_connectivity()
    return True


async def close_neo4j() -> None:
    await _driver.close()
