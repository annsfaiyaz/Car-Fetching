"""
Normalize legacy / AI-hallucinated marketplace search URLs before scraping.

PakWheels retired path-style URLs like ``/used-cars/honda/city/gujranwala/?price_to=…``
(they 301 to the homepage with no listing cards). The supported shape is documented in
``docs/pakwheels_patterns.md`` (``/used-cars/search/-/ct_…/mk_…/``).

OLX requires city tokens from ``docs/olx_patterns.md`` (e.g. ``gujranwala_g4060662``),
not invented ``_g2003…`` regional ids or bare ``?price=`` query keys.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

logger = logging.getLogger(__name__)

# docs/olx_patterns.md — canonical location path segments
_OLX_LOCATION_TOKENS: dict[str, str] = {
    "karachi": "karachi_g4060669",
    "lahore": "lahore_g4060673",
    "islamabad": "islamabad_g4060671",
    "gujranwala": "gujranwala_g4060662",
    "faisalabad": "faisalabad_g4060667",
}

_LEGACY_PW_RE = re.compile(
    r"^/used-cars/(?P<make>[^/]+)/(?P<model>[^/]+)/(?P<city>[^/]+)/?$",
    re.IGNORECASE,
)


def canonicalize_pakwheels_search_url(url: str) -> str:
    """Rewrite deprecated PakWheels path URLs to ``/used-cars/search/-/…`` form."""
    raw = (url or "").strip()
    if not raw or "pakwheels.com" not in raw.lower():
        return raw

    parsed = urlparse(raw)
    path = parsed.path.rstrip("/") or "/"
    if "/used-cars/search/" in path.lower():
        return raw

    m = _LEGACY_PW_RE.match(path)
    if not m:
        return raw

    make = m.group("make").strip().lower()
    model = m.group("model").strip().lower()
    city = m.group("city").strip().lower()
    q = parse_qs(parsed.query)

    segments = [f"ct_{city}", f"mk_{make}", f"md_{model}"]
    price_to = (q.get("price_to") or q.get("price_max") or [None])[0]
    if price_to:
        digits = re.sub(r"[^\d]", "", str(price_to))
        if digits:
            segments.append(f"pr_less_{digits}")
            q.pop("price_to", None)
            q.pop("price_max", None)

    new_path = "/used-cars/search/-/" + "/".join(segments) + "/"
    if not q.get("sortby"):
        q["sortby"] = ["date_desc"]
    new_query = urlencode({k: v[0] for k, v in q.items() if v and v[0]})
    out = urlunparse(parsed._replace(path=new_path, query=new_query))
    logger.info("PakWheels URL canonicalized legacy path → %s", out)
    return out


def canonicalize_olx_search_url(url: str) -> str:
    """Fix common OLX URL mistakes (wrong city id, ``?price=``, sort tokens)."""
    raw = (url or "").strip()
    if not raw or "olx.com.pk" not in raw.lower():
        return raw

    parsed = urlparse(raw)
    path = parsed.path
    q = parse_qs(parsed.query)
    changed = False

    low_path = path.lower()
    for city, token in _OLX_LOCATION_TOKENS.items():
        if city not in low_path:
            continue
        wrong = re.search(rf"({re.escape(city)})_g\d+", path, re.IGNORECASE)
        if wrong and wrong.group(0).lower() != token.lower():
            path = re.sub(rf"{re.escape(city)}_g\d+", token, path, flags=re.IGNORECASE)
            changed = True

    price_val = (q.pop("price", None) or [None])[0]
    if price_val:
        digits = re.sub(r"[^\d]", "", str(price_val))
        if digits:
            existing = (q.get("filter") or [""])[0]
            price_filter = f"price_between_0_to_{digits}"
            if existing:
                parts = [p for p in existing.split(",") if p and not p.startswith("price_")]
                parts.insert(0, price_filter)
                q["filter"] = [",".join(parts)]
            else:
                q["filter"] = [price_filter]
            changed = True

    sort = (q.get("sort") or [""])[0]
    if sort and sort.lower() in ("relevance_desc", "relevance"):
        q["sort"] = ["desc"]
        changed = True
    elif not sort and "cars_c84" in low_path:
        q["sort"] = ["desc"]
        changed = True

    if not changed:
        return raw

    new_query = urlencode({k: v[0] for k, v in q.items() if v and v[0]})
    out = urlunparse(parsed._replace(path=path, query=new_query))
    logger.info("OLX URL canonicalized → %s", out)
    return out
