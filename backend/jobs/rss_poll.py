"""Fetch RSS feeds configured in settings → external_snapshots."""

from __future__ import annotations

import logging

import feedparser

from services import settings_repo

_log = logging.getLogger(__name__)


async def poll_news_feeds() -> None:
    urls = await settings_repo.get_setting("news.rss_urls", []) or []
    if not isinstance(urls, list):
        return
    for u in urls:
        if not isinstance(u, str) or not u.startswith("http"):
            continue
        try:
            parsed = feedparser.parse(u)
            for ent in (parsed.entries or [])[:12]:
                title = getattr(ent, "title", "") or "News"
                summary = getattr(ent, "summary", "") or getattr(ent, "description", "") or ""
                link = getattr(ent, "link", "") or u
                await settings_repo.add_external_snapshot(
                    kind="news",
                    title=str(title)[:500],
                    body=str(summary)[:8000],
                    source_url=str(link)[:2048],
                )
        except Exception as e:
            _log.warning("RSS poll failed %s: %s", u, e)


async def poll_fuel_urls() -> None:
    urls = await settings_repo.get_setting("fuel.source_urls", []) or []
    if not isinstance(urls, list):
        return
    import httpx

    for u in urls:
        if not isinstance(u, str) or not u.startswith("http"):
            continue
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.get(u)
                text = r.text[:12000]
                await settings_repo.add_external_snapshot(
                    kind="fuel",
                    title="Fuel snapshot",
                    body=text,
                    source_url=u[:2048],
                )
        except Exception as e:
            _log.warning("Fuel fetch failed %s: %s", u, e)
