# Graph Report - car-fetching  (2026-05-30)

## Corpus Check
- 58 files · ~63,432 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 648 nodes · 987 edges · 44 communities (37 shown, 7 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 146 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eba2fc02`
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
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `get_async_session_factory()` - 48 edges
2. `$()` - 29 edges
3. `scrape_stream_ws()` - 20 edges
4. `scrape_pakwheels()` - 15 edges
5. `Base` - 14 edges
6. `norm_search_url()` - 14 edges
7. `scrape_olx()` - 11 edges
8. `plan_search()` - 11 edges
9. `LocalModel` - 10 edges
10. `suggest_pakwheels_search_url()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `get_db_session()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/routes/auth/deps.py → backend/db.py
- `save_sidebar()` --calls--> `upsert_saved_search()`  [INFERRED]
  backend/routes/search_api.py → backend/services/search_sessions_repo.py
- `scrape_pakwheels()` --calls--> `canonicalize_pakwheels_search_url()`  [INFERRED]
  scraper/pakwheels.py → scraper/url_canonical.py
- `lifespan()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/main.py → backend/db.py
- `main()` --calls--> `get_async_session_factory()`  [INFERRED]
  backend/scripts/clear_all_listings.py → backend/db.py

## Communities (44 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (64): get_async_session_factory(), list, health(), plan_search(), Resolve URLs, check cache freshness, and return the right scrape strategy., start_session(), feedback_digest_for_query(), fetch_all_listings() (+56 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (47): $(), allItems, appendChatBubble(), appendStreamCard(), applyResyncResponse(), applyStoredTheme(), applyWorkspacePanels(), chatThread (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (34): Ask Ollama to produce PakWheels + OLX Pakistan cars search URLs from plain-langu, Ask Ollama to produce PakWheels + OLX Pakistan cars search URLs from plain-langu, suggest_pakwheels_url_endpoint(), enrich_listing_row(), Background enrichment: detail fetch + AI market/fuel notes., Fetch notes via LLM from listing snapshot (detail crawl can be added later)., schedule_enrichment(), chat_completion() (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (35): _chat_max_chars(), _chat_max_items(), chat_with_database(), ChatBody, _effective_max_age_hours(), get_listings(), _iso_meta(), _olx_scraper_module() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (31): _card_freshness_dt(), _fallback_cards_from_item_links(), _fetch_page_html(), _iso_utc(), _normalize_href(), _parse_article(), _parse_km(), _parse_price() (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (31): _digits_int(), _ensure_default_sort(), _extract_card_fields(), _extract_updated_snippet(), _iso(), _normalize_url(), _parse_detail_page(), _parse_price_pkr() (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (30): AiSearchSession, AppMeta, AppSetting, BackgroundJob, Base, ExternalSnapshot, FeedbackEvent, PakwheelsListing (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (10): close_db(), connect_db(), _default_sqlite_url(), SQLite database (async) using SQLAlchemy 2 + aiosqlite., File under backend/data/car_listings.db unless SQLITE_DATABASE_URL is set., Create engine, tables, and session factory., lifespan(), WheelWise PK API — FastAPI application entrypoint. (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (22): analyze_car_photos_endpoint(), get_sell_config(), Sell car functionality with photo analysis using vision models., Get sell functionality configuration., Validate uploaded image file., Analyze uploaded car photos to extract vehicle metadata.      Returns structured, _validate_image_file(), analyze_car_photos() (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): 1. Base URL Structure, 1. Global Car Search Base, 2. Dynamic URL Patterns, 2. Location-Specific Car Paths, 3. Keyword (Make/Model) in URL Path, 3. Pattern Construction (Examples), 4. Car Filter Parameters, 4. Sorting and View (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (16): authenticate_user(), create_access_token(), create_user(), get_user_by_email(), get_user_by_username(), hash_password(), normalize_account_type(), normalize_email() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (12): btn, buildTitle(), fillFormFromItem(), form, loadAdForEdit(), loadDraft(), parseDescriptionMeta(), patchBody (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (9): ImageService, Image upload and management service., Get the full path to an image file.          Args:             storage_filename:, Get the URL path for an image.          Args:             storage_filename: The, Process an uploaded image for analysis (validation and PIL Image loading)., Handle image uploads, validation, and storage., Validate uploaded image file for size and extension., Save an uploaded image file and return the storage filename and URL path. (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.26
Nodes (14): authHeaders(), clearSession(), fetchMe(), getAccessToken(), getToken(), getUser(), isAuthFormPage(), isGuestLoginNavPage() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (11): analyzeBtn, draft, fd, fileInput, form, hint, imageUrls, incoming (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (8): LocalModel, Downloaded / local models (seeded from env, defaults in DB)., Downloaded / local models (seeded from env, defaults in DB)., add_local_model(), ProviderKeyBody, Dashboard settings: LLM providers, scrape caps, background jobs., SettingKV, seed_local_models_from_env()

### Community 16 - "Community 16"
Cohesion: 0.2
Nodes (11): BaseModel, ChatMessage, PlanBody, NL search planning, saved searches, sessions., remove_saved(), save_sidebar(), SavedBody, SessionStartBody (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (11): EXTRA_LINKS, initMobileMenu(), initServicesDropdown(), isServicesActive(), linkClass(), mountNavbar(), NAV_LINKS, renderNavbar() (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (11): 1. Item Containers, 2. Field Extraction per Article, 2. Field Selectors, 3. Fallback Strategy, 3. Implementation Logic, 4. Pagination, 5. Notes, code:python (articles = soup.find_all("article")) (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (6): _body_to_listing_data(), create_ad(), Authenticated endpoints for user-posted car ads., Map API body to listing row fields, enriching description with metadata., UserAdBody, UserAdUpdateBody

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (10): Base URL shape, code:block1 (https://www.pakwheels.com/used-cars/search/-/<segments>/[<qu), code:text (pk_integer = round(lakhs × 100_000)), Documented path segments (only these), Documented query parameters (only these), Examples (memorize the pattern), Examples (path only; add `https://www.pakwheels.com` and query as needed), Lakh / lac → integer PKR for `pr_less_` (required) (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (5): LoginBody, Auth API: register, login, current user., RegisterBody, Registered users (sellers, rental partners, admins)., User

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (8): set_credential(), decrypt_secret(), encrypt_secret(), _fernet_from_master(), mask_key(), Encrypt API keys at rest using Fernet (master key from APP_SECRET_KEY)., get_decrypted_key(), upsert_provider_credential()

### Community 23 - "Community 23"
Cohesion: 0.32
Nodes (6): Run configured background scrape jobs (URLs from DB)., run_background_scrape_jobs(), _module(), Thin wrapper around ``scraper.pakwheels`` for the backend., resolve_max_pages(), scrape_pakwheels()

### Community 24 - "Community 24"
Cohesion: 0.32
Nodes (7): adId, btn, empty, escapeHtml(), formatPrice(), loading, renderAdCard()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (7): api(), escapeHtml(), loadListings(), loadStats(), loadUsers(), renderListings(), renderUsers()

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (3): FeedbackBody, Listing detail, feedback, spam toggles., SpamBody

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (6): btn, email, errEl, form, next, params

### Community 29 - "Community 29"
Cohesion: 0.4
Nodes (4): chat(), _client(), NVIDIA NIM OpenAI-compatible async chat client.  Drop-in replacement for local O, Send messages and return the assistant reply as a plain string.

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (5): Detail page (optional second fetch), PakWheels search results page — extraction logic, Per-card fields, Price text normalization, Result list container

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (4): body, btn, errEl, form

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (3): $(), load(), status

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): _module(), Thin wrapper around ``scraper.olx`` for the backend., scrape_olx()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (3): Natural-language intent → PakWheels search URL via local Ollama., Natural-language intent → PakWheels search URL via local Ollama., SuggestUrlBody

## Knowledge Gaps
- **213 isolated node(s):** `Normalize legacy / AI-hallucinated marketplace search URLs before scraping.  Pak`, `Rewrite deprecated PakWheels path URLs to ``/used-cars/search/-/…`` form.`, `Fix common OLX URL mistakes (wrong city id, ``?price=``, sort tokens).`, `PakWheels used-car scraper (Gujranwala, price filter) using requests + Beautiful`, `Parse PakWheels 'Updated … ago' strings into an approximate UTC datetime.` (+208 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_async_session_factory()` connect `Community 0` to `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 15`, `Community 22`, `Community 31`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `list` connect `Community 0` to `Community 24`, `Community 8`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `User` connect `Community 21` to `Community 10`, `Community 26`, `Community 19`, `Community 6`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `get_async_session_factory()` (e.g. with `lifespan()` and `main()`) actually correct?**
  _`get_async_session_factory()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `scrape_stream_ws()` (e.g. with `norm_search_url()` and `resolve_max_pages()`) actually correct?**
  _`scrape_stream_ws()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Normalize legacy / AI-hallucinated marketplace search URLs before scraping.  Pak`, `Rewrite deprecated PakWheels path URLs to ``/used-cars/search/-/…`` form.`, `Fix common OLX URL mistakes (wrong city id, ``?price=``, sort tokens).` to the rest of the system?**
  _213 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._