"""SQLAlchemy models for SQLite (MVP+)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from typing import List, Optional


class Base(DeclarativeBase):
    pass


META_KEY_PAKWHEELS_SYNC = "pakwheels_last_sync"


class AiSearchSession(Base):
    """One NL-driven AI scrape session (powers AI Results tab)."""

    __tablename__ = "ai_search_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    query_text: Mapped[str] = mapped_column(Text)
    intent_hash: Mapped[str] = mapped_column(String(64), index=True)
    pakwheels_url: Mapped[str] = mapped_column(String(2048), default="")
    olx_url: Mapped[str] = mapped_column(String(2048), default="")
    status: Mapped[str] = mapped_column(String(32), default="open")  # open | closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SavedSearch(Base):
    """Pinned searches for sidebar navigation."""

    __tablename__ = "saved_searches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(512))
    nl_query: Mapped[str] = mapped_column(Text, default="")
    intent_hash: Mapped[str] = mapped_column(String(64), index=True)
    pakwheels_url: Mapped[str] = mapped_column(String(2048), default="")
    olx_url: Mapped[str] = mapped_column(String(2048), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PakwheelsListing(Base):
    __tablename__ = "pakwheels_listings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    url: Mapped[str] = mapped_column(String(2048), unique=True, index=True)
    title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    city: Mapped[str | None] = mapped_column(String(256), nullable=True)
    model_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transmission: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    posted_time: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="pakwheels")
    source_search_url: Mapped[str] = mapped_column(String(2048), default="", index=True)
    search_origin: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    spam_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_spam: Mapped[bool] = mapped_column(Boolean, default=False)
    spam_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_session_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ai_search_sessions.id"), nullable=True, index=True)
    enrichment_status: Mapped[str] = mapped_column(String(32), default="none")  # none pending ok failed
    ai_market_price_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_fuel_avg_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    detail_html_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    detail_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    user: Mapped[Optional["User"]] = relationship(back_populates="listings")


# account_type: what the user signed up for
ACCOUNT_TYPE_SELLER = "seller"
ACCOUNT_TYPE_RENTAL = "rental_partner"
ACCOUNT_TYPE_SHOWROOM = "showroom"
ACCOUNT_TYPE_BUYER = "buyer"

# role: platform permission (admin can access /admin)
ROLE_USER = "user"
ROLE_ADMIN = "admin"


class User(Base):
    """Registered users (sellers, rental partners, admins)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    account_type: Mapped[str] = mapped_column(String(32), default=ACCOUNT_TYPE_BUYER, index=True)
    role: Mapped[str] = mapped_column(String(16), default=ROLE_USER, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    listings: Mapped[List["PakwheelsListing"]] = relationship(back_populates="user")
    showroom_profile: Mapped[Optional["ShowroomProfile"]] = relationship(back_populates="user", uselist=False)


class AppMeta(Base):
    __tablename__ = "app_meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class AppSetting(Base):
    """Key-value settings (JSON-encoded values)."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value_json: Mapped[str] = mapped_column(Text)


class ProviderCredential(Base):
    __tablename__ = "provider_credentials"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)  # nvidia | openai | anthropic | local
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # base_url overrides
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class PlatformSearchHint(Base):
    """User-editable URL-pattern hints merged into LLM system prompts."""

    __tablename__ = "platform_search_hints"

    platform: Mapped[str] = mapped_column(String(32), primary_key=True)  # pakwheels | olx
    body: Mapped[str] = mapped_column(Text, default="")


class LocalModel(Base):
    """Downloaded / local models (seeded from env, defaults in DB)."""

    __tablename__ = "local_models"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_id: Mapped[str] = mapped_column(String(256), unique=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class FeedbackEvent(Base):
    """User relevance feedback for learning (prompt augmentation)."""

    __tablename__ = "feedback_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    listing_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    intent_hash: Mapped[str] = mapped_column(String(64), index=True)
    query_snapshot: Mapped[str] = mapped_column(Text, default="")
    relevant: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    cron_expr: Mapped[str | None] = mapped_column(String(128), nullable=True)
    interval_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pakwheels_url: Mapped[str] = mapped_column(Text, default="")
    olx_url: Mapped[str] = mapped_column(Text, default="")
    use_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_nl_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_listings: Mapped[int] = mapped_column(Integer, default=25)


class ExternalSnapshot(Base):
    """Cached RSS/API payloads for News & Fuel widgets."""

    __tablename__ = "external_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)  # news | fuel
    title: Mapped[str] = mapped_column(String(512), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    source_url: Mapped[str] = mapped_column(String(2048), default="")
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RentalListing(Base):
    """Car listings posted by rental partners."""

    __tablename__ = "rental_listings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    make: Mapped[str | None] = mapped_column(String(128), nullable=True)
    model: Mapped[str] = mapped_column(String(128))
    model_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    car_type: Mapped[str] = mapped_column(String(64))  # sedan | suv | hatchback | van | pickup
    city: Mapped[str] = mapped_column(String(128), index=True)
    pickup_area: Mapped[str | None] = mapped_column(String(256), nullable=True)
    price_per_day: Mapped[int] = mapped_column(Integer)
    driver_included: Mapped[bool] = mapped_column(Boolean, default=False)
    fuel_policy: Mapped[str] = mapped_column(String(64), default="renter_pays")  # renter_pays | included
    deposit_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    bookings: Mapped[List["RentalBooking"]] = relationship(back_populates="listing")


class RentalBooking(Base):
    """Booking requests submitted by renters."""

    __tablename__ = "rental_bookings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    listing_id: Mapped[int] = mapped_column(Integer, ForeignKey("rental_listings.id"), index=True)
    renter_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    renter_name: Mapped[str] = mapped_column(String(256))
    renter_phone: Mapped[str] = mapped_column(String(32))
    pickup_date: Mapped[str] = mapped_column(String(16))   # YYYY-MM-DD
    return_date: Mapped[str] = mapped_column(String(16))   # YYYY-MM-DD
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending | confirmed | cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    listing: Mapped["RentalListing"] = relationship(back_populates="bookings")


class ShowroomProfile(Base):
    """Car showroom profile linked to a showroom-type user account."""

    __tablename__ = "showroom_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, index=True)
    business_name: Mapped[str] = mapped_column(String(256))
    city: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    logo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="showroom_profile")
