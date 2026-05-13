"""Thin wrapper around ``scraper.pakwheels`` for the backend."""

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
    import pakwheels as pw  # noqa: PLC0415

    _scraper_mod = pw
    return pw


def scrape_pakwheels(
    url: str,
    *,
    max_age_hours: int | None = None,
    max_pages: int | None = None,
    max_listings: int | None = None,
    on_listing: Callable[[dict[str, Any]], None] | None = None,
) -> list[dict[str, Any]]:
    pw = _module()
    return pw.scrape_pakwheels(
        url,
        max_age_hours=max_age_hours,
        max_pages=max_pages,
        max_listings=max_listings,
        on_listing=on_listing,
    )


def resolve_max_pages(explicit: object | None) -> int:
    return _module()._resolve_max_pages(explicit)
