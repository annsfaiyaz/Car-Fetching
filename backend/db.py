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

    async def _try_alter(sql: str) -> None:
        try:
            async with _engine.begin() as conn:
                await conn.execute(text(sql))
        except Exception as e:
            err = str(e).lower()
            if "duplicate column" in err or "already exists" in err:
                return
            raise

    legacy_alters = [
        "ALTER TABLE users ADD COLUMN full_name VARCHAR(256)",
        "ALTER TABLE users ADD COLUMN account_type VARCHAR(32) DEFAULT 'buyer'",
        "ALTER TABLE users ADD COLUMN role VARCHAR(16) DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1",
        "ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP",
        "ALTER TABLE pakwheels_listings ADD COLUMN search_origin VARCHAR(16)",
        "ALTER TABLE pakwheels_listings ADD COLUMN image_url VARCHAR(2048)",
        "ALTER TABLE pakwheels_listings ADD COLUMN spam_score FLOAT",
        "ALTER TABLE pakwheels_listings ADD COLUMN is_spam BOOLEAN DEFAULT 0",
        "ALTER TABLE pakwheels_listings ADD COLUMN spam_reason TEXT",
        "ALTER TABLE pakwheels_listings ADD COLUMN ai_session_id INTEGER",
        "ALTER TABLE pakwheels_listings ADD COLUMN enrichment_status VARCHAR(32) DEFAULT 'none'",
        "ALTER TABLE pakwheels_listings ADD COLUMN ai_market_price_note TEXT",
        "ALTER TABLE pakwheels_listings ADD COLUMN ai_fuel_avg_note TEXT",
        "ALTER TABLE pakwheels_listings ADD COLUMN user_hidden BOOLEAN DEFAULT 0",
        "ALTER TABLE pakwheels_listings ADD COLUMN detail_html_snippet TEXT",
        "ALTER TABLE pakwheels_listings ADD COLUMN detail_fetched_at TIMESTAMP",
        "ALTER TABLE pakwheels_listings ADD COLUMN user_id INTEGER",
        "ALTER TABLE showroom_profiles ADD COLUMN contact_phone VARCHAR(32)",
        "ALTER TABLE showroom_profiles ADD COLUMN description TEXT",
        "ALTER TABLE showroom_profiles ADD COLUMN logo_url VARCHAR(2048)",
        "ALTER TABLE showroom_profiles ADD COLUMN is_active BOOLEAN DEFAULT 1",
    ]
    for sql in legacy_alters:
        await _try_alter(sql)


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
