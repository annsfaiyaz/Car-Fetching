"""LLM-assisted spam / suspicious listing scoring."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from services.llm_router import chat_completion

_log = logging.getLogger(__name__)


async def score_listing(
    title: str,
    price: int | None,
    url: str,
) -> tuple[float, bool, str]:
    """
    Returns (spam_score 0..1, is_spam, reason).
    Heuristic: very low effort if LLM fails.
    """
    sys = (
        "You classify used-car listings in Pakistan (OLX / PakWheels) for likely spam, scam, or fake patterns. "
        "Reply with JSON only: {\"score\":0-1,\"spam\":true/false,\"reason\":\"short\"}."
    )
    user = f"title={title!r} price_pkr={price} url={url}"
    try:
        text, _, _ = await chat_completion(
            [{"role": "system", "content": sys}, {"role": "user", "content": user}],
            model_override=None,
            temperature=0.1,
        )
        m = re.search(r"\{[^{}]*\}", text, re.S)
        if m:
            data = json.loads(m.group(0))
            score = float(data.get("score", 0))
            spam = bool(data.get("spam", False))
            reason = str(data.get("reason", ""))[:500]
            return max(0.0, min(1.0, score)), spam, reason
    except Exception as e:
        _log.debug("spam AI skip: %s", e)
    return 0.0, False, ""
