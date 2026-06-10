"""Auth API: register, login, current user."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database_models import ACCOUNT_TYPE_RENTAL, ACCOUNT_TYPE_SELLER, User
from routes.auth.deps import get_current_user, get_db_session
from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=256)
    account_type: str = Field(
        default=ACCOUNT_TYPE_SELLER,
        description="seller | rental_partner",
    )


class LoginBody(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(body: RegisterBody, session: AsyncSession = Depends(get_db_session)):
    types = [t.strip() for t in body.account_type.split(",") if t.strip()]
    invalid = [t for t in types if t not in auth_service.SIGNUP_ACCOUNT_TYPES]
    if not types or invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"account_type must be one or more of: {', '.join(sorted(auth_service.SIGNUP_ACCOUNT_TYPES))}",
        )
    if err := auth_service.validate_username(body.username):
        raise HTTPException(status_code=400, detail=err)
    if err := auth_service.validate_password(body.password):
        raise HTTPException(status_code=400, detail=err)
    if await auth_service.get_user_by_email(session, body.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await auth_service.get_user_by_username(session, body.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = await auth_service.create_user(
        session,
        email=body.email,
        username=body.username,
        password=body.password,
        full_name=body.full_name,
        account_type=body.account_type,
    )
    token = auth_service.create_access_token(user.id, user.email, user.role, user.account_type)
    return {"access_token": token, "token_type": "bearer", "user": auth_service.user_to_public(user)}


@router.post("/login")
async def login(body: LoginBody, session: AsyncSession = Depends(get_db_session)):
    user = await auth_service.authenticate_user(session, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth_service.create_access_token(user.id, user.email, user.role, user.account_type)
    return {"access_token": token, "token_type": "bearer", "user": auth_service.user_to_public(user)}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return auth_service.user_to_public(user)


@router.get("/account-types")
async def account_types():
    return {
        "signup": [
            {"id": ACCOUNT_TYPE_SELLER, "label": "Sell your car"},
            {"id": ACCOUNT_TYPE_RENTAL, "label": "Rent your car (rental partner)"},
        ],
    }
