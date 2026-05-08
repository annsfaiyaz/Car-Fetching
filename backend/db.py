"""SQLite database (async) using SQLAlchemy 2 + aiosqlite."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from database_models import Base

_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker | None = None


def _default_sqlite_url() -> str:
    """File under backend/data/car_listings.db unless SQLITE_DATABASE_URL is set."""
    raw = os.environ.get("SQLITE_DATABASE_URL")
    if raw:
        return raw
    data_dir = Path(__file__).resolve().parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    db_path = data_dir / "car_listings.db"
    return f"sqlite+aiosqlite:///{db_path.resolve()}"


async def connect_db() -> None:
    """Create engine, tables, and session factory."""
    global _engine, _async_session_factory

    url = _default_sqlite_url()
    kw: dict = {
        "echo": os.environ.get("SQL_ECHO", "").lower() in ("1", "true", "yes"),
    }
    if ":memory:" in url:
        kw["poolclass"] = StaticPool
        kw["connect_args"] = {"check_same_thread": False}

    _engine = create_async_engine(url, **kw)
    _async_session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with _engine.begin() as conn:
            await conn.execute(
                text("ALTER TABLE pakwheels_listings ADD COLUMN search_origin VARCHAR(16)")
            )
    except Exception as e:
        err = str(e).lower()
        if "duplicate column" not in err and "already exists" not in err:
            raise


async def close_db() -> None:
    global _engine, _async_session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _async_session_factory = None


def get_async_session_factory() -> async_sessionmaker:
    if _async_session_factory is None:
        raise RuntimeError("Database not initialized; call connect_db() during startup.")
    return _async_session_factory


def get_engine() -> AsyncEngine:
    if _engine is None:
        raise RuntimeError("Database not initialized; call connect_db() during startup.")
    return _engine
