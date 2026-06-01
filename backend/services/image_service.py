"""Image upload and management service."""

from __future__ import annotations

import os
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image
from fastapi import HTTPException, UploadFile, status


class ImageService:
    """Handle image uploads, validation, and storage."""

    def __init__(self, upload_dir: str = "static/uploads", max_size_mb: int = 10):
        self.upload_dir = Path(upload_dir)
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}

        # Ensure upload directory exists
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def validate_image_file(self, upload: UploadFile) -> None:
        """Validate uploaded image file for size and extension."""
        # Check file size
        upload.file.seek(0, 2)  # Seek to end
        file_size = upload.file.tell()
        upload.file.seek(0)  # Reset to beginning

        if file_size > self.max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {self.max_size_bytes // (1024*1024)} MB",
            )

        # Check file extension
        if upload.filename:
            ext = os.path.splitext(upload.filename.lower())[1]
            if ext not in self.allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type. Allowed: {', '.join(sorted(self.allowed_extensions))}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is required",
            )

    def save_image(self, upload: UploadFile) -> Tuple[str, str]:
        """
        Save an uploaded image file and return the storage filename and URL path.

        Args:
            upload: The uploaded file from FastAPI

        Returns:
            Tuple of (storage_filename, url_path)
            storage_filename: The unique filename used for storage
            url_path: The path to use in URLs (relative to static base)
        """
        self.validate_image_file(upload)

        # Generate a unique filename
        ext = os.path.splitext(upload.filename.lower())[1]
        storage_filename = f"{uuid.uuid4()}{ext}"
        file_path = self.upload_dir / storage_filename

        # Save the file
        try:
            contents = upload.file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not save file: {str(e)}",
            )
        finally:
            upload.file.seek(0)  # Reset file pointer for potential reuse

        # Return the storage filename and the URL path
        url_path = f"/uploads/{storage_filename}"
        return storage_filename, url_path

    def delete_image(self, storage_filename: str) -> bool:
        """
        Delete an image by its storage filename.

        Args:
            storage_filename: The filename used when saving the image

        Returns:
            True if file was deleted, False if not found
        """
        file_path = self.upload_dir / storage_filename
        try:
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception:
            return False

    def get_image_path(self, storage_filename: str) -> Path:
        """
        Get the full path to an image file.

        Args:
            storage_filename: The filename used when saving the image

        Returns:
            Path object pointing to the image file
        """
        return self.upload_dir / storage_filename

    def get_image_url(self, storage_filename: str) -> str:
        """
        Get the URL path for an image.

        Args:
            storage_filename: The filename used when saving the image

        Returns:
            URL path string (e.g., "/uploads/filename.jpg")
        """
        return f"/uploads/{storage_filename}"

    def process_image_for_analysis(self, upload: UploadFile) -> Image.Image:
        """
        Process an uploaded image for analysis (validation and PIL Image loading).

        Args:
            upload: The uploaded file from FastAPI

        Returns:
            PIL Image object ready for analysis
        """
        self.validate_image_file(upload)

        # Read and process image
        image_data = upload.file.read()
        try:
            image = Image.open(BytesIO(image_data))
            # Verify it's a valid image
            image.verify()
            # Reopen for actual use (verify closes the file)
            image = Image.open(BytesIO(image_data))
            return image
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process image {upload.filename}: {str(e)}",
            )
        finally:
            upload.file.seek(0)  # Reset file pointer