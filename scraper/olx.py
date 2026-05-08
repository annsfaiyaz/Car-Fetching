"""
OLX Pakistan (cars_c84) search scraper using requests + BeautifulSoup.

pip install requests beautifulsoup4
"""

from __future__ import annotations

import logging
import os
import re
import time
from collections.abc import Callable
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _normalize_listing_href(href: str, base: str = "https://www.olx.com.pk") -> str:
    href = (href or "").strip()
    if not href:
        return ""
    if href.startswith("http"):
        return href.split("#")[0]
    if href.startswith("/"):
        return f"{base.rstrip('/')}{href}".split("#")[0]
    return f"{base.rstrip('/')}/{href}".split("#")[0]


def _with_page_param(url: str, page: int) -> str:
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    if page <= 1:
        q.pop("page", None)
    else:
        q["page"] = [str(page)]
    new_query = urlencode({k: v[0] for k, v in q.items()})
    return urlunparse(parsed._replace(query=new_query))


def _parse_olx_price(text: str | None) -> int | None:
    if not text:
        return None
    s = re.sub(r"[^\d]", "", str(text).strip())
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


def _parse_item_details(blob: str) -> tuple[int | None, int | None]:
    """Year and mileage from itemDetails line (e.g. '2019 - 45,000 km')."""
    if not blob:
        return None, None
    t = re.sub(r"\s+", " ", blob.strip())
    year = None
    ym = re.search(r"\b(19|20)\d{2}\b", t)
    if ym:
        year = int(ym.group(0))
    miles = None
    km = re.search(r"([\d,]+)\s*km", t, re.I)
    if km:
        d = re.sub(r"[^\d]", "", km.group(1))
        if d:
            try:
                miles = int(d)
            except ValueError:
                pass
    return year, miles


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


def _extract_card_fields(box: BeautifulSoup) -> dict[str, Any]:
    title_el = box.select_one('span[data-aut-id="itemTitle"]')
    price_el = box.select_one('span[data-aut-id="itemPrice"]')
    loc_el = box.select_one('span[data-aut-id="itemLocation"]')
    det_el = box.select_one('span[data-aut-id="itemDetails"]')

    title = title_el.get_text(strip=True) if title_el else ""
    price_text = price_el.get_text(" ", strip=True) if price_el else ""
    location = loc_el.get_text(strip=True) if loc_el else ""
    details_txt = det_el.get_text(" ", strip=True) if det_el else ""

    href = ""
    art = box.select_one("article")
    if art:
        a = art.select_one("a[href]")
        if a:
            href = _normalize_listing_href(a.get("href") or "")

    year, mileage = _parse_item_details(details_txt)
    price_num = _parse_olx_price(price_text)

    transmission = None
    blob = f"{title} {details_txt}".lower()
    if "automatic" in blob:
        transmission = "Automatic"
    elif "manual" in blob:
        transmission = "Manual"

    return {
        "title": title or None,
        "price": price_num,
        "city": location or None,
        "model_year": year,
        "transmission": transmission,
        "mileage": mileage,
        "url": href,
    }


def scrape_olx(
    url: str,
    *,
    max_pages: int | None = None,
    max_listings: int | None = None,
    session: requests.Session | None = None,
    request_delay_sec: float = 0.45,
    on_listing: Callable[[dict[str, Any]], None] | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch car listings from an OLX Pakistan cars search ``url`` (must contain olx.com.pk and cars_c84).
    Card-only scrape (no detail pages) for speed.
    """
    base_url = (url or "").strip()
    if not base_url:
        raise ValueError("url is required (OLX Pakistan cars search URL)")
    low = base_url.lower()
    if "olx.com.pk" not in low:
        raise ValueError("URL must be on olx.com.pk")
    if "cars_c84" not in low and "_c84" not in low:
        logger.warning("OLX URL might not be car category (expected …cars_c84…): %s", base_url[:120])

    page_limit = _resolve_max_pages(max_pages)
    listing_limit = _resolve_max_listings(max_listings)
    sess = session or requests.Session()
    sess.headers.update(DEFAULT_HEADERS)

    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    logger.info(
        "OLX scrape start url=%s max_pages=%s max_listings=%s",
        base_url,
        page_limit,
        listing_limit,
    )

    for page in range(1, page_limit + 1):
        page_url = _with_page_param(base_url, page)
        try:
            resp = sess.get(page_url, timeout=45)
            resp.raise_for_status()
        except requests.RequestException as e:
            logger.error("OLX page %s GET failed: %s", page, e)
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        boxes = soup.select('li[data-aut-id="itemBox"]')
        logger.info("OLX page %s: status=%s cards=%s", page, resp.status_code, len(boxes))

        if not boxes:
            break

        for box in boxes:
            card = _extract_card_fields(box)
            listing_url = card.get("url") or ""
            if not listing_url or listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            clean: dict[str, Any] = {
                "title": card.get("title"),
                "price": card.get("price"),
                "city": card.get("city"),
                "model_year": card.get("model_year"),
                "transmission": card.get("transmission"),
                "mileage": card.get("mileage"),
                "url": listing_url,
                "description": "",
                "posted_time": "",
                "source": "olx",
            }
            results.append(clean)
            if on_listing is not None:
                try:
                    on_listing(clean)
                except Exception:
                    logger.exception("OLX on_listing callback failed")
            if len(results) >= listing_limit:
                logger.info("OLX: reached max_listings=%s", listing_limit)
                break

        if len(results) >= listing_limit:
            break

        time.sleep(request_delay_sec)

    logger.info("OLX scrape done listings_collected=%s", len(results))
    return results


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print(
            "Usage: python olx.py <olx_cars_search_url>\n"
            "Example: python olx.py 'https://www.olx.com.pk/punjab_g2003006/cars_c84?filter=new_used_eq_used'",
            file=sys.stderr,
        )
        sys.exit(2)
    cars = scrape_olx(sys.argv[1], max_listings=10)
    print(json.dumps(cars, indent=2, ensure_ascii=False))
