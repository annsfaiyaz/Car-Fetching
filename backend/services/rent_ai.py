"""AI features for the rental module: price suggestion, description gen, NL search, fraud, demand forecast."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import RentalBooking, RentalListing
from services.llm_router import chat_completion

_log = logging.getLogger(__name__)


# ── Price Suggestion ─────────────────────────────────────────────────────────

async def suggest_price(session: AsyncSession, city: str, car_type: str) -> dict:
    """Return market price stats from similar active listings."""
    q = select(RentalListing.price_per_day).where(
        RentalListing.is_active == True,  # noqa: E712
        RentalListing.city.ilike(f"%{city}%"),
        RentalListing.car_type == car_type,
    )
    result = await session.execute(q)
    prices = [r[0] for r in result.all() if r[0] is not None]

    if not prices:
        q2 = select(RentalListing.price_per_day).where(
            RentalListing.is_active == True,  # noqa: E712
            RentalListing.car_type == car_type,
        )
        r2 = await session.execute(q2)
        prices = [r[0] for r in r2.all() if r[0] is not None]

    if not prices:
        return {"suggested": None, "min": None, "max": None, "sample_size": 0, "city_match": False}

    prices.sort()
    mid = len(prices) // 2
    median = prices[mid] if len(prices) % 2 else (prices[mid - 1] + prices[mid]) // 2
    return {
        "suggested": median,
        "min": prices[0],
        "max": prices[-1],
        "sample_size": len(prices),
        "city_match": True,
    }


# ── Description Generator ────────────────────────────────────────────────────

async def generate_description(details: dict) -> str:
    """Generate a rental listing description from car details using LLM."""
    fields = []
    if details.get("make"):          fields.append(f"Make: {details['make']}")
    if details.get("model"):         fields.append(f"Model: {details['model']}")
    if details.get("model_year"):    fields.append(f"Year: {details['model_year']}")
    if details.get("car_type"):      fields.append(f"Type: {details['car_type']}")
    if details.get("city"):          fields.append(f"City: {details['city']}")
    if details.get("pickup_area"):   fields.append(f"Pickup area: {details['pickup_area']}")
    if details.get("price_per_day"): fields.append(f"Price: PKR {details['price_per_day']}/day")
    if details.get("driver_included"):
        fields.append("Driver: included")
    if details.get("fuel_policy"):
        label = "Fuel included" if details["fuel_policy"] == "included" else "Renter pays fuel"
        fields.append(f"Fuel policy: {label}")

    sys_prompt = (
        "You write short, friendly rental car listing descriptions for WheelWise PK, a Pakistani car rental marketplace. "
        "Write exactly 2-3 sentences. Highlight the city, car suitability, and any standout features. "
        "Do NOT repeat the price or start with 'This car'. Return plain text only, no markdown."
    )
    user_prompt = "Write a listing description for:\n" + "\n".join(fields)

    text, _, _ = await chat_completion(
        [{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}],
        temperature=0.7,
    )
    return text.strip()


# ── Natural Language Search ──────────────────────────────────────────────────

async def parse_nl_search(query: str) -> dict:
    """Parse a natural language search query into structured rental filters."""
    sys_prompt = (
        "You parse car rental search queries for WheelWise PK (Pakistani rental platform). "
        "Extract filters and return JSON only — no explanation, no markdown:\n"
        '{"city": string_or_null, "car_type": string_or_null, "max_price": integer_or_null, "driver_included": bool_or_null}\n'
        "car_type must be one of: sedan, suv, hatchback, van, pickup, or null.\n"
        "city must be a Pakistani city name or null.\n"
        "max_price is PKR per day.\n"
        "Return null for any field not mentioned."
    )
    try:
        text, _, _ = await chat_completion(
            [{"role": "system", "content": sys_prompt}, {"role": "user", "content": query}],
            temperature=0.1,
        )
        m = re.search(r"\{[^{}]+\}", text, re.S)
        if m:
            data = json.loads(m.group(0))
            return {
                "city": data.get("city") or None,
                "car_type": data.get("car_type") or None,
                "max_price": int(data["max_price"]) if data.get("max_price") else None,
                "driver_included": data.get("driver_included"),
                "original_query": query,
            }
    except Exception as e:
        _log.warning("NL search parse failed: %s", e)

    return {"city": None, "car_type": None, "max_price": None, "driver_included": None, "original_query": query}


# ── Fraud / Spam Detection ───────────────────────────────────────────────────

async def check_booking_fraud(
    session: AsyncSession,
    renter_phone: str,
    listing_id: int,
) -> tuple[bool, str]:
    """
    Rule-based fraud checks. Returns (is_suspicious, reason).
    No LLM cost — fires on every booking.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    recent_count = await session.scalar(
        select(func.count()).select_from(RentalBooking).where(
            RentalBooking.renter_phone == renter_phone,
            RentalBooking.created_at >= cutoff,
        )
    ) or 0
    if recent_count >= 3:
        return True, f"Phone made {recent_count} bookings in 24 h — possible spam"

    duplicate = await session.scalar(
        select(func.count()).select_from(RentalBooking).where(
            RentalBooking.renter_phone == renter_phone,
            RentalBooking.listing_id == listing_id,
            RentalBooking.status == "pending",
        )
    ) or 0
    if duplicate >= 1:
        return True, "Duplicate: same phone already has a pending booking for this listing"

    return False, ""


