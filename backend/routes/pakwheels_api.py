"""PakWheels scraper API: configurable search URL, SQLite upserts, filter listings by source URL."""

from __future__ import annotations

import asyncio
import logging
import os
import traceback
from datetime import datetime, timezone
from queue import SimpleQueue
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, field_validator

from services import settings_repo
from services.listings_repo import (
    count_listings,
    fetch_all_listings,
    get_sync_meta,
    listing_dict_json_safe,
    norm_search_url,
    set_listing_spam,
    set_sync_error,
    set_sync_success,
    upsert_one_listing,
)
from services.ollama_chat import build_listings_snapshot, chat_with_listings_context
from services.ollama_olx import suggest_olx_search_url
from services.ollama_pakwheels import suggest_pakwheels_search_url
from services.scrape_olx import scrape_olx
from services.scrape_pakwheels import resolve_max_pages, scrape_pakwheels
from services.search_sessions_repo import get_open_ai_session

router = APIRouter(prefix="/api/pakwheels", tags=["pakwheels"])

_log = logging.getLogger(__name__)

_lock = asyncio.Lock()


def _chat_max_items() -> int:
    raw = os.environ.get("OLLAMA_CHAT_MAX_LISTINGS", "100").strip()
    try:
        return max(1, min(int(raw), 500))
    except ValueError:
        return 100


def _chat_max_chars() -> int:
    raw = os.environ.get("OLLAMA_CHAT_MAX_CHARS", "28000").strip()
    try:
        return max(4000, min(int(raw), 120000))
    except ValueError:
        return 28000


def _effective_max_age_hours(requested: int | None) -> int:
    """Must match scraper `pakwheels._resolve_max_age_hours` semantics."""
    if requested is not None:
        return max(1, min(int(requested), 8760))
    raw = os.environ.get("SCRAPE_MAX_LISTING_AGE_HOURS", "").strip()
    if raw:
        try:
            return max(1, min(int(raw), 8760))
        except ValueError:
            pass
    raw = os.environ.get("PAKWHEELS_MAX_AGE_HOURS", "48").strip()
    try:
        return max(1, min(int(raw), 8760))
    except ValueError:
        return 48


def scrape_hints(url: str, scraped_count: int, max_age_hours: int) -> list[str]:
    """Explain common empty results (see server logs for scrape diagnostics)."""
    hints: list[str] = []
    u = url.lower()
    if "pr_less_400000" in u and "pr_less_4000000" not in u:
        hints.append(
            "Your URL contains pr_less_400000 (price under ~₨400,000). "
            "For “under 40 lakhs” / ₨4,000,000 use pr_less_4000000 — add one more 0 before the slash."
        )
    if "/used-cars/search/" not in u and "pakwheels.com" in u:
        hints.append(
            "PakWheels URL looks like a legacy path (not /used-cars/search/-/…). "
            "Re-run search so AI rebuilds the URL, or paste a URL from docs/pakwheels_patterns.md."
        )
    if "g2003" in u and "olx.com.pk" in u:
        hints.append(
            "OLX URL uses an invalid regional id (_g2003…). "
            "Use city tokens from docs/olx_patterns.md (e.g. gujranwala_g4060662)."
        )
    if scraped_count == 0:
        hints.append(
            f"Scraper collected 0 listings newer than {max_age_hours}h for this search. "
            'Try widening the age window in settings or env, fix URL filters, or check logs for "page 1 summary".'
        )
    return hints


def _iso_meta(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=12000)


class ChatBody(BaseModel):
    """Chat with Ollama using listing data from SQLite as context."""

    messages: list[ChatMessage] = Field(
        ...,
        min_length=1,
        max_length=48,
        description="Conversation turns (user/assistant). Last message must be from the user.",
    )
    search_url: str | None = Field(
        None,
        max_length=2048,
        description="Same as dashboard PakWheels URL: restrict listing snapshot to this search, or omit for all rows.",
    )
    model: str | None = Field(None, max_length=128, description="Override chat model (OLLAMA_CHAT_MODEL / OLLAMA_MODEL).")

    @field_validator("messages")
    @classmethod
    def last_must_be_user(cls, v: list[ChatMessage]) -> list[ChatMessage]:
        if not v or v[-1].role != "user":
            raise ValueError("Last message must be from the user")
        return v


class SuggestUrlBody(BaseModel):
    """Natural-language intent → PakWheels search URL via local Ollama."""

    query: str = Field(
        ...,
        min_length=3,
        max_length=4000,
        description="What you want to search for (e.g. Toyota Corolla under 40 lakhs in Lahore).",
    )
    ai_prompt: str | None = Field(
        None,
        max_length=8000,
        description="Extra instructions for the model (tone, segments to prefer, etc.).",
    )
    model: str | None = Field(
        None,
        max_length=128,
        description="Override OLLAMA_MODEL for this request only.",
    )


