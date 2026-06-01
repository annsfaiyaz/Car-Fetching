"""Rental listings — browse and booking request endpoints."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import RentalBooking, RentalListing
from routes.auth.deps import get_db_session

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
