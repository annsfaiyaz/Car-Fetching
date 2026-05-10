"""NVIDIA NIM OpenAI-compatible async chat client.

Drop-in replacement for local Ollama calls.
Set NVIDIA_NIM_API_KEY in .env to enable.
"""

from __future__ import annotations

import os

from openai import AsyncOpenAI

NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "z-ai/glm-5.1"


def _client() -> AsyncOpenAI:
    api_key = os.environ.get("NVIDIA_NIM_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "NVIDIA_NIM_API_KEY is not set. Add it to your .env file."
        )
    return AsyncOpenAI(base_url=NIM_BASE_URL, api_key=api_key)


def get_model(override: str | None = None) -> str:
    return (
        override
        or os.environ.get("NIM_MODEL", DEFAULT_MODEL)
    ).strip()


async def chat(
    *,
    messages: list[dict[str, str]],
    model: str,
    timeout: float | None = None,
) -> str:
    """Send messages and return the assistant reply as a plain string."""
    if timeout is None:
        timeout = float(os.environ.get("NIM_TIMEOUT_SEC", "120"))

    client = _client()
    response = await client.chat.completions.create(
        model=model,
        messages=messages,  # type: ignore[arg-type]
        timeout=timeout,
    )
    content = (response.choices[0].message.content or "").strip()
    if not content:
        raise ValueError("NVIDIA NIM returned an empty reply")
    return content
