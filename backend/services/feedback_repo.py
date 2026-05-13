"""Relevance feedback for prompt augmentation."""

from __future__ import annotations

from sqlalchemy import select

from database_models import FeedbackEvent
from db import get_async_session_factory
from services.search_sessions_repo import intent_hash_from_query


async def feedback_digest_for_query(query: str, limit: int = 5) -> str:
    h = intent_hash_from_query(query)
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(
            select(FeedbackEvent)
            .where(FeedbackEvent.intent_hash == h, FeedbackEvent.relevant.is_(False))
            .order_by(FeedbackEvent.created_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
    if not rows:
        return ""
    lines = [f"- {(r.query_snapshot or '')[:200]}" for r in rows]
    return "\n".join(lines)


async def add_feedback(
    *,
    listing_id: int | None,
    intent_hash: str,
    query_snapshot: str,
    relevant: bool,
) -> None:
    from datetime import datetime, timezone

    sf = get_async_session_factory()
    async with sf() as session:
        session.add(
            FeedbackEvent(
                listing_id=listing_id,
                intent_hash=intent_hash,
                query_snapshot=query_snapshot,
                relevant=relevant,
                created_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()
