from collections.abc import AsyncGenerator

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.base import Base

settings = get_settings()

_engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    poolclass=pool.NullPool,
)
_session_factory = async_sessionmaker(_engine, expire_on_commit=False)


def get_postgres_engine():
    return _engine


async def get_postgres_session() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session


async def init_postgres() -> None:
    """Create tables for local/dev usage when migrations are not applied yet."""
    async with _engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def close_postgres() -> None:
    await _engine.dispose()


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return _session_factory
