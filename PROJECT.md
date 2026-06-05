# WheelWise PK

**Unified car marketplace aggregator for Pakistan — built by someone who ran the business for 5 years.**

---

## What It Is

WheelWise PK is a full-stack web platform that scrapes, aggregates, and serves car listings from **OLX Pakistan** and **PakWheels** in real time. It also supports car rentals, user-posted ads, AI-powered search, and a news/fuel price feed.

---

## The Problem It Solves

Pakistan's used car market is fragmented. Buyers jump between OLX, PakWheels, and WhatsApp groups to compare prices. Listings are duplicated, inconsistent, and hard to filter. There is no single trusted source.

This problem was experienced firsthand — running a car business for 5 years and watching clients struggle with it every week.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Scrapers | Playwright (headless Chromium) + BeautifulSoup |
| Database | SQLite (`wheelwise.db`) |
| Scheduler | APScheduler (background scrape + RSS jobs) |
| AI / LLM | Ollama (local), NVIDIA NIM client, vision analysis |
| Frontend | Vanilla HTML/CSS/JS (multi-page) |
| Infra | Docker + docker-compose |

---

## Key Features

- **Live scraping** — OLX and PakWheels scraped with Playwright because both are client-side React apps (no public API)
- **Listings API** — normalized, deduplicated car listings with search and filters
- **Rent module** — rent car listings with a dedicated dashboard (`rent.html`, `rent-dashboard.html`)
- **Sell / Post-Ad** — users can post their own car ads with image uploads
- **AI Search** — LLM-powered search via Ollama and NVIDIA NIM
- **Vision Analysis** — car image analysis using AI
- **Spam Detection** — AI-based spam filtering on listings
- **Auth** — user registration, login, settings
- **Admin panel** — admin API and dashboard
- **News & Fuel Prices** — RSS polling for automotive news and fuel price updates

---

## Project Structure

```
car-fetching/
├── backend/
│   ├── main.py              # FastAPI app entrypoint
│   ├── routes/              # listings, rent, sell, search, admin, auth APIs
│   ├── services/            # scrapers, AI, image, auth, spam services
│   ├── jobs/                # scheduled scrape + RSS jobs
│   ├── static/              # frontend HTML pages
│   └── db.py                # database connection
├── scraper/
│   ├── olx.py               # OLX Playwright scraper
│   └── pakwheels.py         # PakWheels scraper
├── Dockerfile
└── docker-compose.yml
```

---

## LinkedIn Post

> 5 years in the car business taught me one painful lesson — finding the right car at the right price in Pakistan is a nightmare.
>
> Buyers waste hours jumping between OLX, PakWheels, and a dozen WhatsApp groups. Prices are inconsistent. Listings are duplicated. And nobody has a single place to compare everything in real time.
>
> I lived this problem as a car business owner. My clients lived it too. Every single week, someone would ask me: *"Bhai, kahan se dhundun? Sab jagah alag alag rates hain."*
>
> So I built the solution myself.
>
> Meet **WheelWise PK** — an AI-augmented car listing platform that:
> - Scrapes live listings from OLX & PakWheels using headless browser automation
> - Aggregates, deduplicates, and normalizes data in real time
> - Gives buyers and sellers a clean, unified view of the market
>
> The technical challenge was real — both platforms are fully client-side React apps. Traditional scrapers return empty pages. I had to build Playwright-based renderers, write regex patterns that survive CSS hash changes on every deploy, and wrap it all in a FastAPI backend with scheduled jobs and AI-powered search.
>
> With AI assistance, what would've taken 6+ months to figure out solo — I shipped in weeks.
>
> This isn't a side project. This is a market problem I watched go unsolved for 5 years, and now I have the tools to fix it.
>
> If you're in the automotive space in Pakistan, or building something similar — let's connect.
>
> **#Pakistan #CarMarket #WebScraping #FastAPI #AI #IndieHacker #WheelWise #Startup**

---

## Status

- Branch: `rentcar-feature`
- Rent car module: complete
- Core scraping + listings: complete
- AI search + vision: integrated
- Deploy: Dockerized
