"""AI sessions, saved searches, intent hashing."""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update

from database_models import AiSearchSession, PakwheelsListing, SavedSearch
from db import get_async_session_factory


def intent_hash_from_query(q: str) -> str:
    t = re.sub(r"\s+", " ", (q or "").strip().lower())
    return hashlib.sha256(t.encode("utf-8")).hexdigest()[:64]


async def create_ai_session(
    *,
    query_text: str,
    pakwheels_url: str,
    olx_url: str,
) -> AiSearchSession:
    """Close prior open sessions and create a new one; promote old AI listings to existing."""
    sf = get_async_session_factory()
    async with sf() as session:
        prior = await session.execute(select(AiSearchSession).where(AiSearchSession.status == "open"))
        for s in prior.scalars().all():
            s.status = "closed"
            await session.execute(
                update(PakwheelsListing)
                .where(PakwheelsListing.ai_session_id == s.id)
                .values(ai_session_id=None)
            )
        row = AiSearchSession(
            query_text=query_text,
            intent_hash=intent_hash_from_query(query_text),
            pakwheels_url=pakwheels_url,
            olx_url=olx_url,
            status="open",
            created_at=datetime.now(timezone.utc),
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return row


async def get_open_ai_session() -> AiSearchSession | None:
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(
            select(AiSearchSession).where(AiSearchSession.status == "open").order_by(AiSearchSession.id.desc()).limit(1)
        )
        return result.scalar_one_or_none()


async def find_saved_search_by_hash(h: str) -> SavedSearch | None:
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(SavedSearch).where(SavedSearch.intent_hash == h).limit(1))
        return result.scalar_one_or_none()


async def upsert_saved_search(
    *,
    label: str,
    nl_query: str,
    pakwheels_url: str,
    olx_url: str,
) -> SavedSearch:
    now = datetime.now(timezone.utc)
    h = intent_hash_from_query(nl_query)
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(SavedSearch).where(SavedSearch.intent_hash == h))
        row = result.scalar_one_or_none()
        if row:
            row.label = label
            row.nl_query = nl_query
            row.pakwheels_url = pakwheels_url
            row.olx_url = olx_url
            row.updated_at = now
        else:
            row = SavedSearch(
                label=label,
                nl_query=nl_query,
                intent_hash=h,
                pakwheels_url=pakwheels_url,
                olx_url=olx_url,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        await session.commit()
        await session.refresh(row)
        return row


async def list_saved_searches() -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(SavedSearch).order_by(SavedSearch.updated_at.desc()))
        rows = result.scalars().all()
        return [
            {
                "id": r.id,
                "label": r.label,
                "nl_query": r.nl_query,
                "intent_hash": r.intent_hash,
                "pakwheels_url": r.pakwheels_url,
                "olx_url": r.olx_url,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ]


async def delete_saved_search(sid: int) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(SavedSearch, sid)
        if row:
            await session.delete(row)
            await session.commit()
