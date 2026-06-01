"""Vision analysis service for car photo analysis using NVIDIA NIM VLMs."""

from __future__ import annotations

import base64
import json
import logging
import os
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image
from openai import AsyncOpenAI

from services import settings_repo

_log = logging.getLogger(__name__)


async def get_vision_client() -> AsyncOpenAI:
    """Get configured OpenAI-compatible client for NVIDIA NIM vision models."""
    key = await settings_repo.get_decrypted_key("nvidia") or os.environ.get("NVIDIA_NIM_API_KEY", "").strip()
    if not key:
        raise ValueError("NVIDIA key missing (settings or NVIDIA_NIM_API_KEY)")

    base = "https://integrate.api.nvidia.com/v1"
    return AsyncOpenAI(base_url=base, api_key=key)


async def get_vision_model() -> str:
    """Get the configured vision model from settings."""
    model = await settings_repo.get_setting("llm.vision_model", "meta/llama-4-maverick-17b-128e-instruct")
    return str(model)


def encode_image_to_base64(image: Image.Image, max_size: Tuple[int, int] = (1024, 1024), quality: int = 85) -> str:
    """Encode PIL Image to base64 JPEG with optional resizing for efficiency."""
    # Resize if too large (maintaining aspect ratio)
    if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
        image.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Convert to RGB if necessary (jpeg doesn't support transparency)
    if image.mode in ("RGBA", "LA", "P"):
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        rgb_image.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
        image = rgb_image

    # Encode to JPEG
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    img_bytes = buffer.getvalue()

    return base64.b64encode(img_bytes).decode("utf-8")


async def analyze_car_photos(
    images: List[Image.Image],
    user_hint: Optional[str] = None,
    max_images: int = 4
) -> Dict[str, Any]:
    """
    Analyze car photos to extract vehicle metadata using NVIDIA NIM vision model.

    Args:
        images: List of PIL Images of the car
        user_hint: Optional user-provided hint (e.g., "Honda City 2018 Gujranwala")
        max_images: Maximum number of images to process (for cost/performance)

    Returns:
        Dictionary containing extracted car metadata with confidence scores
    """
    if not images:
        raise ValueError("No images provided for analysis")

    # Limit number of images for efficiency
    images_to_process = images[:max_images]

    # Get client and model
    client = await get_vision_client()
    model = await get_vision_model()

    # Prepare images as base64
    image_contents = []
    for img in images_to_process:
        try:
            base64_image = encode_image_to_base64(img)
            image_contents.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
            })
        except Exception as e:
            _log.warning(f"Failed to encode image: {e}")
            continue

    if not image_contents:
        raise ValueError("No valid images could be processed")

    # Build the prompt for car analysis
    prompt_text = (
        "You are an expert vehicle analyst specializing in Pakistani car market. "
        "Analyze these car photos and extract detailed vehicle information. "
        "Respond with VALID JSON only, no markdown formatting, no explanations. "
        "If uncertain about any field, provide null and indicate low confidence. "
        "Consider common Pakistani vehicle models and market conditions.\n\n"
        "Extract the following information:\n"
        "- make: Vehicle manufacturer (e.g., Toyota, Honda, Suzuki)\n"
        "- model: Specific model name (e.g., Corolla, Civic, Alto)\n"
        "- variant: Trim level or variant (e.g., GLI, VTi, LXI)\n"
        "- model_year: Year of manufacture (YYYY format)\n"
        "- body_type: Sedan, hatchback, SUV, coupe, etc.\n"
        "- color_exterior: Exterior color\n"
        "- transmission_guess: Automatic or Manual (based on visual cues)\n"
        "- fuel_guess: Petrol, Diesel, Hybrid, Electric, CNG\n"
        "- mileage_km: Estimated mileage in kilometers (number or null if unclear)\n"
        "- condition_summary: Brief condition assessment (excellent, good, fair, poor)\n"
        "- confidence: Object with confidence scores (0-1) for each field\n"
        "- missing_info: List of fields that couldn't be determined\n"
        "- suggested_title: Optimized title for listing\n"
        "- suggested_description: Compelling description for listing\n"
    )

    if user_hint:
        prompt_text += f"\nUser hint: {user_hint}. Use this to improve accuracy where possible."

    # Build messages for vision model
    messages = [
        {
            "role": "system",
            "content": prompt_text
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Analyze these car photos and return the requested metadata as JSON."
                }
            ] + image_contents
        }
    ]

    try:
        # Call the vision model
        timeout = float(os.environ.get("NIM_VISION_TIMEOUT_SEC", "30"))
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.1,  # Low temperature for consistent JSON output
            max_tokens=2048,
            timeout=timeout
        )

        content = (response.choices[0].message.content or "").strip()
        if not content:
            raise ValueError("Empty response from vision model")

        # Try to parse JSON response
        # Handle potential markdown code fences
        if content.startswith("```json"):
            content = content.split("```json")[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        content = content.strip()

        # Parse JSON
        result = json.loads(content)

        # Validate and normalize result
        normalized_result = _normalize_vision_result(result)

        _log.info(f"Vision analysis completed successfully using {model}")
        return normalized_result

    except json.JSONDecodeError as e:
        _log.error(f"Failed to parse JSON from vision model: {e}")
        _log.error(f"Raw response: {content}")
        # Return a structured fallback response
        return _create_fallback_response(str(e))
    except Exception as e:
        _log.error(f"Vision analysis failed: {e}")
        raise


def _normalize_vision_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize and validate the vision model result."""
    # Define expected fields with defaults
    expected_fields = {
        "make": None,
        "model": None,
        "variant": None,
        "model_year": None,
        "body_type": None,
        "color_exterior": None,
        "transmission_guess": None,
        "fuel_guess": None,
        "mileage_km": None,
        "condition_summary": None,
        "confidence": {},
        "missing_info": [],
        "suggested_title": "",
        "suggested_description": ""
    }

    # Start with expected fields
    normalized = expected_fields.copy()

    # Update with provided values, ensuring correct types
    for key, value in result.items():
        if key in normalized:
            normalized[key] = value
        else:
            # Store unexpected fields in missing_info for transparency
            if isinstance(normalized["missing_info"], list):
                normalized["missing_info"].append(f"unexpected_field:{key}")

    # Ensure confidence is a dict
    if not isinstance(normalized["confidence"], dict):
        normalized["confidence"] = {}

    # Ensure missing_info is a list
    if not isinstance(normalized["missing_info"], list):
        normalized["missing_info"] = [str(normalized["missing_info"])] if normalized["missing_info"] else []

    # Ensure string fields are strings
    string_fields = ["make", "model", "variant", "body_type", "color_exterior",
                     "transmission_guess", "fuel_guess", "condition_summary",
                     "suggested_title", "suggested_description"]
    for field in string_fields:
        if normalized[field] is not None and not isinstance(normalized[field], str):
            normalized[field] = str(normalized[field])

    # Ensure model_year is integer or null
    if normalized["model_year"] is not None:
        try:
            normalized["model_year"] = int(normalized["model_year"])
        except (ValueError, TypeError):
            normalized["model_year"] = None
            if isinstance(normalized["confidence"], dict):
                normalized["confidence"]["model_year"] = 0.0

    # Ensure mileage_km is integer or null
    if normalized["mileage_km"] is not None:
        try:
            normalized["mileage_km"] = int(normalized["mileage_km"])
        except (ValueError, TypeError):
            normalized["mileage_km"] = None
            if isinstance(normalized["confidence"], dict):
                normalized["confidence"]["mileage_km"] = 0.0

    return normalized


def _create_fallback_response(error_msg: str) -> Dict[str, Any]:
    """Create a fallback response when vision analysis fails."""
    return {
        "make": None,
        "model": None,
        "variant": None,
        "model_year": None,
        "body_type": None,
        "color_exterior": None,
        "transmission_guess": None,
        "fuel_guess": None,
        "mileage_km": None,
        "condition_summary": None,
        "confidence": {},
        "missing_info": [f"vision_analysis_failed: {error_msg}"],
        "suggested_title": "",
        "suggested_description": "",
        "_error": True
    }


# Convenience function for single image analysis
async def analyze_single_car_image(
    image: Image.Image,
    user_hint: Optional[str] = None
) -> Dict[str, Any]:
    """Analyze a single car image."""
    return await analyze_car_photos([image], user_hint=user_hint, max_images=1)