"""Application settings and credentials (SQLite)."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select

from database_models import (
    AppSetting,
    BackgroundJob,
    ExternalSnapshot,
    LocalModel,
    PlatformSearchHint,
    ProviderCredential,
)
from db import get_async_session_factory

# Substrings used when ``news.relevance_keywords`` is unset — filters RSS snapshots for cars/mobility relevance.
DEFAULT_NEWS_RELEVANCE_KEYWORDS = [
    "car",
    "auto",
    "vehicle",
    "suv",
    "sedan",
    "diesel",
    "petrol",
    "electric",
    "ev",
    "hybrid",
    "fuel",
    "motor",
    "automotive",
    "toyota",
    "honda",
    "suzuki",
    "hyundai",
    "kia",
    "corolla",
    "civic",
    "swift",
    "pakistan",
    "lahore",
    "karachi",
    "traffic",
    "motorway",
    "wheel",
]


def _dump(v: Any) -> str:
    if isinstance(v, str):
        return json.dumps({"_s": v})
    return json.dumps(v)


def _load(raw: str | None) -> Any:
    if not raw:
        return None
    try:
        o = json.loads(raw)
        if isinstance(o, dict) and "_s" in o:
            return o["_s"]
        return o
    except json.JSONDecodeError:
        return raw


async def get_setting(key: str, default: Any = None) -> Any:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(AppSetting, key)
        if row is None:
            return default
        return _load(row.value_json)


async def set_setting(key: str, value: Any) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(AppSetting, key)
        payload = _dump(value)
        if row is None:
            session.add(AppSetting(key=key, value_json=payload))
        else:
            row.value_json = payload
        await session.commit()


async def list_provider_credentials() -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(ProviderCredential).order_by(ProviderCredential.id))
        rows = result.scalars().all()
        out = []
        for r in rows:
            out.append(
                {
                    "id": r.id,
                    "provider": r.provider,
                    "has_key": bool(r.api_key_encrypted),
                    "extra": json.loads(r.extra_json) if r.extra_json else {},
                    "is_active": r.is_active,
                }
            )
        return out


async def upsert_provider_credential(
    *,
    provider: str,
    api_key_plain: str | None,
    extra: dict[str, Any] | None,
    is_active: bool = True,
) -> None:
    from services.crypto_secret import encrypt_secret

    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(ProviderCredential).where(ProviderCredential.provider == provider))
        row = result.scalar_one_or_none()
        enc = None
        if api_key_plain is not None and api_key_plain.strip():
            enc = encrypt_secret(api_key_plain.strip())
        extra_s = json.dumps(extra or {})
        if row is None:
            session.add(
                ProviderCredential(
                    provider=provider,
                    api_key_encrypted=enc,
                    extra_json=extra_s,
                    is_active=is_active,
                )
            )
        else:
            if enc is not None:
                row.api_key_encrypted = enc
            row.extra_json = extra_s
            row.is_active = is_active
        await session.commit()


async def get_decrypted_key(provider: str) -> str | None:
    from services.crypto_secret import decrypt_secret

    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(
            select(ProviderCredential).where(
                ProviderCredential.provider == provider,
                ProviderCredential.is_active.is_(True),
            )
        )
        row = result.scalar_one_or_none()
        if row is None or not row.api_key_encrypted:
            return None
        try:
            return decrypt_secret(row.api_key_encrypted)
        except ValueError:
            return None


async def delete_provider_credential(provider: str) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        await session.execute(delete(ProviderCredential).where(ProviderCredential.provider == provider))
        await session.commit()


async def get_platform_hint(platform: str) -> str:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(PlatformSearchHint, platform)
        return row.body if row else ""


async def set_platform_hint(platform: str, body: str) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(PlatformSearchHint, platform)
        if row is None:
            session.add(PlatformSearchHint(platform=platform, body=body))
        else:
            row.body = body
        await session.commit()


async def list_local_models() -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(LocalModel).order_by(LocalModel.id))
        rows = result.scalars().all()
        return [{"id": r.id, "model_id": r.model_id, "enabled": r.enabled, "is_default": r.is_default} for r in rows]


async def seed_local_models_from_env() -> None:
    raw = os.environ.get("LOCAL_MODELS_ALLOWLIST", "").strip()
    if not raw:
        return
    ids = [x.strip() for x in raw.split(",") if x.strip()]
    sf = get_async_session_factory()
    async with sf() as session:
        for mid in ids:
            exists = await session.scalar(select(LocalModel).where(LocalModel.model_id == mid))
            if exists is None:
                session.add(LocalModel(model_id=mid, enabled=True, is_default=False))
        await session.commit()


async def seed_default_settings() -> None:
    defaults = [
        ("llm.default_provider", "nvidia"),
        ("llm.fallback_order", ["nvidia", "openai", "anthropic", "local"]),
        ("llm.default_model", os.environ.get("NIM_MODEL", "z-ai/glm-5.1")),
        ("scrape.max_pages", 3),
        ("scrape.max_listings", 25),
        ("scrape.max_age_hours", 48),
        ("search.cache_min_listings", 3),
        ("local.base_url", os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")),
        ("news.rss_urls", []),
        ("fuel.source_urls", []),
        ("demanded.price_cap_pkr", 3_000_000),
        ("demanded.queries", []),
    ]
    sf = get_async_session_factory()
    async with sf() as session:
        for key, val in defaults:
            row = await session.get(AppSetting, key)
            if row is None:
                session.add(AppSetting(key=key, value_json=_dump(val)))
        await session.commit()


async def list_background_jobs() -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        result = await session.execute(select(BackgroundJob).order_by(BackgroundJob.id))
        rows = result.scalars().all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "cron_expr": r.cron_expr,
                "interval_seconds": r.interval_seconds,
                "pakwheels_url": r.pakwheels_url,
                "olx_url": r.olx_url,
                "use_ai": r.use_ai,
                "ai_nl_query": r.ai_nl_query,
                "enabled": r.enabled,
                "max_listings": r.max_listings,
            }
            for r in rows
        ]


async def upsert_background_job(data: dict[str, Any]) -> int:
    sf = get_async_session_factory()
    async with sf() as session:
        jid = data.get("id")
        if jid:
            row = await session.get(BackgroundJob, jid)
            if row:
                for k in ("name", "cron_expr", "interval_seconds", "pakwheels_url", "olx_url", "use_ai", "ai_nl_query", "enabled", "max_listings"):
                    if k in data:
                        setattr(row, k, data[k])
                await session.commit()
                return row.id
        row = BackgroundJob(
            name=data.get("name") or "job",
            cron_expr=data.get("cron_expr"),
            interval_seconds=data.get("interval_seconds"),
            pakwheels_url=data.get("pakwheels_url") or "",
            olx_url=data.get("olx_url") or "",
            use_ai=bool(data.get("use_ai")),
            ai_nl_query=data.get("ai_nl_query"),
            enabled=bool(data.get("enabled", True)),
            max_listings=int(data.get("max_listings") or 25),
        )
        session.add(row)
        await session.commit()
        await session.refresh(row)
        return row.id


async def delete_background_job(job_id: int) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        row = await session.get(BackgroundJob, job_id)
        if row:
            await session.delete(row)
            await session.commit()


async def add_external_snapshot(*, kind: str, title: str, body: str, source_url: str) -> None:
    sf = get_async_session_factory()
    async with sf() as session:
        session.add(
            ExternalSnapshot(
                kind=kind,
                title=title,
                body=body,
                source_url=source_url,
                fetched_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()


async def recent_external_snapshots(kind: str | None, limit: int = 20) -> list[dict[str, Any]]:
    sf = get_async_session_factory()
    async with sf() as session:
        if kind:
            stmt = (
                select(ExternalSnapshot)
                .where(ExternalSnapshot.kind == kind)
                .order_by(ExternalSnapshot.fetched_at.desc())
                .limit(limit)
            )
        else:
            stmt = select(ExternalSnapshot).order_by(ExternalSnapshot.fetched_at.desc()).limit(limit)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "id": r.id,
                "kind": r.kind,
                "title": r.title,
                "body": r.body[:2000],
                "source_url": r.source_url,
                "fetched_at": r.fetched_at.isoformat() if r.fetched_at else None,
            }
            for r in rows
        ]


async def recent_news_relevant(limit: int = 30) -> list[dict[str, Any]]:
    """Recent ``news`` snapshots whose title/body match mobility keywords, with fallback fill."""
    lim = max(1, min(int(limit), 150))
    pool_size = min(max(lim * 5, 60), 400)

    sf = get_async_session_factory()
    async with sf() as session:
        row_kw = await session.get(AppSetting, "news.relevance_keywords")
        raw_kw = _load(row_kw.value_json) if row_kw else None
        if isinstance(raw_kw, list) and len(raw_kw) > 0:
            keywords = [str(k).strip().lower() for k in raw_kw if str(k).strip()]
        else:
            keywords = list(DEFAULT_NEWS_RELEVANCE_KEYWORDS)

        stmt = (
            select(ExternalSnapshot)
            .where(ExternalSnapshot.kind == "news")
            .order_by(ExternalSnapshot.fetched_at.desc())
            .limit(pool_size)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()

        def row_dict(r: ExternalSnapshot) -> dict[str, Any]:
            return {
                "id": r.id,
                "kind": r.kind,
                "title": r.title,
                "body": (r.body or "")[:2000],
                "source_url": r.source_url,
                "fetched_at": r.fetched_at.isoformat() if r.fetched_at else None,
            }

        candidates = [row_dict(r) for r in rows]

        def matches(item: dict[str, Any]) -> bool:
            blob = f"{item.get('title') or ''} {(item.get('body') or '')} {(item.get('source_url') or '')}".lower()
            return any(k in blob for k in keywords)

        matched = [x for x in candidates if matches(x)]
        out = matched[:lim]
        if len(out) < lim:
            seen = {x["id"] for x in out}
            for x in candidates:
                if x["id"] not in seen:
                    out.append(x)
                    seen.add(x["id"])
                    if len(out) >= lim:
                        break
        return out[:lim]
