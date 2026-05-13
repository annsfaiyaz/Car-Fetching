"""Listing detail, feedback, spam toggles."""

from __future__ import annotations

import html

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from services import listings_repo
from services.feedback_repo import add_feedback
from services.search_sessions_repo import intent_hash_from_query

router = APIRouter(prefix="/api/listings", tags=["listings"])


class FeedbackBody(BaseModel):
    relevant: bool
    query: str = Field("", max_length=4000)


class SpamBody(BaseModel):
    is_spam: bool
    reason: str | None = Field(None, max_length=2000)


@router.post("/{listing_id}/feedback")
async def post_feedback(listing_id: int, body: FeedbackBody):
    h = intent_hash_from_query(body.query)
    await add_feedback(
        listing_id=listing_id,
        intent_hash=h,
        query_snapshot=body.query[:4000],
        relevant=body.relevant,
    )
    if not body.relevant:
        await listings_repo.set_listing_hidden(listing_id, hidden=True)
    return {"ok": True}


@router.post("/{listing_id}/spam")
async def post_spam(listing_id: int, body: SpamBody):
    await listings_repo.set_listing_spam(listing_id, is_spam=body.is_spam, reason=body.reason)
    return {"ok": True}


@router.get("/{listing_id}")
async def get_one(listing_id: int):
    row = await listings_repo.get_listing_by_id(listing_id)
    if row is None:
        raise HTTPException(404, detail="Listing not found")
    return {"item": listings_repo.listing_dict_json_safe(row)}


@router.get("/{listing_id}/html", response_class=HTMLResponse)
async def listing_html(listing_id: int):
    row = await listings_repo.get_listing_by_id(listing_id)
    if row is None:
        raise HTTPException(404)
    safe = listings_repo.listing_dict_json_safe(row)
    _img_raw = str(safe.get("image_url") or "").strip()
    _ph = "/static/images/car-placeholder.svg"
    title = html.escape(str(safe.get("title") or "Listing"))
    url = html.escape(str(safe.get("url") or "#"))
    price = safe.get("price")
    ps = f"PKR {price:,}" if isinstance(price, int) else "—"
    mp = html.escape(str(safe.get("ai_market_price_note") or ""))
    fuel = html.escape(str(safe.get("ai_fuel_avg_note") or ""))
    desc = html.escape((safe.get("description") or "")[:8000])
    if _img_raw:
        img_tag = (
            f'<img src="{html.escape(_img_raw, quote=True)}" alt="" '
            f'onerror="this.onerror=null;this.src=\'{html.escape(_ph)}\'"/>'
        )
    else:
        img_tag = f'<img src="{html.escape(_ph, quote=True)}" alt=""/>'
    body_html = f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>{title}</title>
<style>body{{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem}} img{{max-width:100%;border-radius:8px}} .buy{{display:inline-block;margin:1rem 0;padding:0.6rem 1.2rem;background:#f59e0b;color:#1c1917;font-weight:600;border-radius:8px;text-decoration:none}}</style></head><body>
<p><a href="/">← WheelWise PK</a></p>
<h1>{title}</h1>
{img_tag}
<p><strong>{ps}</strong></p>
<p><a class="buy" href="{url}" target="_blank" rel="noopener noreferrer">Buy</a></p>
<h2>Insights</h2>
<p><strong>Market:</strong> {mp or '—'}</p>
<p><strong>Fuel:</strong> {fuel or '—'}</p>
<h2>Description</h2>
<p>{desc}</p>
</body></html>"""
    return HTMLResponse(body_html)