@router.post("/suggest-url")
async def suggest_pakwheels_url_endpoint(body: SuggestUrlBody):
    """Ask Ollama to produce PakWheels + OLX Pakistan cars search URLs from plain-language intent."""
    try:
        url_pw, raw_pw, model_pw = await suggest_pakwheels_search_url(
            user_query=body.query,
            ai_prompt=body.ai_prompt,
            model_override=body.model,
        )
        url_ox, raw_ox, model_ox = await suggest_olx_search_url(
            user_query=body.query,
            ai_prompt=body.ai_prompt,
            model_override=body.model,
        )
    except httpx.ConnectError as e:
        raise HTTPException(
            status_code=503,
            detail="Cannot reach LLM provider. Configure API keys under Settings or check network.",
        ) from e
    except httpx.TimeoutException as e:
        raise HTTPException(
            status_code=504,
            detail="LLM request timed out.",
        ) from e
    except httpx.HTTPStatusError as e:
        body_txt = ""
        try:
            body_txt = e.response.text[:800]
        except Exception:
            body_txt = ""
        raise HTTPException(
            status_code=502,
            detail=f"LLM HTTP {e.response.status_code}. {body_txt}".strip(),
        ) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    return {
        "suggested_url": url_pw,
        "olx_url": url_ox,
        "model": model_pw,
        "olx_model": model_ox,
        "raw_reply_preview": raw_pw[:1500],
        "olx_raw_reply_preview": raw_ox[:1500],
    }


@router.post("/chat")
async def chat_with_database(body: ChatBody):
    """Ollama chat grounded on car listings in SQLite (optional filter by ``search_url``)."""
    norm = norm_search_url(body.search_url) if body.search_url and body.search_url.strip() else None
    filter_key = norm if norm else None
    items = await fetch_all_listings(search_url=filter_key)
    total = await count_listings()

    max_items = _chat_max_items()
    max_chars = _chat_max_chars()
    try:
        max_desc_len = max(40, min(int(os.environ.get("OLLAMA_CHAT_DESC_CHARS", "280").strip()), 2000))
    except ValueError:
        max_desc_len = 280
    snapshot = build_listings_snapshot(
        items,
        total_in_db=total,
        filtered_by_search_url=bool(filter_key),
        search_url_display=filter_key,
        max_items=max_items,
        max_total_chars=max_chars,
        max_desc_len=max_desc_len,
    )

    ollama_msgs = [{"role": m.role, "content": m.content} for m in body.messages]

    try:
        reply, model_used = await chat_with_listings_context(
            messages=ollama_msgs,
            listings_snapshot=snapshot,
            model_override=body.model,
        )
    except httpx.ConnectError as e:
        raise HTTPException(
            status_code=503,
            detail="Cannot reach LLM provider. Check API keys in Settings or network.",
        ) from e
    except httpx.TimeoutException as e:
        raise HTTPException(
            status_code=504,
            detail="LLM request timed out. Try a smaller snapshot (OLLAMA_CHAT_MAX_LISTINGS).",
        ) from e
    except httpx.HTTPStatusError as e:
        body_txt = ""
        try:
            body_txt = e.response.text[:800]
        except Exception:
            body_txt = ""
        raise HTTPException(
            status_code=502,
            detail=f"LLM HTTP {e.response.status_code}. {body_txt}".strip(),
        ) from e
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    _log.info(
        "pakwheels chat ok model=%s snapshot_items=%s db_total=%s filtered=%s",
        model_used,
        min(len(items), max_items),
        total,
        bool(filter_key),
    )

    return {
        "reply": reply,
        "model": model_used,
        "total_in_db": total,
        "snapshot_listings_count": len(items),
        "snapshot_capped_at": max_items,
        "filtered_by_search_url": bool(filter_key),
    }


@router.get("/stats/summary")
async def stats_summary():
    meta = await get_sync_meta()
    total = await count_listings()
    return {
        "total_listings": total,
        "synced_at": _iso_meta(meta.get("at")),
        "last_error": meta.get("last_error"),
    }


