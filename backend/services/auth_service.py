"""User registration, login, JWT, and admin bootstrap."""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import (
    ACCOUNT_TYPE_BUYER,
    ACCOUNT_TYPE_RENTAL,
    ACCOUNT_TYPE_SELLER,
    ACCOUNT_TYPE_SHOWROOM,
    ROLE_ADMIN,
    ROLE_USER,
    User,
)

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "168"))
ADMIN_EMAIL = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()

SIGNUP_ACCOUNT_TYPES = {ACCOUNT_TYPE_SELLER, ACCOUNT_TYPE_RENTAL, ACCOUNT_TYPE_SHOWROOM, ACCOUNT_TYPE_BUYER}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int, email: str, role: str, account_type: str) -> str:
    expire = _utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "account_type": account_type,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_username(username: str) -> str:
    return username.strip().lower()


_USERNAME_RE = re.compile(r"^[a-z0-9_]{3,32}$")


def validate_username(username: str) -> str | None:
    u = normalize_username(username)
    if not _USERNAME_RE.match(u):
        return "Username must be 3–32 characters: lowercase letters, numbers, underscore."
    return None


def validate_password(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters."
    return None


def resolve_role_for_email(email: str) -> str:
    if ADMIN_EMAIL and normalize_email(email) == ADMIN_EMAIL:
        return ROLE_ADMIN
    return ROLE_USER


def normalize_account_type(account_type: str | None) -> str:
    if not account_type:
        return ACCOUNT_TYPE_BUYER
    # support comma-separated multi-type e.g. "seller,showroom"
    types = [t.strip() for t in account_type.split(",") if t.strip() in SIGNUP_ACCOUNT_TYPES]
    if not types:
        return ACCOUNT_TYPE_BUYER
    return ",".join(types)


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == normalize_email(email)))
    return result.scalar_one_or_none()


async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    result = await session.execute(
        select(User).where(User.username == normalize_username(username))
    )
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    username: str,
    password: str,
    full_name: str | None = None,
    account_type: str | None = None,
) -> User:
    now = _utcnow()
    email_n = normalize_email(email)
    at = normalize_account_type(account_type)
    user = User(
        email=email_n,
        username=normalize_username(username),
        hashed_password=hash_password(password),
        full_name=(full_name or "").strip() or None,
        account_type=at,
        role=resolve_role_for_email(email_n),
        is_active=True,
        is_verified=False,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(session, email)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    user.last_login_at = _utcnow()
    user.updated_at = _utcnow()
    if ADMIN_EMAIL and user.email == ADMIN_EMAIL and user.role != ROLE_ADMIN:
        user.role = ROLE_ADMIN
    await session.commit()
    return user


async def promote_admin_by_email(session: AsyncSession) -> int:
    """Ensure ADMIN_EMAIL user has admin role (on startup)."""
    if not ADMIN_EMAIL:
        return 0
    result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
    user = result.scalar_one_or_none()
    if user is None:
        return 0
    if user.role == ROLE_ADMIN:
        return 0
    user.role = ROLE_ADMIN
    user.updated_at = _utcnow()
    await session.commit()
    return 1


def user_to_public(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "account_type": user.account_type,
        "role": user.role,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
    }
