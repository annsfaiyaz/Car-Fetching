"""PakWheels scraper API: configurable search URL, SQLite upserts, filter listings by source URL."""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from queue import SimpleQueue
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, field_validator

from services.listings_repo import (
    count_listings,
    fetch_all_listings,
    get_sync_meta,
    listing_dict_json_safe,
    norm_search_url,
    set_sync_error,
    set_sync_success,
    upsert_one_listing,
)
from services.ollama_chat import build_listings_snapshot, chat_with_listings_context
from services.ollama_olx import suggest_olx_search_url
from services.ollama_pakwheels import suggest_pakwheels_search_url

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
    raw = os.environ.get("PAKWHEELS_MAX_AGE_HOURS", "168").strip()
    try:
        return max(1, min(int(raw), 8760))
    except ValueError:
        return 168


def scrape_hints(url: str, scraped_count: int, max_age_hours: int) -> list[str]:
    """Explain common empty results (see server logs for scrape diagnostics)."""
    hints: list[str] = []
    u = url.lower()
    if "pr_less_400000" in u and "pr_less_4000000" not in u:
        hints.append(
            "Your URL contains pr_less_400000 (price under ~₨400,000). "
            "For “under 40 lakhs” / ₨4,000,000 use pr_less_4000000 — add one more 0 before the slash."
        )
    if scraped_count == 0:
        hints.append(
            f"Scraper collected 0 listings newer than {max_age_hours}h for this search. "
            "Try a larger window (e.g. 7 days), fix the price segment above, or confirm PakWheels shows "
            '"Updated … ago" on listings — see terminal logs "PakWheels page 1 summary".'
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


def _scraper_module():
    """Import scraper from `car-fetching/scraper/` (sibling of `backend/`)."""
    routes_dir = Path(__file__).resolve().parent
    backend_dir = routes_dir.parent
    project_root = backend_dir.parent
    scraper_dir = project_root / "scraper"
    if not (scraper_dir / "pakwheels.py").is_file():
        raise RuntimeError(f"Scraper not found at {scraper_dir / 'pakwheels.py'}")
    if str(scraper_dir) not in sys.path:
        sys.path.insert(0, str(scraper_dir))
    import pakwheels as pw  # noqa: PLC0415 — dynamic path before import

    return pw


def _olx_scraper_module():
    routes_dir = Path(__file__).resolve().parent
    backend_dir = routes_dir.parent
    project_root = backend_dir.parent
    scraper_dir = project_root / "scraper"
    if not (scraper_dir / "olx.py").is_file():
        raise RuntimeError(f"OLX scraper not found at {scraper_dir / 'olx.py'}")
    if str(scraper_dir) not in sys.path:
        sys.path.insert(0, str(scraper_dir))
    import olx as ox  # noqa: PLC0415

    return ox


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
            detail=(
                "Cannot connect to Ollama. Install Ollama, run `ollama serve`, pull a model "
                "(e.g. `ollama pull llama3.2`), then retry. Optional env: OLLAMA_BASE_URL, OLLAMA_MODEL."
            ),
        ) from e
    except httpx.TimeoutException as e:
        raise HTTPException(
            status_code=504,
            detail="Ollama request timed out. Try a smaller/faster model or increase OLLAMA_TIMEOUT_SEC.",
        ) from e
    except httpx.HTTPStatusError as e:
        body_txt = ""
        try:
            body_txt = e.response.text[:800]
        except Exception:
            body_txt = ""
        raise HTTPException(
            status_code=502,
            detail=f"Ollama returned HTTP {e.response.status_code}. {body_txt}".strip(),
        ) from e
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
            detail=(
                "Cannot connect to Ollama. Run `ollama serve` and ensure a model is pulled "
                "(e.g. `ollama pull llama3.2`). Optional: OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL."
            ),
        ) from e
    except httpx.TimeoutException as e:
        raise HTTPException(
            status_code=504,
            detail="Ollama chat timed out. Try OLLAMA_CHAT_TIMEOUT_SEC or a smaller snapshot (OLLAMA_CHAT_MAX_LISTINGS).",
        ) from e
    except httpx.HTTPStatusError as e:
        body_txt = ""
        try:
            body_txt = e.response.text[:800]
        except Exception:
            body_txt = ""
        raise HTTPException(
            status_code=502,
            detail=f"Ollama returned HTTP {e.response.status_code}. {body_txt}".strip(),
        ) from e
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
):
    meta = await get_sync_meta()
    pw = norm_search_url(search_url) if search_url and search_url.strip() else None
    ox = norm_search_url(olx_search_url) if olx_search_url and olx_search_url.strip() else None

    if pw and ox:
        items = await fetch_all_listings(search_urls=[pw, ox])
        filtered = True
    elif pw:
        items = await fetch_all_listings(search_url=pw)
        filtered = True
    elif ox:
        items = await fetch_all_listings(search_url=ox)
        filtered = True
    else:
        items = await fetch_all_listings()
        filtered = False

    total = await count_listings()
    return {
        "items": items,
        "count": len(items),
        "total_in_db": total,
        "filtered_by_search_url": filtered,
        "synced_at": _iso_meta(meta.get("at")),
        "last_error": meta.get("last_error"),
    }


