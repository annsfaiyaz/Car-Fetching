# Graph Report - car-fetching  (2026-05-17)

## Corpus Check
- 39 files · ~24,225 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 433 nodes · 691 edges · 25 communities (21 shown, 4 thin omitted)
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d78546e7`
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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `get_async_session_factory()` - 41 edges
2. `$()` - 29 edges
3. `scrape_stream_ws()` - 20 edges
4. `scrape_pakwheels()` - 15 edges
5. `norm_search_url()` - 14 edges
6. `Base` - 13 edges
7. `scrape_olx()` - 11 edges
8. `plan_search()` - 11 edges
9. `suggest_pakwheels_search_url()` - 10 edges
10. `upsert_one_listing()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `set_listing_spam()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/services/listings_repo.py → backend/db.py
- `set_listing_hidden()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/services/listings_repo.py → backend/db.py
- `update_enrichment_notes()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/services/listings_repo.py → backend/db.py
- `scrape_pakwheels()` --calls--> `canonicalize_pakwheels_search_url()`  [INFERRED]
  scraper/pakwheels.py → scraper/url_canonical.py
- `main()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/scripts/clear_all_listings.py → backend/db.py

## Communities (25 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (47): $(), allItems, appendChatBubble(), appendStreamCard(), applyResyncResponse(), applyStoredTheme(), applyWorkspacePanels(), chatThread (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (46): _chat_max_chars(), _chat_max_items(), chat_with_database(), ChatMessage, _effective_max_age_hours(), get_listings(), _iso_meta(), _olx_scraper_module() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (45): AiSearchSession, AppMeta, AppSetting, BackgroundJob, Base, ExternalSnapshot, FeedbackEvent, PakwheelsListing (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (31): _card_freshness_dt(), _fallback_cards_from_item_links(), _fetch_page_html(), _iso_utc(), _normalize_href(), _parse_article(), _parse_km(), _parse_price() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (31): _digits_int(), _ensure_default_sort(), _extract_card_fields(), _extract_updated_snippet(), _iso(), _normalize_url(), _parse_detail_page(), _parse_price_pkr() (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (18): LocalModel, Downloaded / local models (seeded from env, defaults in DB)., BaseModel, FeedbackBody, Listing detail, feedback, spam toggles., SpamBody, ChatBody, Chat with Ollama using listing data from SQLite as context. (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (25): Ask Ollama to produce PakWheels + OLX Pakistan cars search URLs from plain-langu, Ask Ollama to produce PakWheels + OLX Pakistan cars search URLs from plain-langu, suggest_pakwheels_url_endpoint(), feedback_digest_for_query(), Relevance feedback for prompt augmentation., build_olx_expert_system_prompt(), extract_olx_search_url(), Turn natural language into an OLX Pakistan cars search URL (multi-provider LLM). (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (22): post_feedback(), plan_search(), PlanBody, NL search planning, saved searches, sessions., Resolve URLs, check cache freshness, and return the right scrape strategy., remove_saved(), save_sidebar(), SavedBody (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (18): enrich_listing_row(), Background enrichment: detail fetch + AI market/fuel notes., Fetch notes via LLM from listing snapshot (detail crawl can be added later)., schedule_enrichment(), chat_completion(), _complete_provider(), Unified LLM completion with provider fallback (NVIDIA NIM, OpenAI, Anthropic, lo, Returns (assistant_text, model_used, provider_used).     Tries providers in fall (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): 1. Base URL Structure, 1. Global Car Search Base, 2. Dynamic URL Patterns, 2. Location-Specific Car Paths, 3. Keyword (Make/Model) in URL Path, 3. Pattern Construction (Examples), 4. Car Filter Parameters, 4. Sorting and View (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (10): close_db(), connect_db(), _default_sqlite_url(), SQLite database (async) using SQLAlchemy 2 + aiosqlite., File under backend/data/car_listings.db unless SQLITE_DATABASE_URL is set., Create engine, tables, and session factory., lifespan(), WheelWise PK API — FastAPI application entrypoint. (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (11): 1. Item Containers, 2. Field Extraction per Article, 2. Field Selectors, 3. Fallback Strategy, 3. Implementation Logic, 4. Pagination, 5. Notes, code:python (articles = soup.find_all("article")) (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (10): Base URL shape, code:block1 (https://www.pakwheels.com/used-cars/search/-/<segments>/[<qu), code:text (pk_integer = round(lakhs × 100_000)), Documented path segments (only these), Documented query parameters (only these), Examples (memorize the pattern), Examples (path only; add `https://www.pakwheels.com` and query as needed), Lakh / lac → integer PKR for `pr_less_` (required) (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.32
Nodes (6): Run configured background scrape jobs (URLs from DB)., run_background_scrape_jobs(), _module(), Thin wrapper around ``scraper.pakwheels`` for the backend., resolve_max_pages(), scrape_pakwheels()

### Community 14 - "Community 14"
Cohesion: 0.38
Nodes (6): set_credential(), decrypt_secret(), encrypt_secret(), _fernet_from_master(), mask_key(), Encrypt API keys at rest using Fernet (master key from APP_SECRET_KEY).

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (4): chat(), _client(), NVIDIA NIM OpenAI-compatible async chat client.  Drop-in replacement for local O, Send messages and return the assistant reply as a plain string.

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (5): Detail page (optional second fetch), PakWheels search results page — extraction logic, Per-card fields, Price text normalization, Result list container

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (3): $(), load(), status

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (3): _module(), Thin wrapper around ``scraper.olx`` for the backend., scrape_olx()

## Knowledge Gaps
- **142 isolated node(s):** `Normalize legacy / AI-hallucinated marketplace search URLs before scraping.  Pak`, `Rewrite deprecated PakWheels path URLs to ``/used-cars/search/-/…`` form.`, `Fix common OLX URL mistakes (wrong city id, ``?price=``, sort tokens).`, `PakWheels used-car scraper (Gujranwala, price filter) using requests + Beautiful`, `Parse PakWheels 'Updated … ago' strings into an approximate UTC datetime.` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_async_session_factory()` connect `Community 2` to `Community 1`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `scrape_stream_ws()` connect `Community 1` to `Community 8`, `Community 2`, `Community 13`, `Community 7`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `suggest_pakwheels_search_url()` connect `Community 6` to `Community 8`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `get_async_session_factory()` (e.g. with `main()` and `_complete_provider()`) actually correct?**
  _`get_async_session_factory()` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `scrape_stream_ws()` (e.g. with `norm_search_url()` and `resolve_max_pages()`) actually correct?**
  _`scrape_stream_ws()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `norm_search_url()` (e.g. with `suggest_pakwheels_search_url()` and `suggest_olx_search_url()`) actually correct?**
  _`norm_search_url()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Normalize legacy / AI-hallucinated marketplace search URLs before scraping.  Pak`, `Rewrite deprecated PakWheels path URLs to ``/used-cars/search/-/…`` form.`, `Fix common OLX URL mistakes (wrong city id, ``?price=``, sort tokens).` to the rest of the system?**
  _142 weakly-connected nodes found - possible documentation gaps or missing edges._