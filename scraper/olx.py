"""
OLX Pakistan (cars_c84) scraper — Playwright headless browser edition.

OLX is a fully client-side React app; requests+BeautifulSoup cannot see
any listing data.  We use Playwright (Chromium) to render the page, then
parse the resulting HTML with BeautifulSoup.

Listing cards are <article> elements.  We extract data with tag + regex
patterns instead of CSS class names (which are hashed and change on every
deploy).
"""

from __future__ import annotations

import logging
import os
import re
import time
from collections.abc import Callable
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup
from playwright.sync_api import Browser, sync_playwright

logger = logging.getLogger(__name__)

_BASE = "https://www.olx.com.pk"
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# How long to wait (ms) after DOMContentLoaded for React to render cards
_RENDER_WAIT_MS = 4000
_PAGE_TIMEOUT_MS = 30_000


# ── helpers ──────────────────────────────────────────────────────────────────

def _with_page_param(url: str, page: int) -> str:
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    if page <= 1:
        q.pop("page", None)
    else:
        q["page"] = [str(page)]
    return urlunparse(parsed._replace(query=urlencode({k: v[0] for k, v in q.items()})))


def _resolve_max_pages(explicit: int | None) -> int:
    if explicit is not None:
        return max(1, min(int(explicit), 20))
    raw = os.environ.get("OLX_MAX_PAGES", "3").strip()
    try:
        return max(1, min(int(raw), 20))
    except ValueError:
        return 3


def _resolve_max_listings(explicit: int | None) -> int:
    if explicit is not None:
        return max(1, min(int(explicit), 500))
    raw = os.environ.get("OLX_MAX_LISTINGS", "25").strip()
    try:
        return max(1, min(int(raw), 500))
    except ValueError:
        return 25


def _parse_price(text: str) -> int | None:
    """Convert 'Rs 48.40 Lacs' / 'Rs 4,50,000' → int PKR."""
    t = text.strip()
    lacs = re.search(r"([\d.]+)\s*lac", t, re.I)
    if lacs:
        try:
            return int(float(lacs.group(1)) * 100_000)
        except ValueError:
            pass
    digits = re.sub(r"[^\d]", "", t)
    return int(digits) if digits else None


def _parse_km(text: str) -> int | None:
    m = re.search(r"([\d,]+)\s*km", text, re.I)
    if not m:
        return None
    digits = re.sub(r"[^\d]", "", m.group(1))
    return int(digits) if digits else None


def _parse_year(text: str) -> int | None:
    m = re.search(r"\b(19|20)\d{2}\b", text)
    return int(m.group(0)) if m else None


def _normalize_href(href: str) -> str:
    href = (href or "").strip()
    if not href:
        return ""
    if href.startswith("http"):
        return href.split("#")[0]
    return f"{_BASE.rstrip('/')}{href}".split("#")[0]


# ── card parser ───────────────────────────────────────────────────────────────

def _parse_article(article: BeautifulSoup) -> dict[str, Any] | None:
    """Extract a listing dict from a rendered <article> element."""
    # Title: first <h2> or <h3>
    h = article.find(["h2", "h3"])
    title = h.get_text(strip=True) if h else None
    if not title:
        return None

    # URL: first <a href> in the article
    a_tag = article.find("a", href=True)
    url = _normalize_href(a_tag["href"]) if a_tag else ""
    if not url:
        return None

    # Raw text lines for price/year/km/city extraction
    full_text = article.get_text(separator="\n")
    lines = [ln.strip() for ln in full_text.splitlines() if ln.strip()]

    # Price: line starting with "Rs"
    price: int | None = None
    for ln in lines:
        if ln.lower().startswith("rs"):
            price = _parse_price(ln)
            break

    # Year, km, transmission
    text_blob = " ".join(lines)
    year = _parse_year(text_blob)
    km = _parse_km(text_blob)

    transmission: str | None = None
    blob_low = text_blob.lower()
    if "automatic" in blob_low:
        transmission = "Automatic"
    elif "manual" in blob_low:
        transmission = "Manual"

    # City: OLX currently omits city from cards — leave None
    city: str | None = None

    return {
        "title": title,
        "price": price,
        "city": city,
        "model_year": year,
        "transmission": transmission,
        "mileage": km,
        "url": url,
        "description": "",
        "posted_time": "",
        "source": "olx",
    }


# ── page fetcher ──────────────────────────────────────────────────────────────

def _fetch_page_html(browser: Browser, page_url: str) -> str:
    """Load ``page_url`` in a new Playwright tab and return fully-rendered HTML."""
    page = browser.new_page(user_agent=_UA)
    try:
        page.goto(page_url, wait_until="domcontentloaded", timeout=_PAGE_TIMEOUT_MS)
        page.wait_for_timeout(_RENDER_WAIT_MS)
        return page.content()
    finally:
        page.close()


# ── public API ────────────────────────────────────────────────────────────────

def scrape_olx(
    url: str,
    *,
    max_pages: int | None = None,
    max_listings: int | None = None,
    session: Any = None,           # kept for API compatibility, unused
    request_delay_sec: float = 1.0,
    on_listing: Callable[[dict[str, Any]], None] | None = None,
) -> list[dict[str, Any]]:
    """
    Scrape car listings from an OLX Pakistan search URL using a headless
    Chromium browser (Playwright).

    Compatible drop-in for the old requests-based implementation.
    ``session`` is accepted but ignored.
    """
    base_url = (url or "").strip()
    if not base_url:
        raise ValueError("url is required")
    if "olx.com.pk" not in base_url.lower():
        raise ValueError("URL must be on olx.com.pk")

    page_limit = _resolve_max_pages(max_pages)
    listing_limit = _resolve_max_listings(max_listings)

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    logger.info(
        "OLX (Playwright) scrape start url=%s max_pages=%s max_listings=%s",
        base_url, page_limit, listing_limit,
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            for page_num in range(1, page_limit + 1):
                page_url = _with_page_param(base_url, page_num)
                try:
                    html = _fetch_page_html(browser, page_url)
                except Exception as exc:
                    logger.error("OLX page %s load failed: %s", page_num, exc)
                    break

                soup = BeautifulSoup(html, "html.parser")
                articles = soup.find_all("article")
                logger.info(
                    "OLX page %s: articles_found=%s", page_num, len(articles)
                )

                if not articles:
                    break

                for art in articles:
                    card = _parse_article(art)
                    if not card:
                        continue
                    listing_url = card["url"]
                    if not listing_url or listing_url in seen_urls:
                        continue
                    seen_urls.add(listing_url)

                    results.append(card)
                    if on_listing is not None:
                        try:
                            on_listing(card)
                        except Exception:
                            logger.exception("OLX on_listing callback failed")

                    if len(results) >= listing_limit:
                        logger.info("OLX: reached max_listings=%s", listing_limit)
                        break

                if len(results) >= listing_limit:
                    break

                if page_num < page_limit:
                    time.sleep(request_delay_sec)
        finally:
            browser.close()

    logger.info("OLX scrape done listings_collected=%s", len(results))
    return results


if __name__ == "__main__":
    import json
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if len(sys.argv) < 2:
        print(
            "Usage: python olx.py <olx_cars_search_url>\n"
            "Example: python olx.py 'https://www.olx.com.pk/cars_c84'",
            file=sys.stderr,
        )
        sys.exit(2)
    cars = scrape_olx(sys.argv[1], max_listings=10)
    print(json.dumps(cars, indent=2, ensure_ascii=False))
