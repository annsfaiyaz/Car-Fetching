"""SQLAlchemy models for SQLite (MVP+)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