@router.get("/listings")
async def get_listings(
    search_url: str | None = Query(
        None,
        description="Optional PakWheels search URL filter (normalized). Combine with olx_search_url for dual session.",
    ),
    olx_search_url: str | None = Query(
        None,
        description="Optional OLX search URL filter (normalized). With search_url, returns rows matching either.",
    ),
    tab: str | None = Query(
        None,
        description="existing = promoted inventory; ai = current AI session; all = no session filter",
    ),
    ai_session_id: int | None = Query(None),
    include_spam: bool = Query(False),
    limit: int | None = Query(
        None,
        ge=1,
        le=500,
        description="Optional cap on rows returned (most recent first).",
    ),
):
    meta = await get_sync_meta()
    pw = norm_search_url(search_url) if search_url and search_url.strip() else None
    ox = norm_search_url(olx_search_url) if olx_search_url and olx_search_url.strip() else None

    existing_only = tab == "existing"
    # tab=all → return every item matching the URLs, regardless of which session scraped it
    url_only_mode = tab == "all"
    sess_id = ai_session_id
    if tab == "ai" and sess_id is None:
        open_s = await get_open_ai_session()
        sess_id = open_s.id if open_s else None

    if tab == "ai" and sess_id is None:
        total = await count_listings()
        return {
            "items": [],
            "count": 0,
            "total_in_db": total,
            "filtered_by_search_url": bool(pw or ox),
            "synced_at": _iso_meta(meta.get("at")),
            "last_error": meta.get("last_error"),
            "tab": tab,
            "ai_session_id_resolved": None,
        }

    kw: dict = {"hide_spam": not include_spam, "include_hidden": False}
    if limit is not None:
        kw["limit"] = limit
    if not url_only_mode:
        if existing_only:
            kw["existing_only"] = True
        elif tab == "ai" and sess_id is not None:
            kw["ai_session_id"] = sess_id

    if pw and ox:
        items = await fetch_all_listings(search_urls=[pw, ox], **kw)
        filtered = True
    elif pw:
        items = await fetch_all_listings(search_url=pw, **kw)
        filtered = True
    elif ox:
        items = await fetch_all_listings(search_url=ox, **kw)
        filtered = True
    else:
        items = await fetch_all_listings(**kw)
        filtered = False

    total = await count_listings()
    return {
        "items": items,
        "count": len(items),
        "total_in_db": total,
        "filtered_by_search_url": filtered,
        "synced_at": _iso_meta(meta.get("at")),
        "last_error": meta.get("last_error"),
        "tab": tab,
        "ai_session_id_resolved": sess_id,
    }


async def _resolve_stream_cap(cfg: dict) -> int:
    raw = cfg.get("max_listings")
    if raw is not None:
        try:
            return max(1, min(int(raw), 500))
        except (TypeError, ValueError):
            pass
    dbv = await settings_repo.get_setting("scrape.max_listings", 50)
    try:
        return max(1, min(int(dbv), 500))
    except (TypeError, ValueError):
        return 25


