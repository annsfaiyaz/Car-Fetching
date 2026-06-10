import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { token, authHeaders, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState("nvidia");
  const [maxPages, setMaxPages] = useState("");
  const [maxListings, setMaxListings] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((user) => {
      if (!user || user.role !== "admin") navigate("/");
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/settings/", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.llm_provider) setProvider(data.llm_provider);
        if (data.max_scrape_pages) setMaxPages(data.max_scrape_pages);
        if (data.max_listings_per_scrape) setMaxListings(data.max_listings_per_scrape);
        if (data.max_listing_age_hours) setMaxAge(data.max_listing_age_hours);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function save() {
    setStatus("");
    const body = {
      llm_provider: provider,
      max_scrape_pages: maxPages ? Number(maxPages) : undefined,
      max_listings_per_scrape: maxListings ? Number(maxListings) : undefined,
      max_listing_age_hours: maxAge ? Number(maxAge) : undefined,
    };
    try {
      const r = await fetch("/api/settings/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      setStatus(r.ok ? "Saved!" : "Save failed.");
    } catch {
      setStatus("Save failed.");
    }
  }

  const inputCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
    <main className="mx-auto max-w-lg px-4 py-10 lg:px-6">
      <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
        Configuration
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
        Values below are stored in your SQLite settings table. They override defaults when the app reads them; some environment variables still apply directly to scrapers (see{" "}
        <code className="rounded bg-slate-200 px-1 dark:bg-zinc-800">backend/.env.example</code>).
      </p>
      <p className="mt-3 text-sm text-slate-600 dark:text-zinc-400">
        Search URL patterns for the LLM are maintained in <code className="rounded bg-slate-200 px-1 dark:bg-zinc-800">docs/*.md</code>. Optional additions:{" "}
        <code className="rounded bg-slate-200 px-1 dark:bg-zinc-800">docs/pakwheels_patterns_user.md</code>,{" "}
        <code className="rounded bg-slate-200 px-1 dark:bg-zinc-800">docs/olx_patterns_user.md</code>.
      </p>

      {loading ? (
        <div className="mt-8 h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800"></div>
      ) : (
        <div className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
          <label className="block text-sm">
            <span className="font-medium text-slate-800 dark:text-zinc-200">Default LLM provider</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls}>
              <option value="nvidia">NVIDIA NIM</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="local">Local (Ollama-compatible)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800 dark:text-zinc-200">Max scrape pages (per marketplace run)</span>
            <input type="number" min="1" max="50" value={maxPages} onChange={(e) => setMaxPages(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800 dark:text-zinc-200">Max listings per scrape (cap)</span>
            <input type="number" min="1" max="500" value={maxListings} onChange={(e) => setMaxListings(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-800 dark:text-zinc-200">Max listing age window (hours)</span>
            <input type="number" min="1" max="8760" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className={inputCls} />
          </label>
          <button
            type="button" onClick={save}
            className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 py-3 text-sm font-semibold text-white shadow hover:from-violet-400 hover:to-violet-600 active:scale-[0.99]"
          >
            Save settings
          </button>
          {status && <p className="min-h-[1.25rem] text-center text-sm text-slate-600 dark:text-zinc-400">{status}</p>}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500 dark:text-zinc-500">
        Provider API keys are configured through the API (<code className="rounded bg-slate-200 px-1 dark:bg-zinc-800">/api/settings/credentials</code>) or your deployment; they are encrypted when{" "}
        <code className="rounded bg-slate-200 px-1 dark:bg-zinc-800">APP_SECRET_KEY</code> is set.
      </p>
    </main>
    </div>
  );
}
