"""Dashboard settings: LLM providers, scrape caps, background jobs."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services import settings_repo
from services.crypto_secret import mask_key

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ProviderKeyBody(BaseModel):
    api_key: str = Field(..., min_length=1, max_length=2048)
    extra_json: dict[str, Any] | None = None


class SettingKV(BaseModel):
    key: str
    value: Any


class LocalModelBody(BaseModel):
    model_id: str = Field(..., max_length=256)
    enabled: bool = True
    is_default: bool = False


class BackgroundJobBody(BaseModel):
    id: int | None = None
    name: str = ""
    cron_expr: str | None = None
    interval_seconds: int | None = None
    pakwheels_url: str = ""
    olx_url: str = ""
    use_ai: bool = False
    ai_nl_query: str | None = None
    enabled: bool = True
    max_listings: int = 25


@router.get("")
async def get_all_settings():
    keys = [
        "llm.default_provider",
        "llm.fallback_order",
        "llm.default_model",
        "scrape.max_pages",
        "scrape.max_listings",
        "scrape.max_age_hours",
        "local.base_url",
        "news.rss_urls",
        "news.relevance_keywords",
        "fuel.source_urls",
        "demanded.price_cap_pkr",
        "demanded.queries",
    ]
    out = {}
    for k in keys:
        out[k] = await settings_repo.get_setting(k)
    creds = await settings_repo.list_provider_credentials()
    locals_ = await settings_repo.list_local_models()
    jobs = await settings_repo.list_background_jobs()
    return {
        "settings": out,
        "credentials": creds,
        "local_models": locals_,
        "background_jobs": jobs,
    }


@router.post("/kv")
async def set_kv(body: SettingKV):
    await settings_repo.set_setting(body.key, body.value)
    return {"ok": True}


@router.post("/credentials/{provider}")
async def set_credential(provider: str, body: ProviderKeyBody):
    try:
        await settings_repo.upsert_provider_credential(
            provider=provider.lower(),
            api_key_plain=body.api_key,
            extra=body.extra_json,
            is_active=True,
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e)) from e
    return {"ok": True, "masked": mask_key(body.api_key)}


@router.delete("/credentials/{provider}")
async def del_credential(provider: str):
    await settings_repo.delete_provider_credential(provider.lower())
    return {"ok": True}


@router.post("/local-models")
async def add_local_model(body: LocalModelBody):
    from sqlalchemy import select, update

    from database_models import LocalModel
    from db import get_async_session_factory

    sf = get_async_session_factory()
    async with sf() as session:
        if body.is_default:
            await session.execute(update(LocalModel).values(is_default=False))
        row = LocalModel(model_id=body.model_id, enabled=body.enabled, is_default=body.is_default)
        session.add(row)
        await session.commit()
    return {"ok": True}


@router.post("/background-jobs")
async def save_job(body: BackgroundJobBody):
    jid = await settings_repo.upsert_background_job(body.model_dump())
    return {"ok": True, "id": jid}


@router.delete("/background-jobs/{job_id}")
async def remove_job(job_id: int):
    await settings_repo.delete_background_job(job_id)
    return {"ok": True}


@router.get("/external/{kind}")
async def external_recent(
    kind: str,
    relevant: bool = Query(
        True,
        description="For kind=news: keep headlines that match automotive/mobility keywords (with fallback).",
    ),
    limit: int = Query(30, ge=1, le=150),
):
    if kind == "news" and relevant:
        return {"items": await settings_repo.recent_news_relevant(limit=limit)}
    return {"items": await settings_repo.recent_external_snapshots(kind, limit=limit)}
