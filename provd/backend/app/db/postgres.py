from collections.abc import AsyncGenerator

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.base import Base

settings = get_settings()

def _engine_options() -> dict:
    """A pooled engine per process; behind PgBouncer (transaction mode) the bouncer pools instead."""
    if settings.db_pgbouncer:
        # PgBouncer in transaction mode can't keep prepared statements across transactions.
        return {"poolclass": pool.NullPool, "connect_args": {"statement_cache_size": 0, "prepared_statement_cache_size": 0}}
    if not settings.database_url.startswith("postgresql"):
        return {}
    return {
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_recycle": settings.db_pool_recycle_seconds,
        "pool_timeout": settings.db_pool_timeout_seconds,
    }


_engine = create_async_engine(settings.database_url, pool_pre_ping=True, **_engine_options())
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
