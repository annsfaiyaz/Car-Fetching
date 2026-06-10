import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AnimatedTextCycle from "../components/AnimatedTextCycle";

export default function Sell() {
  const { token, authHeaders, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetchMe().then((u) => setUser(u));
  }, []);

  function handleFiles(files) {
    const selected = Array.from(files).slice(0, 6);
    setImages(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!images.length) { setStatus("Please upload at least one photo."); return; }
    setLoading(true);
    setStatus("Analyzing with AI…");
    try {
      const fd = new FormData();
      images.forEach((img) => fd.append("images", img));
      if (hint) fd.append("hint", hint);
      const r = await fetch("/api/sell/analyze", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Analysis failed");
      const params = new URLSearchParams();
      if (data.session_id) params.set("session", data.session_id);
      navigate("/post-ad?" + params.toString());
    } catch (err) {
      setStatus(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  if (!user && token) return null;

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
      <section className="px-4 pb-2 pt-6 text-center sm:pt-10">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          AI-powered listing
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Sell your{" "}
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={["car", "sedan", "SUV", "hatchback", "pickup"]}
              interval={2800}
              className="text-3xl sm:text-5xl tracking-tight"
            />
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-600 dark:text-zinc-400">
          Upload photos from different angles. AI detects make, model, year, and condition — then you review and confirm before anything is published.
        </p>
      </section>

      <main className="mx-auto max-w-2xl px-4 pb-16 lg:px-6">
        {!user ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-violet-200/60 bg-white shadow-sm dark:border-violet-800/30 dark:bg-zinc-900">
            <div className="bg-gradient-to-br from-violet-500/10 to-violet-700/5 px-6 py-8 text-center dark:from-violet-800/20 dark:to-violet-900/10">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
                  <circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to sell your car</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                Create a free account to upload photos, let AI fill in listing details, and publish to thousands of buyers.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/login?next=/sell" className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-400">Login</Link>
                <Link to="/register?next=/sell" className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Create account</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 dark:divide-zinc-800 dark:border-zinc-800">
              {[["AI-powered", "Auto-fills details from photos"], ["Free", "No listing fees"], ["Fast", "Live in minutes"]].map(([title, sub]) => (
                <div key={title} className="px-4 py-3 text-center">
                  <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{title}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="animate-fade-in space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Car photos <span className="text-slate-400">(up to 6)</span>
              </label>
              <label
                className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 transition hover:border-violet-400 hover:bg-violet-50/30 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-violet-500 dark:hover:bg-violet-950/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              >
                <svg className="mb-3 h-10 w-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Click to upload images</span>
                <span className="mt-1 text-xs text-slate-500 dark:text-zinc-500">JPG, PNG or WebP</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="" className="h-32 w-full rounded-xl object-cover border border-slate-200 dark:border-zinc-700" />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="user-hint" className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
                Additional details <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="user-hint" rows={3}
                placeholder="e.g. Honda City 2018, white, 80k km, Lahore"
                value={hint} onChange={(e) => setHint(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-400 hover:to-violet-600 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Analyzing…" : "Analyze with AI"}
            </button>
            {status && <p className="text-center text-sm text-slate-600 dark:text-zinc-400">{status}</p>}
          </form>
        )}
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-500">
          After AI analysis you will review the details, then publish when ready. Manage listings under{" "}
          <Link to="/my-ads" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">My ads</Link>.
        </p>
      </main>
    </div>
  );
}
