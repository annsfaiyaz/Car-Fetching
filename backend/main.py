"""WheelWise PK API — FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s %(message)s",
)
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

load_dotenv()

from db import close_db, connect_db
from jobs.rss_poll import poll_fuel_urls, poll_news_feeds
from jobs.scrape_jobs import run_background_scrape_jobs
from routes.admin_api import router as admin_router
from routes.auth import auth_router
from routes.health import router as health_router
from routes.sell_api import router as sell_router
from routes.user_ads_api import router as user_ads_router
from routes.listings_api import router as listings_router
from routes.pakwheels_api import router as pakwheels_router
from routes.rent_api import router as rent_router
from routes.showroom_api import router as showroom_router
from routes.search_api import router as search_router
from routes.settings_api import router as settings_router
from services import auth_service, settings_repo
from db import get_async_session_factory

STATIC_DIR = Path(__file__).resolve().parent / "static"

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await settings_repo.seed_default_settings()
    await settings_repo.seed_local_models_from_env()
    factory = get_async_session_factory()
    async with factory() as session:
        await auth_service.promote_admin_by_email(session)

    scheduler.add_job(poll_news_feeds, "interval", hours=1, id="poll_news", replace_existing=True)
    scheduler.add_job(poll_fuel_urls, "interval", hours=6, id="poll_fuel", replace_existing=True)
    scheduler.add_job(run_background_scrape_jobs, "interval", minutes=30, id="bg_scrape", replace_existing=True)
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)
    await close_db()


app = FastAPI(
    title="WheelWise PK",
    description="Used cars from major marketplaces — search, cache, and insights.",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(pakwheels_router)
app.include_router(settings_router)
app.include_router(search_router)
app.include_router(listings_router)
app.include_router(sell_router)
app.include_router(user_ads_router)
app.include_router(rent_router)
app.include_router(showroom_router)

UPLOADS_DIR = STATIC_DIR / "uploads" / "cars"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/")
async def home_page():
    home = STATIC_DIR / "home.html"
    if home.is_file():
        return FileResponse(home)
    return {"message": "WheelWise PK API", "docs": "/docs"}


@app.get("/cars")
async def cars_page():
    return RedirectResponse(url="/", status_code=301)


@app.get("/news")
async def news_page():
    path = STATIC_DIR / "news.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="news.html missing")


@app.get("/about")
async def about_page():
    path = STATIC_DIR / "about.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="about.html missing")


@app.get("/settings")
async def settings_page():
    path = STATIC_DIR / "settings.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="settings.html missing")


@app.get("/login")
async def login_page():
    path = STATIC_DIR / "login.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="login.html missing")


@app.get("/register")
async def register_page():
    path = STATIC_DIR / "register.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="register.html missing")


@app.get("/admin")
async def admin_page():
    path = STATIC_DIR / "admin.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="admin.html missing")


@app.get("/rent")
async def rent_page():
    path = STATIC_DIR / "rent.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="rent.html missing")


@app.get("/rent-detail")
async def rent_detail_page():
    path = STATIC_DIR / "rent-detail.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="rent-detail.html missing")


@app.get("/rent-dashboard")
async def rent_dashboard_page():
    path = STATIC_DIR / "rent-dashboard.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="rent-dashboard.html missing")


@app.get("/sell")
async def sell_page():
    path = STATIC_DIR / "sell.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="sell.html missing")


@app.get("/post-ad")
async def post_ad_page():
    path = STATIC_DIR / "post-ad.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="post-ad.html missing")


@app.get("/my-ads")
async def my_ads_page():
    path = STATIC_DIR / "my-ads.html"
    if path.is_file():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="my-ads.html missing")


_ALLOWED_IMG_HOSTS = {"cache1.pakwheels.com", "cache2.pakwheels.com", "cache3.pakwheels.com",
                      "cache4.pakwheels.com", "img.pakwheels.com", "images.pakwheels.com"}

@app.get("/api/img-proxy")
async def image_proxy(url: str = Query(...)):
    from urllib.parse import urlparse
    host = urlparse(url).netloc
    if host not in _ALLOWED_IMG_HOSTS:
        raise HTTPException(status_code=400, detail="Host not allowed")
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url, headers={
                "Referer": "https://www.pakwheels.com/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            })
        content_type = r.headers.get("content-type", "image/webp")
        return Response(content=r.content, media_type=content_type,
                        headers={"Cache-Control": "public, max-age=86400"})
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch image")
