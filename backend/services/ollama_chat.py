"""RAG-style chat: assistant grounded on SQLite listing snapshot."""

from __future__ import annotations

from typing import Any

from services.llm_router import chat_completion

CHAT_SYSTEM_PREFIX = """You are an assistant for the automotive industry, focused on Pakistan's used-car market (PakWheels and OLX listings).

Behavior:
- When the user asks about specific cars, prices, cities, or inventory, rely ONLY on the "Listing snapshot" section below. Quote or summarize from it; if something is not in the snapshot, say you do not see it in the current database view.
- You may answer general car-industry questions (maintenance, segments, buying tips) from general knowledge, and clearly separate that from what is in the snapshot.
- Be concise. PKR amounts are in Pakistani Rupees. Mention that listing data is scraped and may be incomplete or stale.

---

"""


def _truncate(s: str, max_len: int) -> str:
    s = s.strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 1].rstrip() + "…"


def build_listings_snapshot(
    items: list[dict[str, Any]],
    *,
    total_in_db: int,
    filtered_by_search_url: bool,
    search_url_display: str | None,
    max_items: int,
    max_total_chars: int,
    max_desc_len: int,
) -> str:
    """Compact text block for the LLM context window."""
    header_lines = [
        "Listing snapshot (from the user's SQLite database — not live marketplaces):",
        f"- Total rows in database (all searches): {total_in_db}",
    ]
    if filtered_by_search_url and search_url_display:
        header_lines.append(f"- This view is filtered to listings saved under search URL: {search_url_display}")
    elif filtered_by_search_url:
        header_lines.append("- This view is filtered by the current search URL.")
    else:
        header_lines.append("- This view includes all listings in the database (no search URL filter).")

    shown = items[: max(0, max_items)]
    header_lines.append(f"- Rows included below: {len(shown)} (cap={max_items}).")

    lines: list[str] = ["\n".join(header_lines), ""]
    used = sum(len(x) + 1 for x in lines)

    for row in shown:
        lid = row.get("id", "")
        title = row.get("title") or "—"
        price = row.get("price")
        price_s = f"PKR {price:,}" if isinstance(price, int) else "—"
        city = row.get("city") or "—"
        year = row.get("model_year")
        trans = row.get("transmission") or "—"
        mileage = row.get("mileage")
        km_s = f"{mileage:,} km" if isinstance(mileage, int) else "—"
        posted = row.get("posted_time") or "—"
        url = row.get("url") or ""
        desc = _truncate(str(row.get("description") or ""), max_desc_len)
        origin = row.get("search_origin") or "legacy"
        src = row.get("source") or "pakwheels"
        line = (
            f"- id={lid} | source={src} | origin={origin} | {title} | {price_s} | {city} | year={year} | {trans} | {km_s} | bump={posted} | {desc}\n  url={url}"
        )
        if used + len(line) > max_total_chars:
            lines.append(f"... truncated further rows to stay within size budget ({max_total_chars} chars).")
            break
        lines.append(line)
        used += len(line) + 1

    if not shown:
        lines.append("(No listing rows in this snapshot — database may be empty or filter matched nothing.)")

    return "\n".join(lines)


async def chat_with_listings_context(
    *,
    messages: list[dict[str, str]],
    listings_snapshot: str,
    model_override: str | None,
) -> tuple[str, str]:
    """
    ``messages``: user/assistant turns only (no system); last message must be user.
    Returns (assistant_reply, model_used_tag).
    """
    system_content = CHAT_SYSTEM_PREFIX + listings_snapshot
    all_messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
    all_messages.extend(messages)

    content, model_used, provider_used = await chat_completion(all_messages, model_override=model_override)
    return content, f"{model_used}@{provider_used}"
