"""Health check routes."""

from fastapi import APIRouter
from sqlalchemy import text

from db import get_async_session_factory

router = APIRouter()


@router.get("/health")
async def health():
    sf = get_async_session_factory()
    async with sf() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "sqlite"}
