import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnimatedTextCycle from "../components/AnimatedTextCycle";
import { formatPrice, formatPostedTime, listingImageSrc, listingDetailHref, listingDetailExternal } from "../utils/format";

const PAGE_SIZE = 10;
const LS_PW = "pakwheels_platform_search_url";
const LS_OLX = "pakwheels_olx_search_url";
const LS_NL = "pakwheels_nl_query";

function ls(key, val) {
  try { if (val !== undefined) localStorage.setItem(key, val); else return localStorage.getItem(key) || ""; } catch { return ""; }
}

function ListingCard({ car }) {
  const href = listingDetailHref(car);
  const external = listingDetailExternal(car);
  const imgSrc = listingImageSrc(car);
  const isOlx = (car.source || "").toLowerCase().includes("olx");

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl">
        <div className="relative h-48 w-full bg-slate-100 dark:bg-zinc-800">
          <img src={imgSrc} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async"
            onError={(e) => { e.target.onerror = null; e.target.src = "/static/images/car-placeholder.svg"; }} />
        </div>
      </div>
      <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-zinc-100">{car.title || "Untitled"}</h2>
      <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatPrice(car.price)}</div>
      <div className="flex flex-wrap gap-1.5">
        <span className={`rounded-md px-2 py-0.5 text-[0.72rem] font-semibold ${isOlx ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "bg-amber-500/15 text-amber-800 dark:text-amber-300"}`}>{isOlx ? "OLX" : "PakWheels"}</span>
        {car.city && <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[0.72rem] text-sky-700 dark:text-sky-300">📍 {car.city}</span>}
        {car.model_year != null && <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[0.72rem] text-violet-700 dark:text-violet-300">🗓 {car.model_year}</span>}
        {car.transmission && <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.72rem] text-emerald-700 dark:text-emerald-300">⚙ {car.transmission}</span>}
        {car.mileage != null && <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[0.72rem] text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-300">🛣 {Number(car.mileage).toLocaleString()} km</span>}
      </div>
      {car.description && <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{car.description}</p>}
      {(car.ai_market_price_note || car.ai_fuel_avg_note) && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200">
          {car.ai_market_price_note && <p><strong>AI market:</strong> {car.ai_market_price_note}</p>}
          {car.ai_fuel_avg_note && <p><strong>AI fuel:</strong> {car.ai_fuel_avg_note}</p>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
        <span>{formatPostedTime(car)}</span>
        <a className="font-semibold text-amber-600 hover:underline dark:text-amber-400" href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>View details</a>
      </div>
    </article>
  );
}

const CHAT_WELCOME = "Ask about your saved listings (prices, cities, comparisons) or general used-car topics in Pakistan.";

export default function Home() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState("buy");

  // Buy search
  const [nlQuery, setNlQuery] = useState(() => ls(LS_NL));
  const [platformUrl, setPlatformUrl] = useState(() => ls(LS_PW));
  const [olxUrl, setOlxUrl] = useState(() => ls(LS_OLX));

  // Listings
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastMeta, setLastMeta] = useState({ total_in_db: 0, filtered_by_search_url: false });

  // UI states
  const [scraping, setScraping] = useState(false);
  const [scrapeText, setScrapeText] = useState("Searching…");
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [hintMsg, setHintMsg] = useState("");
  const [toastError, setToastError] = useState("");
  const [toastSuccess, setToastSuccess] = useState("");
  const [searching, setSearching] = useState(false);
  const toastTimer = useRef(null);

  // Rent quick-search
  const [rentCity, setRentCity] = useState("");
  const [rentType, setRentType] = useState("");
  const [rentDriver, setRentDriver] = useState("");
  const [nlRentInput, setNlRentInput] = useState("");
  const [nlRentLabel, setNlRentLabel] = useState("Search with AI");
  const [nlRentResult, setNlRentResult] = useState("");

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatThread, setChatThread] = useState([{ role: "assistant", content: CHAT_WELCOME }]);
  const [chatSending, setChatSending] = useState(false);
  const chatBoxRef = useRef(null);

  const aiSessionId = useRef(null);

  useEffect(() => {
    const hasSaved = ls(LS_PW) || ls(LS_OLX);
    if (hasSaved) loadCached();
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chatThread]);

  function showError(msg) { setToastError(msg); }
  function showSuccess(msg) {
    setToastSuccess(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastSuccess(""), 9000);
  }

  async function loadCached() {
    const pw = ls(LS_PW); const ox = ls(LS_OLX);
    const q = new URLSearchParams({ tab: "all" });
    if (pw) q.set("search_url", pw);
    if (ox) q.set("olx_search_url", ox);
    try {
      const r = await fetch("/api/pakwheels/listings?" + q.toString());
      if (!r.ok) throw new Error();
      const data = await r.json();
      setItems(data.items || []);
      setLastMeta({ total_in_db: data.total_in_db || data.count || 0, filtered_by_search_url: !!data.filtered_by_search_url });
      if (data.last_error) showError(data.last_error);
      setPage(1);
    } catch {}
  }

  function runStreamingScrape(sessionId) {
    const url = ls(LS_PW); const olx = ls(LS_OLX);
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = proto + "//" + location.host + "/api/pakwheels/ws/scrape";
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(wsUrl);
      const finish = (fn, arg) => { if (!settled) { settled = true; fn(arg); } };
      ws.onopen = () => {
        const payload = { url, sync_origin: "ai", max_listings: 50 };
        if (olx) payload.olx_url = olx;
        if (sessionId) payload.ai_session_id = sessionId;
        ws.send(JSON.stringify(payload));
        setScrapeText("Connecting…"); setScrapeProgress(0);
      };
      ws.onmessage = (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === "listing") {
          setScrapeText(msg.index === 1 ? "First listing found!" : "Fetching listings…");
          setScrapeProgress(msg.progress || 0);
          if (msg.item) setItems((prev) => [...prev, msg.item]);
        }
        if (msg.type === "done") {
          setItems(msg.items || []);
          if (msg.ai_session_id != null) aiSessionId.current = msg.ai_session_id;
          setLastMeta({ total_in_db: msg.total_in_db || msg.count || 0, filtered_by_search_url: !!msg.filtered_by_search_url });
          if ((msg.write_stats) && msg.count != null) showSuccess(`Found ${msg.count} listing${msg.count !== 1 ? "s" : ""} for your search.`);
          setHintMsg((msg.hints || []).join(" "));
          setPage(1);
          finish(resolve, msg);
          ws.close();
        }
        if (msg.type === "error") { finish(reject, new Error(msg.message || "Scrape failed")); ws.close(); }
      };
      ws.onerror = () => finish(reject, new Error("WebSocket connection failed"));
      ws.onclose = (ev) => { if (!settled && ev.code !== 1000) finish(reject, new Error("Connection closed")); };
    });
  }

  async function handleSearch() {
    if (!nlQuery.trim()) { showError("Describe what you're looking for, then press Enter."); return; }
    ls(LS_NL, nlQuery.trim());
    setToastError(""); setToastSuccess(""); setHintMsg(""); setSearching(true);
    try {
      const planRes = await fetch("/api/search/plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery.trim() }),
      });
      const plan = await planRes.json();
      if (!planRes.ok) throw new Error(plan.detail || "Search planning failed");

      const pw = plan.suggested_url || ""; const ox = plan.olx_url || "";
      setPlatformUrl(pw); setOlxUrl(ox); ls(LS_PW, pw); ls(LS_OLX, ox);

      if (plan.skip_scrape && (plan.cached_items || []).length) {
        await loadCached();
        if (items.length > 0) { showSuccess(`${items.length} listing${items.length !== 1 ? "s" : ""} found.`); setSearching(false); return; }
      }

      const hasStale = plan.stale_cache && (plan.cached_items || []).length > 0;
      if (hasStale) {
        await loadCached();
        if (items.length > 0) setHintMsg("Showing saved results — fetching fresh listings in the background.");
      }

      const sessRes = await fetch("/api/search/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery.trim(), pakwheels_url: pw, olx_url: ox }),
      });
      const sess = await sessRes.json();
      if (!sessRes.ok) throw new Error(sess.detail || "Could not start session");
      aiSessionId.current = sess.session_id;

      if (!hasStale) { setItems([]); setScraping(true); }
      try { await runStreamingScrape(sess.session_id); }
      finally { if (!hasStale) setScraping(false); if (hasStale) setHintMsg(""); }

    } catch (e) {
      showError(String(e.message || e));
    } finally {
      setSearching(false); setScraping(false);
    }
  }

  async function handleRentAISearch() {
    if (!nlRentInput.trim()) return;
    setNlRentLabel("Searching…"); setNlRentResult("");
    try {
      const r = await fetch("/api/rent/nl-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlRentInput }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed");
      const qp = new URLSearchParams();
      if (data.city) qp.set("city", data.city);
      if (data.car_type) qp.set("car_type", data.car_type);
      if (data.max_price) qp.set("max_price", data.max_price);
      if (data.driver_included != null) qp.set("driver_included", String(data.driver_included));
      navigate("/rent" + (qp.toString() ? "?" + qp.toString() : ""));
    } catch (e) {
      setNlRentResult("Could not parse — try adjusting the filters manually.");
      setNlRentLabel("Search with AI");
    }
  }

  async function sendChat() {
    const text = chatInput.trim(); if (!text) return;
    setChatInput(""); setChatSending(true);
    setChatThread((t) => [...t, { role: "user", content: text }]);
    try {
      const payload = { messages: [...chatThread, { role: "user", content: text }] };
      if (platformUrl) payload.search_url = platformUrl;
      const r = await fetch("/api/pakwheels/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Chat failed");
      setChatThread((t) => [...t, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChatThread((t) => [...t, { role: "assistant", content: "Error: " + (e.message || e) }]);
    } finally { setChatSending(false); }
  }

  // Filtered + paginated items
  const filtered = items.filter((c) => {
    if (!query) return true;
    const hay = [c.title, c.description, c.city, c.transmission, c.model_year, c.mileage, c.price, c.source].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(query.toLowerCase());
  }).sort((a, b) => (b.created_at || b.posted_time || "").localeCompare(a.created_at || a.posted_time || ""));
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const pageSlice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const intentCardCls = (mode) =>
    `intent-card group relative flex flex-col items-start overflow-hidden rounded-2xl border-2 bg-white px-6 py-7 text-left shadow-sm ring-0 transition-all dark:bg-zinc-900 ` +
    (intent === mode
      ? mode === "buy" ? "border-violet-400/70 shadow-violet-500/10" : "border-sky-400/70 shadow-sky-500/10"
      : "border-transparent hover:border-violet-400/60 hover:shadow-md dark:hover:border-violet-500/50");

  return (
    <>
      {/* Section 1: Intent cards + search */}
      <section className="relative overflow-hidden px-4 pb-6 pt-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
          <div className="absolute left-1/4 top-10 h-40 w-40 rounded-full bg-sky-400/8 blur-2xl dark:bg-sky-500/10"></div>
          <div className="absolute right-1/4 top-10 h-40 w-40 rounded-full bg-amber-400/8 blur-2xl dark:bg-amber-500/8"></div>
        </div>

        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
            Pakistan&apos;s AI-powered car marketplace
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Find your{" "}
            <span className="relative inline-flex text-violet-600 dark:text-violet-400">
              <AnimatedTextCycle
                words={["dream car", "perfect SUV", "best deal", "family ride", "next upgrade"]}
                interval={3000}
                className="text-4xl sm:text-5xl tracking-tight"
              />
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-slate-500 dark:text-zinc-400">
            AI-powered search across PakWheels &amp; OLX — 50,000+ listings in Pakistan.
          </p>
        </div>

        {/* Intent cards */}
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => setIntent("buy")} className={intentCardCls("buy")} aria-pressed={intent === "buy"}>
            <span className={`absolute inset-x-0 top-0 h-0.5 origin-left rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-transform duration-300 ${intent === "buy" ? "scale-x-100" : "scale-x-0"}`}></span>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/><circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none"/></svg>
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-white">Buy / Find a car</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">AI search across PakWheels &amp; OLX — 50,000+ listings in Pakistan.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400">
              Search listings
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </span>
          </button>

          <button type="button" onClick={() => setIntent("rent")} className={intentCardCls("rent")} aria-pressed={intent === "rent"}>
            <span className={`absolute inset-x-0 top-0 h-0.5 origin-left rounded-full bg-gradient-to-r from-sky-500 to-sky-300 transition-transform duration-300 ${intent === "rent" ? "scale-x-100" : "scale-x-0"}`}></span>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-white">Rent a car</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">Short-term rentals with or without driver. From PKR 2,500/day across Pakistan.</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 dark:text-sky-400">
              Browse rentals
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </span>
          </button>
        </div>

        {/* Search zone */}
        <div className="mx-auto mt-4 max-w-3xl">
          {/* Buy zone */}
          {intent === "buy" && (
            <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-white/80 backdrop-blur dark:border-violet-800/30 dark:bg-zinc-900/80">
              <div className="px-5 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-400">Find your car</p>
                <div className="search-glow relative flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                  <svg className="absolute left-4 h-5 w-5 shrink-0 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    type="search" autoComplete="off" spellCheck
                    placeholder="e.g. Honda Civic under 30 lakh in Lahore"
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                    disabled={searching || scraping}
                    className="min-h-[52px] w-full bg-transparent py-3 pl-12 pr-28 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500 disabled:opacity-60"
                  />
                  <button type="button" onClick={handleSearch} disabled={searching || scraping}
                    className="absolute right-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-violet-400 active:scale-95 disabled:opacity-60">
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
                  Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono dark:border-zinc-700 dark:bg-zinc-800">Enter</kbd> or click Search · AI finds the best matches.
                </p>
              </div>
            </div>
          )}

          {/* Rent zone */}
          {intent === "rent" && (
            <div className="overflow-hidden rounded-2xl border border-sky-200/60 bg-white/80 backdrop-blur dark:border-sky-800/30 dark:bg-zinc-900/80">
              <div className="px-5 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">Find a rental</p>
                <div className="flex gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800">
                    <svg className="h-4 w-4 shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
                    <input
                      type="text"
                      value={nlRentInput}
                      onChange={(e) => setNlRentInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRentAISearch(); }}
                      placeholder={'e.g. "SUV in Lahore with driver under 8000"'}
                      className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                  </div>
                  <button onClick={handleRentAISearch} disabled={nlRentLabel !== "Search with AI"}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:from-sky-400 disabled:opacity-60">
                    {nlRentLabel}
                  </button>
                </div>
                {nlRentResult && <p className="mt-1.5 px-1 text-xs text-slate-500 dark:text-zinc-400">{nlRentResult}</p>}
                <div className="my-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-700"></span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">or filter manually</span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-700"></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={rentCity} onChange={(e) => setRentCity(e.target.value)} className="flex-1 min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <option value="">Any city</option>
                    {["Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad","Peshawar","Multan"].map(c=><option key={c}>{c}</option>)}
                  </select>
                  <select value={rentType} onChange={(e) => setRentType(e.target.value)} className="flex-1 min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <option value="">Any type</option>
                    {["sedan","suv","hatchback","van","pickup"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                  <select value={rentDriver} onChange={(e) => setRentDriver(e.target.value)} className="flex-1 min-w-[120px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <option value="">Driver: any</option>
                    <option value="true">Driver included</option>
                    <option value="false">Self-drive</option>
                  </select>
                  <button
                    onClick={() => {
                      const q = new URLSearchParams();
                      if (rentCity) q.set("city", rentCity);
                      if (rentType) q.set("car_type", rentType);
                      if (rentDriver) q.set("driver_included", rentDriver);
                      navigate("/rent" + (q.toString() ? "?" + q.toString() : ""));
                    }}
                    className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-5 py-2 text-sm font-semibold text-white hover:from-sky-400 active:scale-95"
                  >Go</button>
                </div>
                <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
                  Or <Link to="/rent" className="font-semibold text-sky-600 hover:underline dark:text-sky-400">browse all rentals →</Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Toasts */}
      <div className="mx-auto max-w-3xl px-4">
        {hintMsg && <div className="mb-4 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">{hintMsg}</div>}
        {toastError && <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">{toastError}</div>}
        {toastSuccess && <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">{toastSuccess}</div>}
      </div>

      {/* Listings section */}
      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Car Listings</h2>
        </div>

        {/* Toolbar */}
        {items.length > 0 && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">{items.length} cars</p>
            <div className="relative w-full sm:max-w-md">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="search" placeholder="Filter this grid…" autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500" />
            </div>
          </div>
        )}

        {/* Meta bar */}
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
          <span className="font-semibold text-slate-900 dark:text-zinc-100">{items.length} listing{items.length !== 1 ? "s" : ""}</span>
          {query && <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-400">Filtered</span>}
        </div>

        {/* Scrape banner */}
        {scraping && (
          <div className="mb-4 overflow-hidden rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-3 dark:bg-violet-500/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400"></div>
                <span className="truncate text-sm font-medium text-violet-700 dark:text-violet-300">{scrapeText}</span>
              </div>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-violet-500/15">
              <div className="h-full rounded-full bg-violet-500 transition-[width] duration-300" style={{ width: Math.round(scrapeProgress * 100) + "%" }}></div>
            </div>
          </div>
        )}

        {/* Grid */}
        {items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageSlice.map((car) => <ListingCard key={car.id || car.url} car={car} />)}
          </div>
        ) : !scraping && (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600 dark:border-zinc-700 dark:text-zinc-400">
            <h3 className="mb-3 text-xl font-bold text-slate-800 dark:text-zinc-100">Your search starts here</h3>
            <p>Describe the car you want above and press <strong>Enter</strong>. We search PakWheels &amp; OLX, cache the results, and show them instantly on your next visit.</p>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <nav className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} · Page {currentPage} of {maxPage}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={currentPage <= 1} onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Previous</button>
              <button disabled={currentPage >= maxPage} onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">Next</button>
            </div>
          </nav>
        )}
      </section>

      {/* Chat widget */}
      <div className="fixed bottom-4 right-4 z-[10001] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        {chatOpen && (
          <div className="flex max-h-[min(72vh,560px)] w-[min(100vw-2rem,26rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-zinc-700">
              <div>
                <p className="font-bold text-slate-900 dark:text-zinc-100">Assistant</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-zinc-400">Uses your saved listing snapshot when available.</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-2xl leading-none text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">×</button>
            </div>
            <div ref={chatBoxRef} className="flex max-h-[min(38vh,320px)] min-h-[200px] flex-col gap-2 overflow-y-auto px-4 py-3" role="log">
              {chatThread.map((m, i) => (
                <div key={i} className={`flex max-w-[92%] flex-col ${m.role === "user" ? "self-end" : "self-start"}`}>
                  <div className={`rounded-lg px-3 py-2 text-sm leading-snug whitespace-pre-wrap break-words ${m.role === "user" ? "border border-amber-400/35 bg-amber-500/15 dark:border-amber-400/35" : "border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-4 py-3 dark:border-zinc-700">
              <textarea rows={2} placeholder="Ask about prices or listings…" autoComplete="off" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                className="min-h-[2.75rem] flex-1 resize-y rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" />
              <button disabled={chatSending} onClick={sendChat} className="shrink-0 self-end rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Send</button>
            </div>
            <div className="flex justify-end px-4 pb-3">
              <button onClick={() => setChatThread([{ role: "assistant", content: CHAT_WELCOME }])} className="text-xs font-medium text-slate-500 underline hover:text-slate-700 dark:hover:text-zinc-300">Clear conversation</button>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="rounded-full bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:from-violet-400 hover:to-violet-600"
          aria-expanded={chatOpen}
        >
          Chat
        </button>
      </div>
    </>
  );
}
