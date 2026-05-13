"""Background enrichment: detail fetch + AI market/fuel notes."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from services import listings_repo
from services.llm_router import chat_completion

_log = logging.getLogger(__name__)


async def enrich_listing_row(listing_id: int, snapshot: dict[str, Any]) -> None:
    """Fetch notes via LLM from listing snapshot (detail crawl can be added later)."""
    lid = listing_id
    await listings_repo.update_enrichment_notes(lid, status="pending")

    title = snapshot.get("title") or ""
    price = snapshot.get("price")
    desc = (snapshot.get("description") or "")[:4000]
    blob = f"{title}\nPrice PKR: {price}\n{desc}"

    sys = (
        "You advise Pakistani used-car buyers. Given listing text, reply JSON only: "
        '{"market_price":"estimated fair PKR range in words","fuel_avg":"km/l estimate range if petrol"}'
    )
    try:
        text, _, _ = await chat_completion(
            [{"role": "system", "content": sys}, {"role": "user", "content": blob}],
            model_override=None,
            temperature=0.3,
        )
        import json
        import re

        m = re.search(r"\{[^{}]*\}", text, re.S)
        market = fuel = ""
        if m:
            data = json.loads(m.group(0))
            market = str(data.get("market_price", ""))
            fuel = str(data.get("fuel_avg", ""))
        await listings_repo.update_enrichment_notes(
            lid,
            market_note=market or text[:2000],
            fuel_note=fuel,
            status="ok",
            detail_snippet=desc[:800],
        )
    except Exception as e:
        _log.warning("enrichment failed id=%s: %s", lid, e)
        await listings_repo.update_enrichment_notes(lid, status="failed")


def schedule_enrichment(listing_id: int, snapshot: dict[str, Any]) -> None:
    asyncio.create_task(enrich_listing_row(listing_id, snapshot))
