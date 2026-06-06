import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice, formatPostedTime } from "../utils/format";

export default function MyAds() {
  const { token, authHeaders, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMe().then((user) => {
      if (!user) navigate("/login?next=/my-ads");
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/user-ads/", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setAds(Array.isArray(data) ? data : data.items || []))
      .catch(() => setError("Failed to load ads."));
  }, [token]);

  async function deleteAd(id) {
    if (!confirm("Delete this listing?")) return;
    await fetch("/api/user-ads/" + id, { method: "DELETE", headers: authHeaders() });
    setAds((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <section className="ww-page-hero px-4 pb-4 pt-6 text-center sm:pt-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          Your listings
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">My ads</h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-slate-600 dark:text-zinc-400">
          Manage car advertisements you published on WheelWise PK.
        </p>
        <Link to="/sell" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:from-violet-400">
          + Post another car
        </Link>
      </section>

      <main className="mx-auto max-w-7xl px-4 pb-16 lg:px-6">
        {ads === null && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800"></div>)}
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {ads && ads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-lg font-semibold text-slate-800 dark:text-zinc-100">No ads yet</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">Upload photos and let AI fill in your listing details.</p>
            <Link to="/sell" className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-3 text-sm font-semibold text-white hover:from-violet-400">Sell your car</Link>
          </div>
        )}
        {ads && ads.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <article key={ad.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {ad.image_url && (
                  <div className="-mx-4 -mt-4 mb-1 overflow-hidden rounded-t-xl">
                    <img src={ad.image_url} alt={ad.title} className="h-48 w-full object-cover" onError={(e) => { e.target.src = "/static/images/car-placeholder.svg"; }} />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{ad.title}</h2>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${ad.status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                    {ad.status || "draft"}
                  </span>
                </div>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400">{formatPrice(ad.price)}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{formatPostedTime(ad)}</p>
                <div className="flex gap-2 pt-1">
                  <Link to={`/post-ad?edit=${ad.id}`} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                    Edit
                  </Link>
                  <button onClick={() => deleteAd(ad.id)} className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
