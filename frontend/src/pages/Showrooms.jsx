import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedTextCycle from "../components/AnimatedTextCycle";
import { useAuth } from "../contexts/AuthContext";
import { hasType } from "../utils/format";

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Peshawar", "Multan"];

function ShowroomCard({ s }) {
  return (
    <Link
      to={`/showrooms/${s.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex h-32 items-center justify-center bg-slate-50 dark:bg-zinc-800">
        {s.logo_url ? (
          <img src={s.logo_url} alt={s.business_name}
            className="h-20 w-20 rounded-xl border border-slate-200 object-contain dark:border-zinc-700"
            onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-3xl font-bold text-white">
            {s.business_name?.[0] || "S"}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
            {s.business_name}
          </p>
          {s.is_verified && <span className="shrink-0 text-xs text-emerald-500">✓</span>}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
          <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
          </svg>
          {s.city}
        </div>
        <p className="mt-auto pt-2 text-xs font-semibold text-violet-600 dark:text-violet-400">
          {s.total_listings} car{s.total_listings !== 1 ? "s" : ""} listed
        </p>
      </div>
    </Link>
  );
}

export default function Showrooms() {
  const { user, token } = useAuth();
  const isShowroomOwner = hasType(user, "showroom");
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ limit: "50" });
    if (city) q.set("city", city);
    fetch("/api/showroom/all?" + q)
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setShowrooms(d.items || []))
      .finally(() => setLoading(false));
  }, [city]);

  const filtered = search
    ? showrooms.filter((s) =>
        s.business_name.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase())
      )
    : showrooms;

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
          <div className="absolute left-1/4 top-10 h-40 w-40 rounded-full bg-amber-400/8 blur-2xl dark:bg-amber-500/8"></div>
          <div className="absolute right-1/4 top-10 h-40 w-40 rounded-full bg-sky-400/8 blur-2xl dark:bg-sky-500/10"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          Trusted car showrooms across Pakistan
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Browse{" "}
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={["verified dealers", "top showrooms", "Karachi sellers", "Lahore dealers", "trusted partners"]}
              interval={2800}
              className="text-4xl sm:text-5xl tracking-tight"
            />
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 dark:text-zinc-400">
          Find established car showrooms across Pakistan — browse their full inventory and connect directly.
        </p>
      </section>

      {/* Filters */}
      <div className="mx-auto max-w-5xl px-4 pb-6 lg:px-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="search" placeholder="Search by name or city…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <option value="">All cities</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Owner CTA banner */}
      <div className="mx-auto max-w-5xl px-4 pb-4 lg:px-6">
        {isShowroomOwner ? (
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-500/10 to-violet-700/5 px-6 py-5 dark:border-violet-800/30 dark:from-violet-800/20 dark:to-violet-900/10 sm:flex-row">
            <div>
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">You own a showroom</p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">Manage your profile, add cars, and track your listings from the dashboard.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link to="/showroom-dashboard"
                className="rounded-xl border border-violet-300/60 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 dark:border-violet-700/40 dark:bg-zinc-900 dark:text-violet-300 dark:hover:bg-zinc-800">
                My Dashboard
              </Link>
              <Link to="/showroom-dashboard"
                className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white hover:from-violet-400 active:scale-95">
                + Add Car
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Own a car showroom?</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">List your cars, get a verified profile, and reach thousands of buyers across Pakistan.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {token ? (
                <Link to="/showroom-setup"
                  className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white hover:from-violet-400 active:scale-95">
                  Set Up Your Showroom →
                </Link>
              ) : (
                <>
                  <Link to="/login"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    Login
                  </Link>
                  <Link to="/register"
                    className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white hover:from-violet-400 active:scale-95">
                    Register as Partner →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-5xl px-4 pb-16 lg:px-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-zinc-700">
            <p className="text-lg font-semibold text-slate-800 dark:text-zinc-100">No showrooms found</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Try a different city or search term.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              {filtered.length} showroom{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((s) => <ShowroomCard key={s.id} s={s} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
