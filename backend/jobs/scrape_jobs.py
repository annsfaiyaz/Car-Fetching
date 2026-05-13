"""Run configured background scrape jobs (URLs from DB)."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from queue import SimpleQueue
from typing import Any

from services import listings_repo, settings_repo
from services.scrape_olx import scrape_olx
from services.scrape_pakwheels import resolve_max_pages, scrape_pakwheels

_log = logging.getLogger(__name__)


async def run_background_scrape_jobs() -> None:
    jobs = await settings_repo.list_background_jobs()
    max_pages = await settings_repo.get_setting("scrape.max_pages", 3)
    eff = resolve_max_pages(max_pages)
    sag = await settings_repo.get_setting("scrape.max_age_hours", None)
    max_age_req = None
    if sag is not None:
        try:
            max_age_req = max(1, min(int(sag), 8760))
        except (TypeError, ValueError):
            max_age_req = None
    now = datetime.now(timezone.utc)

    for job in jobs:
        if not job.get("enabled"):
            continue
        pw_u = (job.get("pakwheels_url") or "").strip()
        ox_u = (job.get("olx_url") or "").strip()
        if not pw_u and not ox_u:
            continue
        cap = int(job.get("max_listings") or 25)
        cap_pw = max(1, cap // 2) if ox_u else cap
        cap_ox = (cap - cap_pw) if ox_u else 0
        q: SimpleQueue = SimpleQueue()

        def worker() -> None:
            try:

                def cb(c: dict[str, Any]) -> None:
                    q.put(c)

                if pw_u and "pakwheels.com" in pw_u.lower():
                    scrape_pakwheels(
                        pw_u,
                        max_age_hours=max_age_req,
                        max_pages=eff,
                        max_listings=cap_pw,
                        on_listing=cb,
                    )
                if ox_u and "olx.com.pk" in ox_u.lower() and cap_ox > 0:
                    scrape_olx(
                        ox_u,
                        max_pages=min(eff, 5),
                        max_listings=cap_ox,
                        max_age_hours=max_age_req,
                        on_listing=cb,
                    )
            except Exception as e:
                _log.exception("background job %s: %s", job.get("id"), e)
            finally:
                q.put(None)

        scrape_task = asyncio.create_task(asyncio.to_thread(worker))
        while True:
            item = await asyncio.to_thread(q.get)
            if item is None:
                break
            src = ox_u if item.get("source") == "olx" else pw_u
            try:
                await listings_repo.upsert_one_listing(item, src, search_origin="url", ai_session_id=None)
            except Exception as e:
                _log.debug("upsert job: %s", e)
        await scrape_task

    await listings_repo.set_sync_success(now)