# ── Demand Forecast ──────────────────────────────────────────────────────────

async def get_demand_forecast(session: AsyncSession, owner_id: int) -> dict:
    """Analyse booking patterns for a partner and return LLM-generated insights."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)

    listings_result = await session.execute(
        select(RentalListing.id, RentalListing.title, RentalListing.city).where(
            RentalListing.owner_id == owner_id
        )
    )
    listings = listings_result.all()

    if not listings:
        return {
            "total_bookings": 0,
            "confirmed_rate": 0,
            "summary": "Add listings to start seeing demand insights.",
            "insights": [],
        }

    listing_ids = [l[0] for l in listings]
    listing_map = {l[0]: {"title": l[1], "city": l[2]} for l in listings}

    bookings_result = await session.execute(
        select(RentalBooking).where(
            RentalBooking.listing_id.in_(listing_ids),
            RentalBooking.created_at >= cutoff,
        )
    )
    bookings = bookings_result.scalars().all()

    total = len(bookings)
    if total == 0:
        return {
            "total_bookings": 0,
            "confirmed_rate": 0,
            "summary": "No bookings in the last 90 days.",
            "insights": [
                "Make sure your listings are marked active.",
                "Consider lowering your price to match similar cars in your city.",
                "Add a clear photo and complete description to attract more renters.",
            ],
        }

    confirmed = sum(1 for b in bookings if b.status == "confirmed")
    cancelled  = sum(1 for b in bookings if b.status == "cancelled")
    pending    = sum(1 for b in bookings if b.status == "pending")

    by_listing: dict[int, int] = {}
    for b in bookings:
        by_listing[b.listing_id] = by_listing.get(b.listing_id, 0) + 1

    most_booked_id    = max(by_listing, key=lambda k: by_listing[k])
    most_booked_title = listing_map.get(most_booked_id, {}).get("title", "Unknown")
    cities            = list({l["city"] for l in listing_map.values() if l["city"]})

    stats = {
        "total_bookings_90_days": total,
        "confirmed": confirmed,
        "cancelled": cancelled,
        "pending": pending,
        "most_popular_listing": most_booked_title,
        "cities": cities,
        "total_listings": len(listing_ids),
    }

    sys_prompt = (
        "You are a business analyst for WheelWise PK, a Pakistani car rental platform. "
        "Given a rental partner's booking statistics, provide 2-3 concise, actionable insights. "
        "Reference Pakistani context (Eid holidays, summer trips to northern areas, winter city driving). "
        'Return JSON only: {"summary": "1-2 sentence overview", "insights": ["tip1", "tip2", "tip3"]}'
    )
    user_prompt = f"Partner stats (last 90 days):\n{json.dumps(stats, indent=2)}"

    try:
        text, _, _ = await chat_completion(
            [{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.4,
        )
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            data = json.loads(m.group(0))
            return {
                "total_bookings": total,
                "confirmed_rate": round(confirmed / total * 100),
                "summary": data.get("summary", ""),
                "insights": data.get("insights", []),
            }
    except Exception as e:
        _log.warning("Demand forecast LLM failed: %s", e)

    return {
        "total_bookings": total,
        "confirmed_rate": round(confirmed / total * 100),
        "summary": f"You received {total} bookings in the last 90 days with a {round(confirmed/total*100)}% confirmation rate.",
        "insights": [
            f"Your most requested car is: {most_booked_title}",
            f"Confirmation rate: {round(confirmed/total*100)}% — respond quickly to pending bookings.",
            "Peak rental seasons in Pakistan: Eid, summer (May–Aug), and winter weekends.",
        ],
    }
