"""Car listing API — FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s %(message)s",
)
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

from db import close_db, connect_db
from routes.health import router as health_router
from routes.pakwheels_api import router as pakwheels_router

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Car Listing API",
    description="Backend for the car listing system.",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(pakwheels_router)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def dashboard():
    index = STATIC_DIR / "index.html"
    if index.is_file():
        return FileResponse(index)
    return {"message": "Car Listing API", "docs": "/docs"}
