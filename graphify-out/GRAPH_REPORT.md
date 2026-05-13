# Graph Report - car-fetching  (2026-05-12)

## Corpus Check
- 22 files · ~11,003 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 218 nodes · 332 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2794145c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 21 edges
2. `scrape_stream_ws()` - 16 edges
3. `scrape_pakwheels()` - 13 edges
4. `get_async_session_factory()` - 9 edges
5. `norm_search_url()` - 9 edges
6. `upsert_one_listing()` - 9 edges
7. `chat_with_database()` - 9 edges
8. `render()` - 9 edges
9. `_parse_article()` - 7 edges
10. `scrape_olx()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/scripts/clear_all_listings.py → backend/db.py
- `health()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/routes/health.py → backend/db.py
- `suggest_pakwheels_search_url()` --calls--> `norm_search_url()`  [INFERRED]
  backend/services/ollama_pakwheels.py → backend/services/listings_repo.py
- `suggest_pakwheels_url_endpoint()` --calls--> `suggest_pakwheels_search_url()`  [INFERRED]
  backend/routes/pakwheels_api.py → backend/services/ollama_pakwheels.py
- `suggest_olx_search_url()` --calls--> `norm_search_url()`  [INFERRED]
  backend/services/ollama_olx.py → backend/services/listings_repo.py

## Communities (17 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (33): $(), allItems, appendChatBubble(), applyResyncResponse(), applyStoredTheme(), chatThread, defaultEmptyHtml(), escapeAttr() (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (26): AppMeta, Base, PakwheelsListing, SQLAlchemy models for SQLite (MVP)., get_async_session_factory(), DeclarativeBase, health(), get_listings() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (25): BaseModel, _chat_max_chars(), _chat_max_items(), chat_with_database(), ChatBody, ChatMessage, _effective_max_age_hours(), _olx_scraper_module() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (25): _digits_int(), _ensure_default_sort(), _extract_card_fields(), _extract_updated_snippet(), _iso(), _normalize_url(), _parse_detail_page(), _parse_price_pkr() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (15): _fetch_page_html(), _normalize_href(), _parse_article(), _parse_km(), _parse_price(), _parse_year(), OLX Pakistan (cars_c84) scraper — Playwright headless browser edition.  OLX is a, Extract a listing dict from a rendered <article> element. (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (10): close_db(), connect_db(), _default_sqlite_url(), SQLite database (async) using SQLAlchemy 2 + aiosqlite., File under backend/data/car_listings.db unless SQLITE_DATABASE_URL is set., Create engine, tables, and session factory., lifespan(), Car listing API — FastAPI application entrypoint. (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (10): Base URL shape, code:block1 (https://www.pakwheels.com/used-cars/search/-/<segments>/[<qu), code:text (pk_integer = round(lakhs × 100_000)), Documented path segments (only these), Documented query parameters (only these), Examples (memorize the pattern), Examples (path only; add `https://www.pakwheels.com` and query as needed), Lakh / lac → integer PKR for `pr_less_` (required) (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (9): build_pakwheels_expert_system_prompt(), extract_pakwheels_search_url(), Call NVIDIA NIM to turn natural language into a PakWheels search URL., Role + knowledge from ``docs/pakwheels_patterns.md`` and ``docs/extraction_logic, Pull first plausible PakWheels used-cars search URL from model output., Returns (normalized_url, raw_assistant_text, model_used).     Raises httpx.HTTPE, _read_kb_doc(), _strip_from_response() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (9): Ask Ollama to produce PakWheels + OLX Pakistan cars search URLs from plain-langu, suggest_pakwheels_url_endpoint(), build_olx_expert_system_prompt(), extract_olx_search_url(), Call NVIDIA NIM to turn natural language into an OLX Pakistan cars search URL., Returns (normalized_url, raw_assistant_text, model_used)., _read_kb_doc(), _strip_from_response() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (7): 1. Base URL Structure, 2. Dynamic URL Patterns, 3. Pattern Construction (Examples), 4. Sorting and View, A. Location & Make Slugs, B. Filter Parameters (`?filter=`), OLX Pakistan Search Patterns for AI Agents

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (4): chat(), _client(), NVIDIA NIM OpenAI-compatible async chat client.  Drop-in replacement for local O, Send messages and return the assistant reply as a plain string.

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): Detail page (optional second fetch), PakWheels search results page — extraction logic, Per-card fields, Price text normalization, Result list container

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (4): 1. Item Containers, 2. Field Selectors, 3. Implementation Logic, OLX Data Extraction Guide for AI Agents

## Knowledge Gaps
- **71 isolated node(s):** `PakWheels used-car scraper (Gujranwala, price filter) using requests + Beautiful`, `Parse PakWheels 'Updated … ago' strings into an approximate UTC datetime.`, `Return (integer PKR, display string).`, `Best-effort fields from a search-result card.`, `Merge specification table + seller comment from a listing detail page.` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_async_session_factory()` connect `Community 1` to `Community 5`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `norm_search_url()` connect `Community 1` to `Community 8`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `scrape_stream_ws()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `scrape_stream_ws()` (e.g. with `norm_search_url()` and `upsert_one_listing()`) actually correct?**
  _`scrape_stream_ws()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `get_async_session_factory()` (e.g. with `main()` and `fetch_all_listings()`) actually correct?**
  _`get_async_session_factory()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `norm_search_url()` (e.g. with `suggest_pakwheels_search_url()` and `suggest_olx_search_url()`) actually correct?**
  _`norm_search_url()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PakWheels used-car scraper (Gujranwala, price filter) using requests + Beautiful`, `Parse PakWheels 'Updated … ago' strings into an approximate UTC datetime.`, `Return (integer PKR, display string).` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._