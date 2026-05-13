"""Unified LLM completion with provider fallback (NVIDIA NIM, OpenAI, Anthropic, local OpenAI-compatible)."""

from __future__ import annotations

import logging
import os

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from services import settings_repo

_log = logging.getLogger(__name__)


async def chat_completion(
    messages: list[dict[str, str]],
    *,
    model_override: str | None = None,
    temperature: float = 0.2,
) -> tuple[str, str, str]:
    """
    Returns (assistant_text, model_used, provider_used).
    Tries providers in fallback order until one succeeds.
    """
    primary = await settings_repo.get_setting("llm.default_provider", "nvidia")
    fallback = await settings_repo.get_setting("llm.fallback_order", ["nvidia", "openai", "anthropic", "local"])
    default_model = await settings_repo.get_setting("llm.default_model", "z-ai/glm-5.1")

    chain: list[str] = []
    if isinstance(fallback, list):
        chain = [str(x).lower() for x in fallback]
    if primary and str(primary).lower() not in chain:
        chain.insert(0, str(primary).lower())
    else:
        chain.insert(0, str(primary).lower())

    seen: set[str] = set()
    order = []
    for p in chain:
        if p not in seen:
            seen.add(p)
            order.append(p)

    last_err: Exception | None = None
    for provider in order:
        try:
            model = model_override or default_model
            text, used_model = await _complete_provider(provider, messages, model, temperature)
            return text, used_model, provider
        except Exception as e:
            last_err = e
            _log.warning("LLM provider %s failed: %s", provider, e)

    raise RuntimeError(f"All LLM providers failed. Last error: {last_err}")


async def _complete_provider(
    provider: str,
    messages: list[dict[str, str]],
    model: str,
    temperature: float,
) -> tuple[str, str]:
    p = provider.lower()

    if p == "nvidia":
        key = await settings_repo.get_decrypted_key("nvidia") or os.environ.get("NVIDIA_NIM_API_KEY", "").strip()
        if not key:
            raise ValueError("NVIDIA key missing (settings or NVIDIA_NIM_API_KEY)")
        base = "https://integrate.api.nvidia.com/v1"
        client = AsyncOpenAI(base_url=base, api_key=key)
        timeout = float(os.environ.get("NIM_TIMEOUT_SEC", "120"))
        r = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            timeout=timeout,
        )
        content = (r.choices[0].message.content or "").strip()
        if not content:
            raise ValueError("empty NVIDIA reply")
        return content, model

    if p == "openai":
        key = await settings_repo.get_decrypted_key("openai") or os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            raise ValueError("OpenAI key missing")
        client = AsyncOpenAI(api_key=key)
        r = await client.chat.completions.create(model=model, messages=messages, temperature=temperature)
        content = (r.choices[0].message.content or "").strip()
        if not content:
            raise ValueError("empty OpenAI reply")
        return content, model

    if p == "anthropic":
        key = await settings_repo.get_decrypted_key("anthropic") or os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not key:
            raise ValueError("Anthropic key missing")
        sys_parts: list[str] = []
        anth_msgs: list[dict[str, str]] = []
        for m in messages:
            if m["role"] == "system":
                sys_parts.append(m["content"])
            elif m["role"] in ("user", "assistant"):
                anth_msgs.append({"role": m["role"], "content": m["content"]})
        system = "\n\n".join(sys_parts)
        cli = AsyncAnthropic(api_key=key)
        amodel = os.environ.get("ANTHROPIC_MODEL", "").strip()
        if not amodel or not amodel.startswith("claude"):
            amodel = "claude-3-5-sonnet-20241022"
        r = await cli.messages.create(
            model=amodel,
            max_tokens=4096,
            system=system,
            messages=anth_msgs,
        )
        block = r.content[0]
        text = getattr(block, "text", str(block))
        return text.strip(), amodel

    if p == "local":
        base = await settings_repo.get_setting("local.base_url", "http://127.0.0.1:11434/v1")
        key = await settings_repo.get_decrypted_key("local") or "ollama"
        client = AsyncOpenAI(base_url=str(base).rstrip("/"), api_key=key)
        # pick default local model from LocalModel table or env
        from sqlalchemy import select

        from database_models import LocalModel
        from db import get_async_session_factory

        sf = get_async_session_factory()
        async with sf() as session:
            result = await session.execute(
                select(LocalModel).where(LocalModel.is_default.is_(True), LocalModel.enabled.is_(True)).limit(1)
            )
            lm = result.scalar_one_or_none()
            lmodel = lm.model_id if lm else os.environ.get("OLLAMA_MODEL", "llama3.2")
        use_model = model_override or lmodel
        r = await client.chat.completions.create(
            model=use_model,
            messages=messages,
            temperature=temperature,
            timeout=120.0,
        )
        content = (r.choices[0].message.content or "").strip()
        if not content:
            raise ValueError("empty local reply")
        return content, use_model

    raise ValueError(f"unknown provider {provider}")
