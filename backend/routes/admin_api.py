"""Admin API: users and listings overview."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import PakwheelsListing, RentalBooking, RentalListing, ROLE_ADMIN, ROLE_USER, ShowroomProfile, User
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
    rent_listings_count = await session.scalar(select(func.count()).select_from(RentalListing))
    showrooms_count = await session.scalar(select(func.count()).select_from(ShowroomProfile))
    rent_bookings_count = await session.scalar(select(func.count()).select_from(RentalBooking))
    pending_bookings = await session.scalar(
        select(func.count()).select_from(RentalBooking).where(RentalBooking.status == "pending")
    )
    recent_users_result = await session.execute(
        select(User).order_by(User.id.desc()).limit(5)
    )
    recent_listings_result = await session.execute(
        select(PakwheelsListing).order_by(PakwheelsListing.id.desc()).limit(5)
    )
    recent_users = [
        {"id": u.id, "username": u.username, "email": u.email, "account_type": u.account_type, "role": u.role}
        for u in recent_users_result.scalars().all()
    ]
    recent_listings = [
        {"id": l.id, "title": l.title, "source": l.source, "price": l.price}
        for l in recent_listings_result.scalars().all()
    ]
    return {
        "users": users_count or 0,
        "listings": listings_count or 0,
        "wheelwise_ads": wheelwise_count or 0,
        "rent_listings": rent_listings_count or 0,
        "rent_bookings": rent_bookings_count or 0,
        "showrooms": showrooms_count or 0,
        "pending_bookings": pending_bookings or 0,
        "recent_users": recent_users,
        "recent_listings": recent_listings,
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


@router.get("/rent/listings")
async def admin_rent_listings(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    total = await session.scalar(select(func.count()).select_from(RentalListing))
    result = await session.execute(
        select(RentalListing, User.username, User.email)
        .outerjoin(User, RentalListing.owner_id == User.id)
        .order_by(RentalListing.id.desc())
        .limit(limit).offset(offset)
    )
    rows = result.all()
    items = [
        {
            "id": r.id,
            "title": r.title,
            "make": r.make,
            "model": r.model,
            "model_year": r.model_year,
            "car_type": r.car_type,
            "city": r.city,
            "price_per_day": r.price_per_day,
            "driver_included": r.driver_included,
            "is_active": r.is_active,
            "contact_phone": r.contact_phone,
            "owner_id": r.owner_id,
            "owner_username": username,
            "owner_email": email,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, username, email in rows
    ]
    return {"total": total or 0, "items": items}


@router.get("/rent/bookings")
async def admin_rent_bookings(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None),
):
    q = select(RentalBooking, RentalListing.title, RentalListing.city, User.username, User.email)
    q = q.join(RentalListing, RentalBooking.listing_id == RentalListing.id)
    q = q.outerjoin(User, RentalListing.owner_id == User.id)
    count_q = select(func.count()).select_from(RentalBooking)
    if status:
        q = q.where(RentalBooking.status == status)
        count_q = count_q.where(RentalBooking.status == status)
    total = await session.scalar(count_q)
    result = await session.execute(q.order_by(RentalBooking.id.desc()).limit(limit).offset(offset))
    rows = result.all()
    items = [
        {
            "id": b.id,
            "listing_id": b.listing_id,
            "listing_title": listing_title,
            "listing_city": listing_city,
            "owner_username": owner_username,
            "owner_email": owner_email,
            "renter_name": b.renter_name,
            "renter_phone": b.renter_phone,
            "pickup_date": b.pickup_date,
            "return_date": b.return_date,
            "message": b.message,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b, listing_title, listing_city, owner_username, owner_email in rows
    ]
    return {"total": total or 0, "items": items}


@router.get("/showrooms")
async def admin_list_showrooms(
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    total = await session.scalar(select(func.count()).select_from(ShowroomProfile))
    result = await session.execute(
        select(ShowroomProfile, User.username, User.email)
        .outerjoin(User, ShowroomProfile.user_id == User.id)
        .order_by(ShowroomProfile.id.desc())
        .limit(limit).offset(offset)
    )
    rows = result.all()
    items = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "owner_username": username,
            "owner_email": email,
            "business_name": s.business_name,
            "city": s.city,
            "description": s.description,
            "logo_url": s.logo_url,
            "contact_phone": s.contact_phone,
            "is_verified": s.is_verified,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, username, email in rows
    ]
    return {"total": total or 0, "items": items}


@router.put("/showrooms/{showroom_id}/verify")
async def admin_verify_showroom(
    showroom_id: int,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
):
    profile = await session.get(ShowroomProfile, showroom_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Showroom not found")
    profile.is_verified = not profile.is_verified
    await session.commit()
    return {"id": profile.id, "is_verified": profile.is_verified}


@router.delete("/showrooms/{showroom_id}", status_code=204)
async def admin_delete_showroom(
    showroom_id: int,
    _admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
):
    profile = await session.get(ShowroomProfile, showroom_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Showroom not found")
    await session.delete(profile)
    await session.commit()
