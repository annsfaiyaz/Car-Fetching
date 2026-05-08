"""
PakWheels used-car scraper (Gujranwala, price filter) using requests + BeautifulSoup.

pip install requests beautifulsoup4
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
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


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_relative_posted_time(text: str, *, now: datetime | None = None) -> datetime | None:
    """
    Parse PakWheels 'Updated … ago' strings into an approximate UTC datetime.
    """
    if not text:
        return None
    now = now or _utc_now()
    raw = text.strip()
    raw = re.sub(r"^Updated\s+", "", raw, flags=re.IGNORECASE).strip()
    low = raw.lower()

    if not raw:
        return None
    if "just now" in low or "a few seconds" in low:
        return now
    if re.search(r"\bseconds?\s*ago\b", low):
        return now

    m = re.search(r"(?:about\s+)?(\d+)\s*minutes?\s*ago", low)
    if m:
        return now - timedelta(minutes=int(m.group(1)))

    m = re.search(r"(?:about\s+)?(\d+)\s*(?:hours?|hrs?)\s*ago", low)
    if m:
        return now - timedelta(hours=int(m.group(1)))

    m = re.search(r"(?:about\s+)?(\d+)\s*days?\s*ago", low)
    if m:
        return now - timedelta(days=int(m.group(1)))

    m = re.search(r"(?:about\s+)?(\d+)\s*weeks?\s*ago", low)
    if m:
        return now - timedelta(weeks=int(m.group(1)))

    m = re.search(r"(?:about\s+)?(\d+)\s*months?\s*ago", low)
    if m:
        return now - timedelta(days=30 * int(m.group(1)))

    m = re.search(r"(?:about\s+)?(\d+)\s*years?\s*ago", low)
    if m:
        return now - timedelta(days=365 * int(m.group(1)))

    if "yesterday" in low or "last week" in low:
        return None

    if re.search(r"\btoday\b", low):
        return now

    return None


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_url(href: str, base: str = "https://www.pakwheels.com") -> str:
    href = (href or "").strip()
    if not href:
        return ""
    if href.startswith("http"):
        return href.split("#")[0]
    return f"{base.rstrip('/')}{href}".split("#")[0]


def _parse_price_pkr(text: str) -> tuple[int | None, str]:
    """Return (integer PKR, display string)."""
    if not text:
        return None, ""
    s = re.sub(r"\s+", " ", text.strip())
    low = s.lower()
    m = re.search(r"([\d,.]+)\s*(lac|lakh|lacs)", low)
    if m:
        n = float(m.group(1).replace(",", ""))
        pkr = int(round(n * 100_000))
        return pkr, s
    m = re.search(r"PKR\s*([\d,]+)", s, re.I)
    if m:
        pkr = int(m.group(1).replace(",", ""))
        return pkr, s
    m = re.search(r"([\d,]+)", s)
    if m:
        return int(m.group(1).replace(",", "")), s
    return None, s


def _extract_updated_snippet(li: BeautifulSoup) -> str:
    for sel in (".dated", ".ad-updated", "[class*='dated']", "[class*='update']"):
        el = li.select_one(sel)
        if el:
            t = el.get_text(" ", strip=True)
            if t:
                return t
    for node in li.find_all(string=re.compile(r"Updated\s+.+ago", re.I)):
        s = str(node).strip()
        if s:
            return s
    blob = li.get_text(" ", strip=True)
    m = re.search(r"Updated\s+.+?ago", blob, flags=re.I | re.DOTALL)
    if m:
        return re.sub(r"\s+", " ", m.group(0)).strip()
    return ""


def _digits_int(s: str | None) -> int | None:
    if not s:
        return None
    d = re.sub(r"[^\d]", "", s)
    return int(d) if d else None


def _extract_card_fields(li: BeautifulSoup) -> dict[str, Any]:
    """Best-effort fields from a search-result card."""
    title_el = li.select_one("a.car-name") or li.select_one("a[class*='car-name']")
    title = title_el.get_text(strip=True) if title_el else ""
    href = _normalize_url(title_el.get("href", "")) if title_el else ""

    price_el = li.select_one(".price-details") or li.select_one("[class*='price']")
    price_text = ""
    if price_el:
        price_text = price_el.get_text(" ", strip=True)
    if not price_text:
        strong = li.find("strong")
        if strong:
            price_text = strong.get_text(" ", strip=True)
    if not price_text:
        m = re.search(r"PKR\s*[\d,.]+(?:\s*(?:lac|lakh|lacs))?", li.get_text(" ", strip=True), re.I)
        if m:
            price_text = m.group(0)

    price_num, price_display = _parse_price_pkr(price_text)

    city = "Gujranwala"
    loc = li.select_one(".search-vehicle-info-2 li, .city-name, [class*='location']")
    if loc:
        loc_t = loc.get_text(strip=True)
        if loc_t and len(loc_t) < 80:
            city = loc_t

    blob = li.get_text("\n", strip=True)
    year = None
    my = re.search(r"(?:^|\s)(19|20)\d{2}(?:\s|$)", blob)
    if my:
        year = int(my.group(0).strip())

    mileage = None
    mk = re.search(r"([\d,]+)\s*km", blob, re.I)
    if mk:
        mileage = _digits_int(mk.group(1))

    transmission = None
    for kw in ("Automatic", "Manual"):
        if re.search(rf"\b{kw}\b", blob, re.I):
            transmission = kw
            break

    return {
        "title": title,
        "price": price_num,
        "price_display": price_display,
        "city": city,
        "model_year": year,
        "transmission": transmission,
        "mileage": mileage,
        "url": href,
    }


def _parse_detail_page(soup: BeautifulSoup) -> dict[str, Any]:
    """Merge specification table + seller comment from a listing detail page."""
    features: dict[str, str] = {}
    for item in soup.select("ul.car-specifications li"):
        label = item.select_one(".detail-sub-heading")
        val = item.select_one(".detail-sub-value")
        if label and val:
            features[label.get_text(strip=True)] = val.get_text(strip=True)

    desc_el = soup.select_one(".seller-comments p") or soup.select_one(".seller-comments")
    description = desc_el.get_text(" ", strip=True) if desc_el else ""

    year_raw = features.get("Year", "") or ""
    year_m = re.search(r"(19|20)\d{2}", year_raw)
    model_year = int(year_m.group(0)) if year_m else None

    mileage = _digits_int(features.get("Mileage", ""))
    transmission = features.get("Transmission")
    city = features.get("Location") or features.get("City")
    price_text = features.get("Price", "")
    price_num, _ = _parse_price_pkr(price_text)

    title = None
    mt = soup.find("meta", property="og:title")
    if mt and mt.get("content"):
        title = mt["content"].strip()

    return {
        "title": title,
        "price": price_num,
        "city": city,
        "model_year": model_year,
        "transmission": transmission,
        "mileage": mileage,
        "description": description,
    }


def _with_page_param(url: str, page: int) -> str:
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    if page <= 1:
        q.pop("page", None)
    else:
        q["page"] = [str(page)]
    new_query = urlencode({k: v[0] for k, v in q.items()})
    return urlunparse(parsed._replace(query=new_query))


def _ensure_default_sort(url: str) -> str:
    """
    Ensure a stable ``sortby`` when the URL omits it.

    Default ``date_desc`` matches ``docs/pakwheels_patterns.md`` (freshest listings).
    If the URL already sets ``sortby`` (e.g. from Ollama), leave it unchanged.
    """
    p = urlparse(url.strip())
    q = parse_qs(p.query)
    if q.get("sortby") and (q.get("sortby") or [""])[0]:
        return url.strip()
    q["sortby"] = ["date_desc"]
    new_query = urlencode({k: v[0] for k, v in q.items()})
    out = urlunparse(p._replace(query=new_query))
    logger.info("PakWheels: added sortby=date_desc to search URL (see docs/pakwheels_patterns.md)")
    return out


def _resolve_max_age_hours(explicit: int | None) -> int:
    """How far back 'Updated … ago' may be to include a listing (default: env or 168h = 7d)."""
    if explicit is not None:
        return max(1, min(int(explicit), 8760))
    raw = os.environ.get("PAKWHEELS_MAX_AGE_HOURS", "168").strip()
    try:
        return max(1, min(int(raw), 8760))
    except ValueError:
        return 168


def _resolve_max_pages(explicit: int | None) -> int:
    """Cap search result pages (default 3). Env: PAKWHEELS_MAX_PAGES."""
    if explicit is not None:
        return max(1, min(int(explicit), 50))
    raw = os.environ.get("PAKWHEELS_MAX_PAGES", "3").strip()
    try:
        return max(1, min(int(raw), 50))
    except ValueError:
        return 3


def _resolve_max_listings(explicit: int | None) -> int:
    """Cap total listings collected (default 50). Env: PAKWHEELS_MAX_LISTINGS."""
    if explicit is not None:
        return max(1, min(int(explicit), 500))
    raw = os.environ.get("PAKWHEELS_MAX_LISTINGS", "50").strip()
    try:
        return max(1, min(int(raw), 500))
    except ValueError:
        return 50


def scrape_pakwheels(
    url: str,
    *,
    max_age_hours: int | None = None,
    max_pages: int | None = None,
    max_listings: int | None = None,
    session: requests.Session | None = None,
    request_delay_sec: float = 0.35,
    detail_delay_sec: float = 0.4,
    on_listing: Callable[[dict[str, Any]], None] | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch used cars from the given PakWheels search ``url`` (full browser URL).
    Keeps listings whose bump time (\"Updated … ago\") falls within ``max_age_hours``
    (default from env ``PAKWHEELS_MAX_AGE_HOURS`` or 168 hours / 7 days).

    Stops when either ``max_pages`` (default 3) or ``max_listings`` (default 50) is reached.

    Each item includes:
    title, price (PKR int or null), city, model_year, transmission, mileage,
    url, description, posted_time (ISO-8601 UTC).
    """
    base_url = url.strip()
    if not base_url:
        raise ValueError("url is required (PakWheels used-car search URL)")
    fetch_url = _ensure_default_sort(base_url)
    hours = _resolve_max_age_hours(max_age_hours)
    page_limit = _resolve_max_pages(max_pages)
    listing_limit = _resolve_max_listings(max_listings)
    sess = session or requests.Session()
    sess.headers.update(DEFAULT_HEADERS)

    cutoff = _utc_now() - timedelta(hours=hours)
    results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    logger.info(
        "PakWheels scrape start original=%s fetch_url=%s max_age_hours=%s max_pages=%s max_listings=%s cutoff=%s",
        base_url,
        fetch_url,
        hours,
        page_limit,
        listing_limit,
        cutoff.isoformat(),
    )

    for page in range(1, page_limit + 1):
        added_before_page = len(results)
        page_url = _with_page_param(fetch_url, page)
        resp = sess.get(page_url, timeout=45)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("li.classified-listing")
        logger.info("PakWheels page %s: status=%s cards=%s", page, resp.status_code, len(cards))
        if not cards:
            if page == 1:
                logger.warning(
                    "PakWheels page 1 had zero li.classified-listing — check URL or HTML layout."
                )
            break

        stop_listing_fetch = False
        skipped_no_parseable_time = 0
        skipped_too_old = 0

        for li in cards:
            updated_raw = _extract_updated_snippet(li)
            posted_dt = parse_relative_posted_time(updated_raw)
            if posted_dt is None:
                skipped_no_parseable_time += 1
                continue
            if posted_dt.tzinfo is None:
                posted_dt = posted_dt.replace(tzinfo=timezone.utc)

            if posted_dt < cutoff:
                skipped_too_old += 1
                continue

            card = _extract_card_fields(li)
            listing_url = card.get("url") or ""
            if not listing_url or listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            row: dict[str, Any] = {
                "title": card.get("title"),
                "price": card.get("price"),
                "city": card.get("city") or "Gujranwala",
                "model_year": card.get("model_year"),
                "transmission": card.get("transmission"),
                "mileage": card.get("mileage"),
                "url": listing_url,
                "description": "",
                "posted_time": _iso(posted_dt),
            }

            try:
                time.sleep(detail_delay_sec)
                dr = sess.get(listing_url, timeout=45)
                dr.raise_for_status()
                dsoup = BeautifulSoup(dr.text, "html.parser")
                detail = _parse_detail_page(dsoup)
                if detail.get("title"):
                    row["title"] = detail["title"]
                if detail.get("price") is not None:
                    row["price"] = detail["price"]
                if detail.get("city"):
                    row["city"] = detail["city"]
                if detail.get("model_year") is not None:
                    row["model_year"] = detail["model_year"]
                if detail.get("transmission"):
                    row["transmission"] = detail["transmission"]
                if detail.get("mileage") is not None:
                    row["mileage"] = detail["mileage"]
                row["description"] = detail.get("description") or ""
            except requests.RequestException:
                row["description"] = row["description"] or ""

            # Normalized JSON-friendly shape for consumers
            clean = {
                "title": row.get("title"),
                "price": row.get("price"),
                "city": row.get("city"),
                "model_year": row.get("model_year"),
                "transmission": row.get("transmission"),
                "mileage": row.get("mileage"),
                "url": row.get("url"),
                "description": row.get("description") or "",
                "posted_time": row.get("posted_time"),
                "source": "pakwheels",
            }
            results.append(clean)
            if on_listing is not None:
                try:
                    on_listing(clean)
                except Exception:
                    logger.exception("on_listing callback failed")
            if len(results) >= listing_limit:
                logger.info(
                    "PakWheels: reached max_listings=%s (stop early)",
                    listing_limit,
                )
                stop_listing_fetch = True
                break

        added_this_page = len(results) - added_before_page
        if added_this_page == 0 and skipped_too_old > 0:
            stop_listing_fetch = True

        if page == 1:
            logger.info(
                "PakWheels page 1 summary: kept=%s skipped_unparsed_time=%s skipped_too_old=%s",
                len(results),
                skipped_no_parseable_time,
                skipped_too_old,
            )
            for i, li in enumerate(cards[:5]):
                ur = _extract_updated_snippet(li)
                pd = parse_relative_posted_time(ur)
                logger.info(
                    "PakWheels sample card[%s] updated_raw=%r parsed=%s",
                    i,
                    (ur[:120] + "…") if len(ur) > 120 else ur,
                    pd.isoformat() if pd else None,
                )

        time.sleep(request_delay_sec)

        if stop_listing_fetch:
            break

    logger.info(
        "PakWheels scrape done listings_collected=%s (limits: max_pages=%s max_listings=%s)",
        len(results),
        page_limit,
        listing_limit,
    )
    return results


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print(
            "Usage: python pakwheels.py <pakwheels_search_url>\n"
            "Example: python pakwheels.py "
            "'https://www.pakwheels.com/used-cars/search/-/ct_lahore/?sortby=date_desc'",
            file=sys.stderr,
        )
        sys.exit(2)
    cars = scrape_pakwheels(sys.argv[1])
    print(json.dumps(cars, indent=2, ensure_ascii=False))
