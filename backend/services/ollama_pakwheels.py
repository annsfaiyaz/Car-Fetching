"""Call NVIDIA NIM to turn natural language into a PakWheels search URL."""

from __future__ import annotations

import re
from pathlib import Path

from services import nim_client
from services.listings_repo import norm_search_url

_DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"


def _read_kb_doc(filename: str) -> str:
    path = _DOCS_DIR / filename
    if not path.is_file():
        return f"*(Knowledge file missing: {path})*\n"
    return path.read_text(encoding="utf-8")


def build_pakwheels_expert_system_prompt() -> str:
    """
    Role + knowledge from ``docs/pakwheels_patterns.md`` and ``docs/extraction_logic.md``.
    Loaded at request time so edits apply without server restart.
    """
    patterns = _read_kb_doc("pakwheels_patterns.md")
    extraction = _read_kb_doc("extraction_logic.md")

    return f"""You are a **PakWheels Search Expert**. Translate car-buying requests into **one valid** PakWheels **used-cars** search URL.

## Knowledge base (authoritative)

Do **not** invent URL path segments or query parameters that are not documented below.

### pakwheels_patterns.md

{patterns}

### extraction_logic.md

{extraction}

## Operating instructions

1. **Construct:** Follow **pakwheels_patterns.md** only. If a filter is not documented there, **omit it** — never guess parameters.
2. **Sort:** Prefer **`sortby=date_desc`** in the query string for the freshest listings (default). If the user asks for cheapest or lowest mileage, **still do not** invent undocumented `sortby` values — use **`date_desc`** unless another value is explicitly listed as allowed in pakwheels_patterns.md.
3. **Extract (for your reasoning):** When explaining parsing, use **extraction_logic.md** selectors only.
4. **Output:** Respond with **exactly one line**: the full `https://www.pakwheels.com/...` URL as plain text — no markdown code fences, no quotes, no commentary.

Constraint: **Single URL only.**"""


_URL_RE = re.compile(r"https?://[^\s\]`\"'<>)]+", re.IGNORECASE)
_PATH_RE = re.compile(r"(/used-cars/search[^\s\]`\"'<>)]+)", re.IGNORECASE)


def _strip_from_response(text: str) -> str:
    t = text.strip()
    if "```" in t:
        chunks = re.split(r"```(?:\w*)?\s*", t)
        return "\n".join(chunks).strip()
    return t


def extract_pakwheels_search_url(text: str) -> str | None:
    """Pull first plausible PakWheels used-cars search URL from model output."""
    cleaned = _strip_from_response(text)
    for m in _URL_RE.finditer(cleaned):
        u = m.group(0).rstrip(".,);")
        low = u.lower()
        if "pakwheels.com" in low and "/used-cars" in low:
            return u
    m = _PATH_RE.search(cleaned)
    if m:
        path = m.group(1).rstrip(".,);")
        return "https://www.pakwheels.com" + path
    return None


async def suggest_pakwheels_search_url(
    *,
    user_query: str,
    ai_prompt: str | None,
    model_override: str | None,
) -> tuple[str, str, str]:
    """
    Returns (normalized_url, raw_assistant_text, model_used).
    Raises httpx.HTTPError on transport/API errors, ValueError if no URL could be parsed.
    """
    model = nim_client.get_model(model_override)

    system = build_pakwheels_expert_system_prompt()
    extra = (ai_prompt or "").strip()
    if extra:
        system = system + "\n\n## Additional user instructions\n\n" + extra

    user_msg = (
        "Build the PakWheels used-cars search URL that best matches this intent:\n\n"
        + user_query.strip()
    )

    content = await nim_client.chat(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        model=model,
    )

    raw_url = extract_pakwheels_search_url(content)
    if not raw_url:
        raise ValueError(
            "Could not find a PakWheels used-cars URL in the model reply. "
            "Try rephrasing your search or tightening the AI instructions."
        )

    normalized = norm_search_url(raw_url)
    low = normalized.lower()
    if "pakwheels.com" not in low or "/used-cars" not in low:
        raise ValueError("Parsed URL does not look like a PakWheels used-cars URL")

    return normalized, content, model
