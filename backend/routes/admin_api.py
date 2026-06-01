"""Admin API: users and listings overview."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import PakwheelsListing, ROLE_ADMIN, ROLE_USER, User
from routes.auth.deps import get_current_admin, get_db_session
from services import auth_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUserPatch(BaseModel):
    is_active: bool | None = None
    role: str | None = Field(default=None, pattern="^(user|admin)$")
    account_type: str | None = None


@router.get("/stats")
async def admin_stats(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
):
    users_count = await session.scalar(select(func.count()).select_from(User))
    listings_count = await session.scalar(select(func.count()).select_from(PakwheelsListing))
    wheelwise_count = await session.scalar(
        select(func.count()).select_from(PakwheelsListing).where(PakwheelsListing.source == "wheelwise")
    )
    return {
        "users": users_count or 0,
        "listings": listings_count or 0,
        "wheelwise_listings": wheelwise_count or 0,
    }


@router.get("/users")
async def list_users(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    total = await session.scalar(select(func.count()).select_from(User))
    result = await session.execute(
        select(User).order_by(User.id.desc()).limit(limit).offset(offset)
    )
    users = result.scalars().all()
    return {"total": total or 0, "items": [auth_service.user_to_public(u) for u in users]}


@router.patch("/users/{user_id}")
async def patch_user(
    user_id: int,
    body: AdminUserPatch,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
):
    user = await auth_service.get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and body.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.role is not None:
        if body.role not in (ROLE_USER, ROLE_ADMIN):
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = body.role
    if body.account_type is not None:
        user.account_type = auth_service.normalize_account_type(body.account_type)
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(user)
    return auth_service.user_to_public(user)


@router.get("/listings")
async def list_listings(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    source: str | None = None,
):
    q = select(PakwheelsListing)
    count_q = select(func.count()).select_from(PakwheelsListing)
    if source:
        q = q.where(PakwheelsListing.source == source)
        count_q = count_q.where(PakwheelsListing.source == source)
    total = await session.scalar(count_q)
    result = await session.execute(
        q.order_by(PakwheelsListing.id.desc()).limit(limit).offset(offset)
    )
    rows = result.scalars().all()
    items = [
        {
            "id": r.id,
            "title": r.title,
            "price": r.price,
            "city": r.city,
            "source": r.source,
            "url": r.url,
            "user_id": r.user_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
    return {"total": total or 0, "items": items}
