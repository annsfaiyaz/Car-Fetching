"""Turn natural language into an OLX Pakistan cars search URL (multi-provider LLM)."""

from __future__ import annotations

import re
from pathlib import Path

from services.feedback_repo import feedback_digest_for_query
from services.listings_repo import norm_search_url
from services.llm_router import chat_completion

_DOCS_DIR = Path(__file__).resolve().parents[2] / "docs"


def _read_kb_doc(filename: str) -> str:
    path = _DOCS_DIR / filename
    if not path.is_file():
        return f"*(Knowledge file missing: {path})*\n"
    return path.read_text(encoding="utf-8")


def _read_optional_user_patterns(filename: str) -> str:
    path = _DOCS_DIR / filename
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8").strip()


def build_olx_expert_system_prompt() -> str:
    patterns = _read_kb_doc("olx_patterns.md")
    extraction = _read_kb_doc("olx_extraction.md")
    user_extra = _read_optional_user_patterns("olx_patterns_user.md")
    optional_block = ""
    if user_extra:
        optional_block = (
            "\n\n### Optional overrides (docs/olx_patterns_user.md)\n\n"
            + user_extra
            + "\n"
        )

    return f"""You are an **OLX Pakistan (Cars)** Search Expert. Translate car-buying requests into **one valid** OLX **cars** search URL (`cars_c84`).

## Knowledge base (authoritative)

### olx_patterns.md

{patterns}
{optional_block}
### olx_extraction.md

{extraction}

## Operating instructions

1. **Construct:** Follow **olx_patterns.md** only. Prefer regional routes like `punjab_g2003006/cars_c84` when location is broad; use filters for used cars, make, fuel, transmission, price/year when the user asks.
2. **Sort:** You may append `sort=relevance_desc` or price sorts documented in patterns.
3. **Output:** Respond with **exactly one line**: the full `https://www.olx.com.pk/...` URL as plain text — no markdown code fences, no quotes, no commentary.

Constraint: **Single URL only.** Must be **olx.com.pk** and include **`cars_c84`** (car category)."""


_URL_RE = re.compile(r"https?://[^\s\]`\"'<>)]+", re.IGNORECASE)


def _strip_from_response(text: str) -> str:
    t = text.strip()
    if "```" in t:
        chunks = re.split(r"```(?:\w*)?\s*", t)
        return "\n".join(chunks).strip()
    return t


def extract_olx_search_url(text: str) -> str | None:
    cleaned = _strip_from_response(text)
    for m in _URL_RE.finditer(cleaned):
        u = m.group(0).rstrip(".,);")
        low = u.lower()
        if "olx.com.pk" in low and ("cars_c84" in low or "_c84" in low):
            return u
    return None


async def suggest_olx_search_url(
    *,
    user_query: str,
    ai_prompt: str | None,
    model_override: str | None,
) -> tuple[str, str, str]:
    system = build_olx_expert_system_prompt()
    extra = (ai_prompt or "").strip()
    if extra:
        system = system + "\n\n## Additional user instructions\n\n" + extra

    fd = await feedback_digest_for_query(user_query)
    if fd:
        system += "\n\n## Past negative relevance\n\n" + fd

    user_msg = (
        "Build the OLX Pakistan cars search URL that best matches this intent:\n\n"
        + user_query.strip()
    )

    content, model_used, provider = await chat_completion(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        model_override=model_override,
    )

    raw_url = extract_olx_search_url(content)
    if not raw_url:
        raise ValueError(
            "Could not find an OLX Pakistan cars (cars_c84) URL in the model reply. "
            "Try rephrasing your search."
        )

    normalized = norm_search_url(raw_url)
    low = normalized.lower()
    if "olx.com.pk" not in low:
        raise ValueError("Parsed URL does not look like OLX Pakistan")

    return normalized, content, f"{model_used}@{provider}"
