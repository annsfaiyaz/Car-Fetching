"""Persist PakWheels listings in SQLite with upserts keyed by canonical listing URL."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, or_, select

from database_models import META_KEY_PAKWHEELS_SYNC, AppMeta, PakwheelsListing
from db import get_async_session_factory


def norm_listing_url(url: str | None) -> str:
    if not url:
        return ""
    return url.strip().split("#")[0].rstrip("/")


def norm_search_url(url: str | None) -> str:
    """Normalize PakWheels search URL for storage and filtering."""
    if not url:
        return ""
    u = url.strip().split("#")[0].rstrip("/")
    if u and not u.lower().startswith(("http://", "https://")):
        u = "https://" + u
    return u


def _row_to_dict(row: PakwheelsListing) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "url": row.url,
        "title": row.title,
        "price": row.price,
        "city": row.city,
        "model_year": row.model_year,
        "transmission": row.transmission,
        "mileage": row.mileage,
        "description": row.description or "",
        "posted_time": row.posted_time,
        "source": row.source,
        "source_search_url": row.source_search_url or "",
        "search_origin": row.search_origin,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def listing_dict_json_safe(row: dict[str, Any]) -> dict[str, Any]:
    """Listing row dict with ``datetime`` fields converted for ``json.dumps`` / WebSocket."""
    out = dict(row)
    for key in ("created_at", "updated_at"):
        v = out.get(key)
        if isinstance(v, datetime):
            if getattr(v, "tzinfo", None) is None:
                v = v.replace(tzinfo=timezone.utc)
            out[key] = v.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return out


async def fetch_all_listings(
    search_url: str | None = None,
    search_urls: list[str] | None = None,
) -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        stmt = select(PakwheelsListing).order_by(PakwheelsListing.updated_at.desc())
        if search_urls:
            norms = [norm_search_url(u) for u in search_urls if u]
            norms = list(dict.fromkeys([n for n in norms if n]))
            if norms:
                stmt = stmt.where(
                    or_(*[PakwheelsListing.source_search_url == n for n in norms]),
                )
        elif search_url:
            stmt = stmt.where(PakwheelsListing.source_search_url == search_url)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [_row_to_dict(r) for r in rows]


async def count_listings() -> int:
    sf = get_async_session_factory()
    async with sf() as session:
        n = await session.scalar(select(func.count()).select_from(PakwheelsListing))
        return int(n or 0)


async def get_sync_meta() -> dict[str, Any]:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(AppMeta, META_KEY_PAKWHEELS_SYNC)
        if row is None:
            return {}
        return {"at": row.at, "last_error": row.last_error}


async def set_sync_success(at: datetime) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(AppMeta, META_KEY_PAKWHEELS_SYNC)
        if row is None:
            row = AppMeta(key=META_KEY_PAKWHEELS_SYNC, at=at, last_error=None)
            session.add(row)
        else:
            row.at = at
            row.last_error = None
        await session.commit()


def _listing_market_source(raw: dict[str, Any]) -> str:
    s = (raw.get("source") or "pakwheels").strip().lower()
    return s if s in ("pakwheels", "olx") else "pakwheels"


async def upsert_one_listing(
    raw: dict[str, Any],
    source_search_url: str,
    *,
    search_origin: str = "url",
) -> tuple[dict[str, Any], str]:
    """
    Insert or update a single scraped row. Does **not** update ``AppMeta`` sync time — caller must call
    ``set_sync_success`` after the full scrape batch.

    Returns ``(row_dict, "upserted" | "modified")``.
    """
    src = norm_search_url(source_search_url)
    if not src:
        raise ValueError("source_search_url is required")
    origin = search_origin if search_origin in ("ai", "url") else "url"
    market = _listing_market_source(raw)
    now = datetime.now(timezone.utc)

    sf = get_async_session_factory()
    async with sf() as session:
        url = norm_listing_url(raw.get("url"))
        if not url:
            raise ValueError("listing url is required")

        existing = await session.scalar(select(PakwheelsListing).where(PakwheelsListing.url == url))
        if existing:
            existing.title = raw.get("title")
            existing.price = raw.get("price")
            existing.city = raw.get("city")
            existing.model_year = raw.get("model_year")
            existing.transmission = raw.get("transmission")
            existing.mileage = raw.get("mileage")
            existing.description = raw.get("description") or ""
            existing.posted_time = raw.get("posted_time")
            existing.source = market
            existing.source_search_url = src
            existing.search_origin = origin
            existing.updated_at = now
            kind = "modified"
        else:
            session.add(
                PakwheelsListing(
                    url=url,
                    title=raw.get("title"),
                    price=raw.get("price"),
                    city=raw.get("city"),
                    model_year=raw.get("model_year"),
                    transmission=raw.get("transmission"),
                    mileage=raw.get("mileage"),
                    description=raw.get("description") or "",
                    posted_time=raw.get("posted_time"),
                    source=market,
                    source_search_url=src,
                    search_origin=origin,
                    created_at=now,
                    updated_at=now,
                )
            )
            kind = "upserted"

        await session.commit()

        row = await session.scalar(select(PakwheelsListing).where(PakwheelsListing.url == url))
        if row is None:
            raise RuntimeError("upsert committed but row missing")
        return _row_to_dict(row), kind


async def set_sync_error(message: str) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(AppMeta, META_KEY_PAKWHEELS_SYNC)
        if row is None:
            row = AppMeta(key=META_KEY_PAKWHEELS_SYNC, at=None, last_error=message)
            session.add(row)
        else:
            row.last_error = message
        await session.commit()
