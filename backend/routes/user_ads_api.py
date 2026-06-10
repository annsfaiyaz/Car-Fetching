"""Authenticated endpoints for user-posted car ads."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field

from database_models import User
from routes.auth.deps import get_current_user
from services import user_ads_repo
from services.image_service import ImageService

_image_service = ImageService(upload_dir="static/uploads/cars", max_size_mb=10)

router = APIRouter(prefix="/api/user-ads", tags=["user-ads"])


class UserAdBody(BaseModel):
    title: str = Field(..., min_length=3, max_length=1024)
    price: int | None = Field(None, ge=0)
    city: str | None = Field(None, max_length=256)
    model_year: int | None = Field(None, ge=1980, le=2030)
    transmission: str | None = Field(None, max_length=64)
    mileage: int | None = Field(None, ge=0)
    description: str = Field("", max_length=8000)
    image_url: str | None = Field(None, max_length=2048)
    make: str | None = Field(None, max_length=128)
    model: str | None = Field(None, max_length=128)
    variant: str | None = Field(None, max_length=128)
    body_type: str | None = Field(None, max_length=64)
    color_exterior: str | None = Field(None, max_length=64)
    fuel_type: str | None = Field(None, max_length=32)
    condition: str | None = Field(None, max_length=64)


class UserAdUpdateBody(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=1024)
    price: int | None = Field(None, ge=0)
    city: str | None = Field(None, max_length=256)
    model_year: int | None = Field(None, ge=1980, le=2030)
    transmission: str | None = Field(None, max_length=64)
    mileage: int | None = Field(None, ge=0)
    description: str | None = Field(None, max_length=8000)
    image_url: str | None = Field(None, max_length=2048)


def _body_to_listing_data(body: UserAdBody) -> dict[str, Any]:
    """Map API body to listing row fields, enriching description with metadata."""
    parts = [body.description.strip()] if body.description else []
    meta_lines = []
    if body.make:
        meta_lines.append(f"Make: {body.make}")
    if body.model:
        meta_lines.append(f"Model: {body.model}")
    if body.variant:
        meta_lines.append(f"Variant: {body.variant}")
    if body.body_type:
        meta_lines.append(f"Body: {body.body_type}")
    if body.color_exterior:
        meta_lines.append(f"Color: {body.color_exterior}")
    if body.fuel_type:
        meta_lines.append(f"Fuel: {body.fuel_type}")
    if body.condition:
        meta_lines.append(f"Condition: {body.condition}")
    if meta_lines:
        parts.append("\n".join(meta_lines))
    description = "\n\n".join(p for p in parts if p).strip()
    return {
        "title": body.title,
        "price": body.price,
        "city": body.city,
        "model_year": body.model_year,
        "transmission": body.transmission,
        "mileage": body.mileage,
        "description": description,
        "image_url": body.image_url,
    }


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Upload a single car image and return its URL."""
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Allowed formats: {', '.join(allowed)}")
    try:
        _, url_path = _image_service.save_image(file)
        return {"url": url_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_my_ads(user: User = Depends(get_current_user)):
    items = await user_ads_repo.list_user_ads(user.id)
    return {"items": items, "total": len(items)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ad(body: UserAdBody, user: User = Depends(get_current_user)):
    item = await user_ads_repo.create_user_ad(user, _body_to_listing_data(body))
    return {"item": item}


@router.get("/{ad_id}")
async def get_ad(ad_id: int, user: User = Depends(get_current_user)):
    item = await user_ads_repo.get_user_ad(user.id, ad_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Ad not found")
    return {"item": item}


@router.patch("/{ad_id}")
async def update_ad(
    ad_id: int,
    body: UserAdUpdateBody,
    user: User = Depends(get_current_user),
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    item = await user_ads_repo.update_user_ad(user.id, ad_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail="Ad not found")
    return {"item": item}


@router.delete("/{ad_id}")
async def delete_ad(ad_id: int, user: User = Depends(get_current_user)):
    ok = await user_ads_repo.delete_user_ad(user.id, ad_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ad not found")
    return {"ok": True}