def _stream_max_listings(cfg: dict) -> int:
    raw = cfg.get("max_listings")
    if raw is not None:
        try:
            return max(1, min(int(raw), 500))
        except (TypeError, ValueError):
            pass
    env = os.environ.get("PAKWHEELS_STREAM_MAX_LISTINGS", "25").strip()
    try:
        return max(1, min(int(env), 500))
    except ValueError:
        return 25


@router.websocket("/ws/scrape")
async def scrape_stream_ws(websocket: WebSocket):
    """Stream scraped listings as each row is persisted (PakWheels + optional OLX)."""
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
            {"type": "error", "message": "URL must be a PakWheels used-cars search URL"},
        )
        await websocket.close(code=4400)
        return

    olx_u = norm_search_url((cfg.get("olx_url") or "").strip())
    if olx_u:
        ox_low = olx_u.lower()
        if "olx.com.pk" not in ox_low:
            await websocket.send_json({"type": "error", "message": "olx_url must be on olx.com.pk"})
            await websocket.close(code=4400)
            return

    sync_origin = cfg.get("sync_origin") or "url"
    if sync_origin not in ("ai", "url"):
        sync_origin = "url"

    cap = _stream_max_listings(cfg)
    max_age_req = cfg.get("max_age_hours")
    if max_age_req is not None:
        try:
            max_age_req = max(1, min(int(max_age_req), 8760))
        except (TypeError, ValueError):
            max_age_req = None

    cap_pw = max(1, cap // 2) if olx_u else cap
    cap_ox = (cap - cap_pw) if olx_u else 0

    async with _lock:
        pw = _scraper_module()
        ox = _olx_scraper_module() if olx_u and cap_ox > 0 else None
        eff_pages = pw._resolve_max_pages(cfg.get("max_pages"))
        olx_pages = min(eff_pages, 5)
        q: SimpleQueue = SimpleQueue()
        err: list[BaseException | None] = [None]

        def worker() -> None:
            try:

                def cb(clean: dict) -> None:
                    q.put(clean)

                pw.scrape_pakwheels(
                    url,
                    max_age_hours=max_age_req,
                    max_pages=eff_pages,
                    max_listings=cap_pw,
                    on_listing=cb,
                )

                if ox is not None and cap_ox > 0:
                    ox.scrape_olx(
                        olx_u,
                        max_pages=olx_pages,
                        max_listings=cap_ox,
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
                _, kind = await upsert_one_listing(
                    clean,
                    src_key,
                    search_origin=sync_origin,
                )
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
        if olx_u:
            items = await fetch_all_listings(search_urls=[norm_search_url(url), norm_search_url(olx_u)])
        else:
            items = await fetch_all_listings(search_url=norm_search_url(url))
        eff_hours = _effective_max_age_hours(max_age_req)
        hints = scrape_hints(url, pw_saved, eff_hours)
        if olx_u and cap_ox > 0 and olx_saved == 0:
            hints.append(
                "OLX returned no listings this run — verify the OLX URL opens in a browser or check server logs for OLX.",
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
        }
        if olx_u:
            done_payload["olx_search_url_used"] = olx_u
        await websocket.send_json(done_payload)

    await websocket.close()
