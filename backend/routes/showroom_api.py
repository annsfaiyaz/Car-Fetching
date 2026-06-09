"""Showroom profile and listings endpoints."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import ACCOUNT_TYPE_SHOWROOM, PakwheelsListing, ShowroomProfile, User
from routes.auth.deps import get_current_user, get_db_session

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/showroom", tags=["showroom"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ShowroomOut(BaseModel):
    id: int
    user_id: int
    business_name: str
    city: str
    description: str
    logo_url: str | None
    contact_phone: str | None
    is_verified: bool
    total_listings: int = 0

    model_config = {"from_attributes": True}


class ShowroomSetupBody(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=256)
    city: str = Field(..., min_length=2, max_length=128)
    description: str = Field("", max_length=2000)
    logo_url: str | None = Field(None, max_length=2048)
    contact_phone: str | None = Field(None, max_length=32)


class ShowroomUpdateBody(BaseModel):
    business_name: str | None = Field(None, min_length=2, max_length=256)
    city: str | None = Field(None, min_length=2, max_length=128)
    description: str | None = Field(None, max_length=2000)
    logo_url: str | None = Field(None, max_length=2048)
    contact_phone: str | None = Field(None, max_length=32)


async def _total_listings(session: AsyncSession, user_id: int) -> int:
    result = await session.execute(
        select(func.count()).select_from(PakwheelsListing).where(
            PakwheelsListing.user_id == user_id,
            PakwheelsListing.user_hidden == False,  # noqa: E712
        )
    )
    return result.scalar_one()


async def _showroom_to_out(session: AsyncSession, s: ShowroomProfile) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "business_name": s.business_name,
        "city": s.city,
        "description": s.description,
        "logo_url": s.logo_url,
        "contact_phone": s.contact_phone,
        "is_verified": s.is_verified,
        "total_listings": await _total_listings(session, s.user_id),
    }


@router.get("/all")
async def list_showrooms(
    limit: int = Query(20, ge=1, le=100),
    city: str | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
):
    q = select(ShowroomProfile).where(ShowroomProfile.is_active == True)  # noqa: E712
    if city:
        q = q.where(ShowroomProfile.city.ilike(f"%{city}%"))
    q = q.order_by(ShowroomProfile.created_at.desc()).limit(limit)
    result = await session.execute(q)
    showrooms = result.scalars().all()
    items = [await _showroom_to_out(session, s) for s in showrooms]
    return {"items": items}


@router.get("/my")
async def get_my_showroom(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ShowroomProfile).where(ShowroomProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No showroom profile found")
    return await _showroom_to_out(session, profile)


@router.post("/setup", status_code=status.HTTP_201_CREATED)
async def setup_showroom(
    body: ShowroomSetupBody,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    user_types = [t.strip() for t in (user.account_type or "").split(",")]
    if ACCOUNT_TYPE_SHOWROOM not in user_types:
        raise HTTPException(status_code=403, detail="Only showroom accounts can create a showroom profile")
    existing = await session.execute(
        select(ShowroomProfile).where(ShowroomProfile.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Showroom profile already exists")
    now = _utcnow()
    profile = ShowroomProfile(
        user_id=user.id,
        business_name=body.business_name,
        city=body.city,
        description=body.description,
        logo_url=body.logo_url,
        contact_phone=body.contact_phone,
        created_at=now,
        updated_at=now,
    )
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return await _showroom_to_out(session, profile)


@router.put("/my")
async def update_my_showroom(
    body: ShowroomUpdateBody,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ShowroomProfile).where(ShowroomProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No showroom profile found")
    if body.business_name is not None:
        profile.business_name = body.business_name
    if body.city is not None:
        profile.city = body.city
    if body.description is not None:
        profile.description = body.description
    if body.logo_url is not None:
        profile.logo_url = body.logo_url
    if body.contact_phone is not None:
        profile.contact_phone = body.contact_phone
    profile.updated_at = _utcnow()
    await session.commit()
    await session.refresh(profile)
    return await _showroom_to_out(session, profile)


@router.get("/{showroom_id}")
async def get_showroom(
    showroom_id: int,
    session: AsyncSession = Depends(get_db_session),
):
    profile = await session.get(ShowroomProfile, showroom_id)
    if not profile or not profile.is_active:
        raise HTTPException(status_code=404, detail="Showroom not found")
    return await _showroom_to_out(session, profile)


@router.get("/{showroom_id}/listings")
async def get_showroom_listings(
    showroom_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    session: AsyncSession = Depends(get_db_session),
):
    profile = await session.get(ShowroomProfile, showroom_id)
    if not profile or not profile.is_active:
        raise HTTPException(status_code=404, detail="Showroom not found")
    q = (
        select(PakwheelsListing)
        .where(PakwheelsListing.user_id == profile.user_id, PakwheelsListing.user_hidden == False)  # noqa: E712
        .order_by(PakwheelsListing.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await session.execute(q)
    listings = result.scalars().all()
    return {"items": [
        {
            "id": l.id,
            "title": l.title,
            "price": l.price,
            "city": l.city,
            "model_year": l.model_year,
            "transmission": l.transmission,
            "mileage": l.mileage,
            "image_url": l.image_url,
            "source": l.source,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in listings
    ]}
