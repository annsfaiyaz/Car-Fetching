"""Thin wrapper around ``scraper.olx`` for the backend."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable

_scraper_mod: Any = None


def _module():
    global _scraper_mod
    if _scraper_mod is not None:
        return _scraper_mod
    backend_dir = Path(__file__).resolve().parent.parent
    project_root = backend_dir.parent
    scraper_dir = project_root / "scraper"
    if str(scraper_dir) not in sys.path:
        sys.path.insert(0, str(scraper_dir))
    import olx as ox  # noqa: PLC0415

    _scraper_mod = ox
    return ox


def scrape_olx(
    url: str,
    *,
    max_pages: int | None = None,
    max_listings: int | None = None,
    max_age_hours: int | None = None,
    on_listing: Callable[[dict[str, Any]], None] | None = None,
    request_delay_sec: float = 1.0,
) -> list[dict[str, Any]]:
    ox = _module()
    return ox.scrape_olx(
        url,
        max_pages=max_pages,
        max_listings=max_listings,
        max_age_hours=max_age_hours,
        on_listing=on_listing,
        request_delay_sec=request_delay_sec,
    )
