"""NL search planning, saved searches, sessions."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import settings_repo
from services.listings_repo import fetch_all_listings, get_url_cache_age_hours, listing_dict_json_safe, norm_search_url
from services.ollama_olx import suggest_olx_search_url
from services.ollama_pakwheels import suggest_pakwheels_search_url
from services.search_sessions_repo import (
    create_ai_session,
    delete_saved_search,
    find_saved_search_by_hash,
    intent_hash_from_query,
    list_saved_searches,
    upsert_saved_search,
)
import asyncio

router = APIRouter(prefix="/api/search", tags=["search"])


class PlanBody(BaseModel):
    query: str = Field(..., min_length=3, max_length=4000)
    ai_prompt: str | None = None
    model: str | None = None
    force_ai_urls: bool = Field(False, description="Skip cache and always ask LLM for URLs")


class SessionStartBody(BaseModel):
    query: str
    pakwheels_url: str
    olx_url: str


# Cache freshness thresholds (hours)
_CACHE_FRESH_HOURS = 6.0   # Under this → skip scrape entirely (serve from cache)
_CACHE_STALE_HOURS = 48.0  # Over this → treat as no useful cache (full foreground scrape)
# Between fresh and stale → show cache immediately + background refresh


@router.post("/plan")
async def plan_search(body: PlanBody):
    """Resolve URLs, check cache freshness, and return the right scrape strategy.

    Three outcomes for the caller:
    - skip_scrape=True              → fresh cache, show it, no scrape needed
    - stale_cache=True              → stale cache returned, caller shows it then refreshes silently
    - skip_scrape=False, stale=False → no usable cache, run a full foreground scrape
    """
    q = body.query.strip()
    h = intent_hash_from_query(q)
    threshold = int(await settings_repo.get_setting("search.cache_min_listings", 3) or 3)

    # ── Step 1: resolve URLs ──────────────────────────────────────────────────
    saved = await find_saved_search_by_hash(h)
    url_pw = url_ox = ""
    raw_pw = raw_ox = model_pw = model_ox = ""

    if saved and not body.force_ai_urls:
        # Shortcut: reuse previously saved URLs for this intent
        url_pw = saved.pakwheels_url
        url_ox = saved.olx_url
    else:
        try:
            url_pw, raw_pw, model_pw = await suggest_pakwheels_search_url(
                user_query=q,
                ai_prompt=body.ai_prompt,
                model_override=body.model,
            )
            url_ox, raw_ox, model_ox = await suggest_olx_search_url(
                user_query=q,
                ai_prompt=body.ai_prompt,
                model_override=body.model,
            )
        except Exception as e:
            raise HTTPException(422, detail=str(e)) from e

        # Auto-save the resolved URLs so every future user with the same intent
        # reuses the exact same URLs (prevents mismatched cache lookups for User B, C, …)
        if url_pw or url_ox:
            asyncio.create_task(upsert_saved_search(
                label=q[:120],
                nl_query=q,
                pakwheels_url=url_pw,
                olx_url=url_ox,
            ))

    # ── Step 2: check cache freshness for the resolved URLs ───────────────────
    urls = [u for u in (norm_search_url(url_pw), norm_search_url(url_ox)) if u]
    cache_age_hours: float | None = await get_url_cache_age_hours(urls) if urls else None

    skip_scrape = False
    stale_cache = False
    cached_items: list[dict[str, Any]] = []

    if (
        not body.force_ai_urls
        and cache_age_hours is not None
        and cache_age_hours <= _CACHE_STALE_HOURS
    ):
        raw_items = await fetch_all_listings(
            search_urls=urls,
            hide_spam=True,
            include_hidden=False,
        )
        if len(raw_items) >= threshold:
            cached_items = raw_items
            if cache_age_hours <= _CACHE_FRESH_HOURS:
                skip_scrape = True   # Fresh — no scrape needed
            else:
                stale_cache = True   # Stale — show cache + background refresh

    return {
        "intent_hash": h,
        "skip_scrape": skip_scrape,
        "stale_cache": stale_cache,
        "cache_age_hours": round(cache_age_hours, 1) if cache_age_hours is not None else None,
        "cached_items": [listing_dict_json_safe(x) for x in cached_items[:50]],
        "cached_count": len(cached_items),
        "suggested_url": url_pw,
        "olx_url": url_ox,
        "model": model_pw,
        "olx_model": model_ox,
        "raw_reply_preview": raw_pw[:1200] if raw_pw else "",
        "olx_raw_reply_preview": raw_ox[:1200] if raw_ox else "",
        "saved_search_hit": saved is not None,
    }


@router.post("/session")
async def start_session(body: SessionStartBody):
    sess = await create_ai_session(
        query_text=body.query.strip(),
        pakwheels_url=norm_search_url(body.pakwheels_url),
        olx_url=norm_search_url(body.olx_url),
    )
    return {"session_id": sess.id}


@router.get("/sessions/sidebar")
async def sidebar():
    return {"items": await list_saved_searches()}


class SavedBody(BaseModel):
    label: str = Field(..., max_length=512)
    nl_query: str
    pakwheels_url: str
    olx_url: str


@router.post("/saved")
async def save_sidebar(body: SavedBody):
    row = await upsert_saved_search(
        label=body.label,
        nl_query=body.nl_query,
        pakwheels_url=body.pakwheels_url,
        olx_url=body.olx_url,
    )
    return {"id": row.id}


@router.delete("/saved/{saved_id}")
async def remove_saved(saved_id: int):
    await delete_saved_search(saved_id)
    return {"ok": True}
