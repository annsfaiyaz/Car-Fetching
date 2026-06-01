"""Sell car functionality with photo analysis using vision models."""

from __future__ import annotations

import logging
import os
from typing import List, Optional, Tuple
from uuid import uuid4
from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from services import settings_repo
from services.image_service import ImageService
from services.vision_analysis import analyze_car_photos

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sell", tags=["sell"])

# Configuration
MAX_FILE_SIZE = int(os.environ.get("SELL_MAX_FILE_SIZE_MB", "10")) * 1024 * 1024  # 10 MB default
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES_PER_UPLOAD = int(os.environ.get("SELL_MAX_IMAGES_PER_UPLOAD", "6"))

# Initialize image service
image_service = ImageService(upload_dir="static/uploads/cars", max_size_mb=10)

def _validate_image_file(upload: UploadFile) -> None:
    """Validate uploaded image file."""
    # Check file size
    upload.file.seek(0, 2)  # Seek to end
    file_size = upload.file.tell()
    upload.file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)} MB"
        )

    # Check file extension
    if upload.filename:
        ext = os.path.splitext(upload.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )

@router.post("/analyze-photos")
async def analyze_car_photos_endpoint(
    files: List[UploadFile] = File(...),
    user_hint: Optional[str] = Form(None),
    max_images: Optional[int] = Form(None)
):
    """
    Analyze uploaded car photos to extract vehicle metadata.

    Returns structured data about the car including make, model, year, etc.
    with confidence scores for each field.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )

    # Limit number of images
    max_allowed = max_images or MAX_IMAGES_PER_UPLOAD
    if len(files) > max_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Too many images. Maximum {max_allowed} allowed per request"
        )

    # Save uploaded files and process for analysis
    saved_images: List[Tuple[str, str]] = []  # (storage_filename, url_path)
    pil_images: List[Image.Image] = []
    errors: List[str] = []

    for idx, upload in enumerate(files):
        try:
            # Save the image file
            storage_filename, url_path = image_service.save_image(upload)
            saved_images.append((storage_filename, url_path))

            # Process image for analysis
            pil_image = image_service.process_image_for_analysis(upload)
            pil_images.append(pil_image)

            _log.info(f"Processed image {idx+1}/{len(files)}: {upload.filename}")

        except HTTPException:
            raise  # Re-raise validation errors
        except Exception as e:
            errors.append(f"Error processing {upload.filename}: {str(e)}")
            continue

    if not pil_images:
        error_detail = "No valid images could be processed"
        if errors:
            error_detail += f": {'; '.join(errors)}"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )

    try:
        # Analyze the photos using vision model
        result = await analyze_car_photos(
            images=pil_images,
            user_hint=user_hint,
            max_images=max_allowed
        )

        # Add processing metadata including saved image info
        result["_processing_info"] = {
            "images_processed": len(pil_images),
            "total_images_received": len(files),
            "errors": errors,
            "saved_images": saved_images,
            "model_used": await settings_repo.get_setting("llm.vision_model", "meta/llama-4-maverick-17b-128e-instruct")
        }

        return JSONResponse(content=result)

    except ValueError as e:
        _log.error(f"Vision analysis validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        _log.error(f"Vision analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Photo analysis service temporarily unavailable"
        )

@router.get("/config")
async def get_sell_config():
    """Get sell functionality configuration."""
    vision_model = await settings_repo.get_setting("llm.vision_model", "meta/llama-4-maverick-17b-128e-instruct")

    return {
        "vision_model": vision_model,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "allowed_extensions": sorted(list(ALLOWED_EXTENSIONS)),
        "max_images_per_upload": MAX_IMAGES_PER_UPLOAD,
        "supported_features": [
            "make_model_detection",
            "year_estimation",
            "color_identification",
            "transmission_guess",
            "fuel_type_guess",
            "condition_assessment",
            "metadata_extraction"
        ]
    }