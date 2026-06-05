"""Rental listings — browse, booking, and partner-management endpoints."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import RentalBooking, RentalListing, User
from routes.auth.deps import get_current_user, get_db_session
from services import rent_ai

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rent", tags=["rent"])


class ListingOut(BaseModel):
    id: int
    title: str
    make: str | None
    model: str
    model_year: int | None
    car_type: str
    city: str
    pickup_area: str | None
    price_per_day: int
    driver_included: bool
    fuel_policy: str
    deposit_amount: int | None
    description: str
    image_url: str | None
    contact_phone: str | None

    model_config = {"from_attributes": True}


class BookingRequest(BaseModel):
    listing_id: int
    renter_name: str = Field(..., min_length=2, max_length=256)
    renter_phone: str = Field(..., min_length=7, max_length=32)
    pickup_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    return_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    message: str | None = Field(None, max_length=1000)


@router.get("/listings", response_model=list[ListingOut])
async def list_rentals(
    city: str | None = Query(None),
    car_type: str | None = Query(None),
    max_price: int | None = Query(None, ge=0),
    driver_included: bool | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    session: AsyncSession = Depends(get_db_session),
):
    q = select(RentalListing).where(RentalListing.is_active == True)  # noqa: E712
    if city:
        q = q.where(RentalListing.city.ilike(f"%{city}%"))
    if car_type:
        q = q.where(RentalListing.car_type == car_type)
    if max_price is not None:
        q = q.where(RentalListing.price_per_day <= max_price)
    if driver_included is not None:
        q = q.where(RentalListing.driver_included == driver_included)
    q = q.order_by(RentalListing.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await session.execute(q)
    return result.scalars().all()


@router.get("/listings/{listing_id}", response_model=ListingOut)
async def get_rental(listing_id: int, session: AsyncSession = Depends(get_db_session)):
    listing = await session.get(RentalListing, listing_id)
    if not listing or not listing.is_active:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("/bookings", status_code=201)
async def create_booking(
    body: BookingRequest,
    session: AsyncSession = Depends(get_db_session),
):
    if body.pickup_date >= body.return_date:
        raise HTTPException(status_code=400, detail="Return date must be after pickup date")
    listing = await session.get(RentalListing, body.listing_id)
    if not listing or not listing.is_active:
        raise HTTPException(status_code=404, detail="Listing not found")
    is_suspicious, fraud_reason = await rent_ai.check_booking_fraud(session, body.renter_phone, body.listing_id)
    if is_suspicious:
        raise HTTPException(status_code=429, detail=fraud_reason)
    booking = RentalBooking(
        listing_id=body.listing_id,
        renter_name=body.renter_name,
        renter_phone=body.renter_phone,
        pickup_date=body.pickup_date,
        return_date=body.return_date,
        message=body.message,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    session.add(booking)
    await session.commit()
    _log.info("Booking #%d created for listing #%d", booking.id, body.listing_id)
    return {"id": booking.id, "status": "pending"}


# ── Partner / owner endpoints ────────────────────────────────────────────────


class RentalListingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=512)
    make: str | None = Field(None, max_length=128)
    model: str = Field(..., min_length=1, max_length=128)
    model_year: int | None = Field(None, ge=1970, le=2030)
    car_type: str = Field(..., max_length=64)
    city: str = Field(..., min_length=1, max_length=128)
    pickup_area: str | None = Field(None, max_length=256)
    price_per_day: int = Field(..., ge=0)
    driver_included: bool = False
    fuel_policy: str = Field("renter_pays", max_length=64)
    deposit_amount: int | None = Field(None, ge=0)
    description: str = Field("", max_length=4000)
    image_url: str | None = Field(None, max_length=2048)
    contact_phone: str | None = Field(None, max_length=32)


class RentalListingUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=512)
    make: str | None = Field(None, max_length=128)
    model: str | None = Field(None, max_length=128)
    model_year: int | None = Field(None, ge=1970, le=2030)
    car_type: str | None = Field(None, max_length=64)
    city: str | None = Field(None, max_length=128)
    pickup_area: str | None = Field(None, max_length=256)
    price_per_day: int | None = Field(None, ge=0)
    driver_included: bool | None = None
    fuel_policy: str | None = Field(None, max_length=64)
    deposit_amount: int | None = Field(None, ge=0)
    description: str | None = Field(None, max_length=4000)
    image_url: str | None = Field(None, max_length=2048)
    contact_phone: str | None = Field(None, max_length=32)
    is_active: bool | None = None


class BookingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|cancelled)$")


@router.get("/my-listings")
async def list_my_listings(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(RentalListing)
        .where(RentalListing.owner_id == user.id)
        .order_by(RentalListing.created_at.desc())
    )
    return result.scalars().all()


@router.post("/my-listings", status_code=201)
async def create_my_listing(
    body: RentalListingCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    now = datetime.now(timezone.utc)
    listing = RentalListing(
        owner_id=user.id,
        is_active=True,
        created_at=now,
        updated_at=now,
        **body.model_dump(),
    )
    session.add(listing)
    await session.commit()
    await session.refresh(listing)
    return listing


@router.patch("/my-listings/{listing_id}")
async def update_my_listing(
    listing_id: int,
    body: RentalListingUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    listing = await session.get(RentalListing, listing_id)
    if not listing or listing.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Listing not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)
    listing.updated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(listing)
    return listing


@router.delete("/my-listings/{listing_id}", status_code=204)
async def delete_my_listing(
    listing_id: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    listing = await session.get(RentalListing, listing_id)
    if not listing or listing.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Listing not found")
    await session.delete(listing)
    await session.commit()


@router.get("/my-bookings")
async def list_my_bookings(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    listing_ids_result = await session.execute(
        select(RentalListing.id).where(RentalListing.owner_id == user.id)
    )
    listing_ids = [r[0] for r in listing_ids_result.all()]
    if not listing_ids:
        return []
    bookings_result = await session.execute(
        select(RentalBooking, RentalListing.title)
        .join(RentalListing, RentalBooking.listing_id == RentalListing.id)
        .where(RentalBooking.listing_id.in_(listing_ids))
        .order_by(RentalBooking.created_at.desc())
    )
    rows = bookings_result.all()
    return [
        {
            "id": b.id,
            "listing_id": b.listing_id,
            "listing_title": title,
            "renter_name": b.renter_name,
            "renter_phone": b.renter_phone,
            "pickup_date": b.pickup_date,
            "return_date": b.return_date,
            "message": b.message,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b, title in rows
    ]


# ── AI endpoints ─────────────────────────────────────────────────────────────


class NLSearchBody(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)


class DescriptionBody(BaseModel):
    make: str | None = None
    model: str | None = None
    model_year: int | None = None
    car_type: str | None = None
    city: str | None = None
    pickup_area: str | None = None
    price_per_day: int | None = None
    driver_included: bool = False
    fuel_policy: str | None = None


@router.get("/suggest-price")
async def suggest_price(
    city: str = Query(..., min_length=1),
    car_type: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_db_session),
):
    return await rent_ai.suggest_price(session, city, car_type)


@router.post("/generate-description")
async def generate_description(
    body: DescriptionBody,
    _user: User = Depends(get_current_user),
):
    try:
        text = await rent_ai.generate_description(body.model_dump())
        return {"description": text}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Description generation failed: {e}")


@router.post("/nl-search")
async def nl_search(body: NLSearchBody):
    return await rent_ai.parse_nl_search(body.query)


@router.get("/demand-forecast")
async def demand_forecast(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    return await rent_ai.get_demand_forecast(session, user.id)


@router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: int,
    body: BookingStatusUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    booking = await session.get(RentalBooking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    listing = await session.get(RentalListing, booking.listing_id)
    if not listing or listing.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your listing")
    booking.status = body.status
    await session.commit()
    return {"ok": True, "status": booking.status}
