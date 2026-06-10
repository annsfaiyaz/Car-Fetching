import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimatedTextCycle from "../components/AnimatedTextCycle";
import { formatPrice } from "../utils/format";

function ListingCard({ l }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
      {l.image_url && (
        <div className="-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl">
          <div className="relative h-44 w-full bg-slate-100 dark:bg-zinc-800">
            <img src={l.image_url} alt={l.title}
              className="absolute inset-0 h-full w-full object-cover" loading="lazy"
              onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        </div>
      )}
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-zinc-100">{l.title}</h3>
      {l.price && <p className="text-base font-bold text-amber-600 dark:text-amber-400">{formatPrice(l.price)}</p>}
      <div className="flex flex-wrap gap-1.5">
        {l.city && <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-[0.72rem] text-sky-700 dark:text-sky-300">📍 {l.city}</span>}
        {l.model_year != null && <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[0.72rem] text-violet-700 dark:text-violet-300">🗓 {l.model_year}</span>}
        {l.transmission && <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.72rem] text-emerald-700 dark:text-emerald-300">⚙ {l.transmission}</span>}
        {l.mileage != null && <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[0.72rem] text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-300">🛣 {Number(l.mileage).toLocaleString()} km</span>}
      </div>
    </article>
  );
}

export default function ShowroomDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    Promise.all([
      fetch(`/api/showroom/${id}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/showroom/${id}/listings?limit=50`).then((r) => r.ok ? r.json() : { items: [] }),
    ]).then(([p, l]) => {
      setProfile(p);
      setListings(l?.items || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-xl font-bold text-slate-800 dark:text-zinc-100">Showroom not found</p>
        <Link to="/showrooms" className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-400">← Back to showrooms</Link>
      </div>
    );
  }

  const maxPage = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const pageSlice = listings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
          <div className="absolute left-1/4 top-10 h-40 w-40 rounded-full bg-amber-400/8 blur-2xl dark:bg-amber-500/8"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          {profile.city} · Car Showroom {profile.is_verified && "· ✓ Verified"}
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={[profile.business_name, `${profile.total_listings} cars listed`, profile.city]}
              interval={3000}
              className="text-4xl sm:text-5xl tracking-tight"
            />
          </span>
        </h1>
        {profile.description && (
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 dark:text-zinc-400">
            {profile.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            {profile.city}
          </span>
          {profile.contact_phone && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
              </svg>
              {profile.contact_phone}
            </span>
          )}
          <span className="font-semibold text-violet-600 dark:text-violet-400">{profile.total_listings} cars</span>
        </div>
      </section>

      {/* Back link + listings */}
      <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-6">
        <Link to="/showrooms" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
          All showrooms
        </Link>

        <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Available Cars</h2>

        {pageSlice.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-zinc-700">
            <p className="font-semibold text-slate-800 dark:text-zinc-100">No listings posted yet</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Check back soon for new arrivals.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageSlice.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
            {listings.length > PAGE_SIZE && (
              <nav className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  Page {page} of {maxPage} · {listings.length} cars total
                </p>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
                    Previous
                  </button>
                  <button disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
                    Next
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}
