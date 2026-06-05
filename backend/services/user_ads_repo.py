"""User-posted car advertisements stored in pakwheels_listings."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from database_models import PakwheelsListing, User
from db import get_async_session_factory
from services.listings_repo import _row_to_dict, listing_dict_json_safe


USER_AD_SOURCE = "wheelwise"
USER_AD_SEARCH_URL = "wheelwise://user-ads"


def _user_ad_url(ad_id: int) -> str:
    return f"wheelwise://user-ad/{ad_id}"


async def create_user_ad(user: User, data: dict[str, Any]) -> dict[str, Any]:
    """Create a new user-posted listing."""
    now = datetime.now(timezone.utc)
    sf = get_async_session_factory()
    async with sf() as session:
        row = PakwheelsListing(
            url=f"wheelwise://user-ad/pending-{uuid4()}",
            title=data.get("title"),
            price=data.get("price"),
            city=data.get("city"),
            model_year=data.get("model_year"),
            transmission=data.get("transmission"),
            mileage=data.get("mileage"),
            description=data.get("description") or "",
            posted_time="Just now",
            source=USER_AD_SOURCE,
            source_search_url=USER_AD_SEARCH_URL,
            search_origin="user",
            created_at=now,
            updated_at=now,
            image_url=data.get("image_url"),
            user_id=user.id,
            enrichment_status="none",
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        row.url = _user_ad_url(row.id)
        row.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(row)
        return listing_dict_json_safe(_row_to_dict(row))


async def list_user_ads(user_id: int) -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        stmt = (
            select(PakwheelsListing)
            .where(
                PakwheelsListing.user_id == user_id,
                PakwheelsListing.source == USER_AD_SOURCE,
            )
            .order_by(PakwheelsListing.updated_at.desc())
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [listing_dict_json_safe(_row_to_dict(r)) for r in rows]


async def get_user_ad(user_id: int, ad_id: int) -> dict[str, Any] | None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(PakwheelsListing, ad_id)
        if row is None or row.user_id != user_id or row.source != USER_AD_SOURCE:
            return None
        return listing_dict_json_safe(_row_to_dict(row))


async def update_user_ad(user_id: int, ad_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(PakwheelsListing, ad_id)
        if row is None or row.user_id != user_id or row.source != USER_AD_SOURCE:
            return None

        for field in (
            "title", "price", "city", "model_year",
            "transmission", "mileage", "description", "image_url",
        ):
            if field in data:
                setattr(row, field, data[field])

        row.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(row)
        return listing_dict_json_safe(_row_to_dict(row))


async def delete_user_ad(user_id: int, ad_id: int) -> bool:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(PakwheelsListing, ad_id)
        if row is None or row.user_id != user_id or row.source != USER_AD_SOURCE:
            return False
        await session.delete(row)
        await session.commit()
        return True
