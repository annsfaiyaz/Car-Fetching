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
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import pakwheels as _pw
from bs4 import BeautifulSoup
from playwright.sync_api import Browser, sync_playwright

logger = logging.getLogger(__name__)

_BASE = "https://www.olx.com.pk"
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

# How long to wait (ms) after DOMContentLoaded for React to render cards (override with OLX_RENDER_WAIT_MS)
_RENDER_WAIT_MS = 6500
_PAGE_TIMEOUT_MS = 30_000


def _render_wait_ms() -> int:
    raw = os.environ.get("OLX_RENDER_WAIT_MS", "").strip()
    if raw:
        try:
            return max(500, min(int(raw), 60_000))
        except ValueError:
            pass
    return _RENDER_WAIT_MS


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


def _iso_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _card_freshness_dt(card: dict[str, Any]) -> datetime | None:
    """Best-effort datetime for age filtering (ISO ``posted_time`` or relative text in ``_age_blob``)."""
    ps = (card.get("posted_time") or "").strip()
    if ps and "T" in ps:
        try:
            d = datetime.fromisoformat(ps.replace("Z", "+00:00"))
            if d.tzinfo is None:
                d = d.replace(tzinfo=timezone.utc)
            return d.astimezone(timezone.utc)
        except ValueError:
            pass
    blob = card.get("_age_blob") or ""
    pt = _pw.parse_relative_posted_time(blob)
    if pt is None:
        return None
    if pt.tzinfo is None:
        pt = pt.replace(tzinfo=timezone.utc)
    return pt.astimezone(timezone.utc)


def _skip_listing_too_old(card: dict[str, Any], cutoff_utc: datetime) -> bool:
    dt = _card_freshness_dt(card)
    if dt is None:
        return False
    return dt < cutoff_utc


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

    image_url = ""
    img = article.select_one("img[src]")
    if img and img.get("src"):
        image_url = _normalize_href(img.get("src", ""))

    pt = _pw.parse_relative_posted_time(text_blob)
    posted_iso = _iso_utc(pt) if pt else ""

    return {
        "title": title,
        "price": price,
        "city": city,
        "model_year": year,
        "transmission": transmission,
        "mileage": km,
        "url": url,
        "description": "",
        "posted_time": posted_iso,
        "source": "olx",
        "image_url": image_url or None,
        "_age_blob": text_blob,
    }


def _fallback_cards_from_item_links(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """When OLX drops ``<article>`` wrappers, recover cards from ``/item/`` links."""
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for a in soup.select('a[href*="/item/"]'):
        href = (a.get("href") or "").strip()
        url = _normalize_href(href)
        if not url or "/item/" not in url.lower():
            continue
        if url in seen:
            continue
        seen.add(url)
        title = (a.get_text(strip=True) or "").strip() or "Listing"
        parent = a.find_parent(["article", "li", "div"])
        blob = parent.get_text("\n", strip=True) if parent else title
        price: int | None = None
        for ln in blob.splitlines():
            low = ln.lower().strip()
            if low.startswith("rs"):
                price = _parse_price(ln)
                if price:
                    break
        text_blob = " ".join(blob.splitlines())
        year = _parse_year(text_blob)
        km = _parse_km(text_blob)
        blob_low = text_blob.lower()
        transmission: str | None = None
        if "automatic" in blob_low:
            transmission = "Automatic"
        elif "manual" in blob_low:
            transmission = "Manual"
        image_url = ""
        if parent:
            img = parent.select_one("img[src]")
            if img and img.get("src"):
                image_url = _normalize_href(img.get("src", ""))
        pt = _pw.parse_relative_posted_time(text_blob)
        posted_iso = _iso_utc(pt) if pt else ""
        out.append(
            {
                "title": title[:500],
                "price": price,
                "city": None,
                "model_year": year,
                "transmission": transmission,
                "mileage": km,
                "url": url,
                "description": "",
                "posted_time": posted_iso,
                "source": "olx",
                "image_url": image_url or None,
                "_age_blob": text_blob,
            }
        )
    return out


# ── page fetcher ──────────────────────────────────────────────────────────────

def _fetch_page_html(browser: Browser, page_url: str) -> str:
    """Load ``page_url`` in a new Playwright tab and return fully-rendered HTML."""
    render_ms = _render_wait_ms()
    page = browser.new_page(user_agent=_UA)
    try:
        page.goto(page_url, wait_until="domcontentloaded", timeout=_PAGE_TIMEOUT_MS)
        try:
            page.wait_for_selector("article, a[href*='/item/']", timeout=min(25_000, _PAGE_TIMEOUT_MS))
        except Exception:
            logger.debug("OLX: selector wait skipped or timed out for %s", page_url[:80])
        page.wait_for_timeout(render_ms)
        return page.content()
    finally:
        page.close()


# ── public API ────────────────────────────────────────────────────────────────

def scrape_olx(
    url: str,
    *,
    max_pages: int | None = None,
    max_listings: int | None = None,
    max_age_hours: int | None = None,
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
    hours = _pw._resolve_max_age_hours(max_age_hours)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    logger.info(
        "OLX (Playwright) scrape start url=%s max_pages=%s max_listings=%s max_age_hours=%s cutoff=%s",
        base_url,
        page_limit,
        listing_limit,
        hours,
        cutoff.isoformat(),
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
                cards: list[dict[str, Any]] = []
                for art in articles:
                    card = _parse_article(art)
                    if card:
                        cards.append(card)
                if not cards:
                    cards = _fallback_cards_from_item_links(soup)
                logger.info(
                    "OLX page %s: articles=%s cards=%s",
                    page_num,
                    len(articles),
                    len(cards),
                )

                if not cards:
                    break

                for card in cards:
                    listing_url = card["url"]
                    if not listing_url or listing_url in seen_urls:
                        continue
                    if _skip_listing_too_old(card, cutoff):
                        continue

                    seen_urls.add(listing_url)
                    card.pop("_age_blob", None)

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
