import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/format";

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Peshawar", "Multan", "Quetta"];
const TYPES = ["sedan", "suv", "hatchback", "van", "pickup"];

export default function Rent() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [city, setCity] = useState(params.get("city") || "");
  const [carType, setCarType] = useState(params.get("car_type") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("max_price") || "");
  const [driver, setDriver] = useState(
    params.get("driver_included") === "true" ? true : params.get("driver_included") === "false" ? false : null
  );
  const [listings, setListings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nlInput, setNlInput] = useState("");
  const [nlLabel, setNlLabel] = useState("Search with AI");
  const [nlResult, setNlResult] = useState("");
  const [showClear, setShowClear] = useState(false);

  async function loadListings(c = city, t = carType, p = maxPrice, d = driver) {
    setLoading(true);
    const q = new URLSearchParams();
    if (c) q.set("city", c);
    if (t) q.set("car_type", t);
    if (p) q.set("max_price", p);
    if (d !== null) q.set("driver_included", d ? "true" : "false");
    try {
      const r = await fetch("/api/rent/listings?" + q.toString());
      if (!r.ok) throw new Error();
      setListings(await r.json());
    } catch { setListings([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadListings(); }, []);

  async function runAISearch() {
    if (!nlInput.trim()) return;
    setNlLabel("Searching…");
    setNlResult("");
    try {
      const r = await fetch("/api/rent/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlInput }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Search failed");
      const c2 = data.city || city;
      const t2 = data.car_type || carType;
      const p2 = data.max_price || maxPrice;
      const d2 = data.driver_included ?? driver;
      setCity(c2); setCarType(t2); setMaxPrice(p2); setDriver(d2);
      const parts = [];
      if (data.city) parts.push("City: " + data.city);
      if (data.car_type) parts.push("Type: " + data.car_type);
      if (data.max_price) parts.push("Max: PKR " + Number(data.max_price).toLocaleString() + "/day");
      if (data.driver_included != null) parts.push("Driver: " + (data.driver_included ? "included" : "self-drive"));
      setNlResult(parts.length ? "AI applied: " + parts.join(" · ") : "");
      setShowClear(true);
      loadListings(c2, t2, p2, d2);
    } catch (e) {
      setNlResult("Could not parse query. Try adjusting the filters manually.");
    } finally {
      setNlLabel("Search with AI");
    }
  }

  function clearAI() {
    setNlInput(""); setNlResult(""); setShowClear(false);
    setCity(""); setCarType(""); setMaxPrice(""); setDriver(null);
    loadListings("", "", "", null);
  }

  const driverBtnCls = (val) =>
    driver === val
      ? "driver-btn rounded-xl border border-violet-500 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-700 dark:text-violet-300"
      : "driver-btn rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  const selectCls = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          Rental cars across Pakistan
        </p>
        <h1 className="mx-auto max-w-xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">Rent a car</h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 dark:text-zinc-400">
          Browse verified rental cars in Karachi, Lahore, Islamabad and more. Self-drive or with driver — book in minutes.
        </p>
      </section>

      {/* Filters */}
      <div className="mx-auto max-w-5xl px-4 pb-6 lg:px-6">
        {/* AI search */}
        <div className="mb-3 flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-800">
            <svg className="h-4 w-4 shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            <input
              type="text"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAISearch()}
              placeholder='e.g. "SUV in Lahore with driver under 8000"'
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>
          <button onClick={runAISearch} disabled={nlLabel === "Searching…"}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:from-sky-400 disabled:opacity-60">
            {nlLabel}
          </button>
          {showClear && (
            <button onClick={clearAI} className="shrink-0 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300">Clear</button>
          )}
        </div>
        {nlResult && <p className="mb-3 px-1 text-xs text-slate-500 dark:text-zinc-400">{nlResult}</p>}

        {/* Manual filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex min-w-[140px] flex-1 flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className={selectCls}>
              <option value="">All cities</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex min-w-[140px] flex-1 flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Car type</label>
            <select value={carType} onChange={(e) => setCarType(e.target.value)} className={selectCls}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex min-w-[150px] flex-1 flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Max price / day (PKR)</label>
            <input type="number" min="0" step="500" placeholder="e.g. 8000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
              className={selectCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Driver</label>
            <div className="flex gap-2">
              <button onClick={() => setDriver(null)} className={driverBtnCls(null)}>Any</button>
              <button onClick={() => setDriver(true)} className={driverBtnCls(true)}>With driver</button>
              <button onClick={() => setDriver(false)} className={driverBtnCls(false)}>Self-drive</button>
            </div>
          </div>
          <button onClick={() => loadListings()} className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-400 hover:to-violet-600 active:scale-[0.99]">
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      <main className="mx-auto max-w-5xl px-4 pb-20 lg:px-6">
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {listings !== null && !loading ? `${listings.length} car${listings.length !== 1 ? "s" : ""} found` : ""}
          </p>
        </div>

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-zinc-800"></div>)}
          </div>
        )}

        {!loading && listings?.length === 0 && (
          <div className="py-20 text-center">
            <svg className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
            </svg>
            <p className="text-base font-semibold text-slate-600 dark:text-zinc-300">No cars found</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-zinc-500">Try adjusting your filters.</p>
          </div>
        )}

        {!loading && listings && listings.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((car) => (
              <Link
                key={car.id}
                to={`/rent-detail?id=${car.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-zinc-800">
                  <img
                    src={car.image_url || "/static/images/car-placeholder.svg"}
                    alt={car.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    onError={(e) => { e.target.src = "/static/images/car-placeholder.svg"; e.target.classList.add("p-6", "object-contain"); }}
                  />
                  <div className="absolute bottom-2 left-2">
                    {car.driver_included
                      ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Driver included</span>
                      : <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400">Self-drive</span>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">{car.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                    <span className="flex items-center gap-0.5">
                      <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                      {car.city}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 capitalize dark:border-zinc-700 dark:bg-zinc-800">{car.car_type}</span>
                    {car.model_year && <span>{car.model_year}</span>}
                  </div>
                  <div className="mt-auto pt-2 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatPrice(car.price_per_day)}</span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">/ day</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Become a partner CTA */}
        <div className="mt-12 rounded-2xl border border-violet-300/40 bg-violet-500/5 px-6 py-8 text-center dark:border-violet-500/20 dark:bg-violet-950/10">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Own a car?</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">List it for rent and start earning. Manage your listings and bookings from your partner dashboard.</p>
          <Link
            to={user?.account_type === "rental_partner" ? "/rent-dashboard" : "/register?type=rental_partner"}
            className="mt-4 inline-flex rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-400"
          >
            {user?.account_type === "rental_partner" ? "Go to my dashboard" : "Become a rental partner"}
          </Link>
        </div>
      </main>
    </>
  );
}