@router.websocket("/ws/scrape")
async def scrape_stream_ws(websocket: WebSocket):
    """Stream scraped listings as each row is persisted (primary + optional secondary marketplace)."""
    await websocket.accept()
    try:
        cfg = await websocket.receive_json()
    except WebSocketDisconnect:
        return

    url = norm_search_url((cfg.get("url") or "").strip())
    if not url:
        await websocket.send_json({"type": "error", "message": "url is required"})
        await websocket.close(code=4400)
        return
    low = url.lower()
    if "pakwheels.com" not in low or "/used-cars" not in low:
        await websocket.send_json(
            {"type": "error", "message": "Primary URL must be a supported used-cars search link."},
        )
        await websocket.close(code=4400)
        return

    olx_u = norm_search_url((cfg.get("olx_url") or "").strip())
    if olx_u:
        ox_low = olx_u.lower()
        if "olx.com.pk" not in ox_low:
            await websocket.send_json(
                {"type": "error", "message": "Secondary URL must be a supported cars search link."},
            )
            await websocket.close(code=4400)
            return

    sync_origin = cfg.get("sync_origin") or "url"
    if sync_origin not in ("ai", "url"):
        sync_origin = "url"

    ai_sid = cfg.get("ai_session_id")
    if ai_sid is not None:
        try:
            ai_sid = int(ai_sid)
        except (TypeError, ValueError):
            ai_sid = None

    cap = await _resolve_stream_cap(cfg)
    max_age_req = cfg.get("max_age_hours")
    if max_age_req is None:
        sag = await settings_repo.get_setting("scrape.max_age_hours", None)
        if sag is not None:
            try:
                max_age_req = max(1, min(int(sag), 8760))
            except (TypeError, ValueError):
                max_age_req = None
    if max_age_req is not None:
        try:
            max_age_req = max(1, min(int(max_age_req), 8760))
        except (TypeError, ValueError):
            max_age_req = None

    mp = cfg.get("max_pages")
    if mp is None:
        mp = await settings_repo.get_setting("scrape.max_pages", 3)
    eff_pages = resolve_max_pages(mp)
    olx_pages = min(eff_pages, 5)

    cap_pw = max(1, cap // 2) if olx_u else cap
    cap_ox = (cap - cap_pw) if olx_u else 0

    async with _lock:
        q: SimpleQueue = SimpleQueue()
        err: list[BaseException | None] = [None]

        def worker() -> None:
            try:

                def cb(clean: dict) -> None:
                    q.put(clean)

                scrape_pakwheels(
                    url,
                    max_age_hours=max_age_req,
                    max_pages=eff_pages,
                    max_listings=cap_pw,
                    on_listing=cb,
                )

                if olx_u and cap_ox > 0:
                    scrape_olx(
                        olx_u,
                        max_pages=olx_pages,
                        max_listings=cap_ox,
                        max_age_hours=max_age_req,
                        on_listing=cb,
                    )
            except BaseException as exc:
                err[0] = exc
            finally:
                q.put(None)

        scrape_task = asyncio.create_task(asyncio.to_thread(worker))
        eff_hours_hint = _effective_max_age_hours(max_age_req)
        started_payload: dict = {
            "type": "started",
            "target": cap,
            "pakwheels_cap": cap_pw,
            "olx_cap": cap_ox,
            "max_pages_used": eff_pages,
            "max_age_hours_used": eff_hours_hint,
        }
        if olx_u:
            started_payload["olx_pages_used"] = olx_pages
        await websocket.send_json(started_payload)

        idx = 0
        upserted = 0
        modified = 0
        pw_saved = 0
        olx_saved = 0
        try:
            while True:
                clean = await asyncio.to_thread(q.get)
                if clean is None:
                    break
                idx += 1
                src_key = norm_search_url(olx_u) if clean.get("source") == "olx" else norm_search_url(url)
                row_dict, kind = await upsert_one_listing(
                    clean,
                    src_key,
                    search_origin=sync_origin,
                    ai_session_id=ai_sid,
                )
                if os.environ.get("ENRICH_ON_SCRAPE", "").lower() in ("1", "true", "yes"):
                    from services.enrichment_worker import schedule_enrichment

                    schedule_enrichment(int(row_dict["id"]), row_dict)
                if os.environ.get("SPAM_AI_ON_SCRAPE", "").lower() in ("1", "true", "yes"):
                    from services.spam_ai import score_listing

                    rid = int(row_dict["id"])

                    async def _spam_row() -> None:
                        _, sp, rs = await score_listing(
                            str(row_dict.get("title") or ""),
                            row_dict.get("price"),
                            str(row_dict.get("url") or ""),
                        )
                        await set_listing_spam(rid, is_spam=sp, reason=rs)

                    asyncio.create_task(_spam_row())

                if clean.get("source") == "olx":
                    olx_saved += 1
                else:
                    pw_saved += 1
                if kind == "upserted":
                    upserted += 1
                else:
                    modified += 1
                prog = round(idx / cap, 4) if cap else 0.0
                await websocket.send_json(
                    {
                        "type": "listing",
                        "index": idx,
                        "target": cap,
                        "progress": prog,
                        "item": listing_dict_json_safe(row_dict),
                    },
                )
        finally:
            await scrape_task

        exc = err[0]
        if exc is not None:
            detail = traceback.format_exc()
            await set_sync_error(f"{type(exc).__name__}: {exc}\n{detail}")
            await websocket.send_json({"type": "error", "message": f"{type(exc).__name__}: {exc}"})
            await websocket.close(code=4500)
            return

        now = datetime.now(timezone.utc)
        await set_sync_success(now)
        meta = await get_sync_meta()
        total = await count_listings()
        kw_fetch: dict = {}
        if ai_sid is not None:
            kw_fetch["ai_session_id"] = ai_sid
        if olx_u:
            items = await fetch_all_listings(
                search_urls=[norm_search_url(url), norm_search_url(olx_u)],
                **kw_fetch,
            )
        else:
            items = await fetch_all_listings(search_url=norm_search_url(url), **kw_fetch)
        eff_hours = _effective_max_age_hours(max_age_req)
        hints = scrape_hints(url, pw_saved, eff_hours)
        if olx_u and cap_ox > 0 and olx_saved == 0:
            hints.append(
                "Secondary marketplace returned no listings this run — verify the URL in a browser or check server logs.",
            )

        done_payload: dict = {
            "type": "done",
            "scraped_count": idx,
            "write_stats": {
                "upserted": upserted,
                "modified": modified,
                "matched": upserted + modified,
            },
            "hints": hints,
            "synced_at": _iso_meta(meta.get("at")),
            "total_in_db": total,
            "count": len(items),
            "items": [listing_dict_json_safe(x) for x in items],
            "max_age_hours_used": eff_hours,
            "max_pages_used": eff_pages,
            "max_listings_used": cap,
            "sync_origin_used": sync_origin,
            "search_url_used": url,
            "filtered_by_search_url": True,
            "ai_session_id": ai_sid,
        }
        if olx_u:
            done_payload["olx_search_url_used"] = olx_u
        await websocket.send_json(done_payload)

    await websocket.close()
