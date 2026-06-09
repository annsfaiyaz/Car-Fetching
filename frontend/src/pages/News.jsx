import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { timeAgo } from "../utils/format";
import AnimatedTextCycle from "../components/AnimatedTextCycle";

export default function News() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/external/news?relevant=true&limit=48")
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setError("Could not load news."));
  }, []);

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
    <main className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <div className="mb-8">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          Auto &amp; Mobility
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={["Latest News", "Industry Updates", "Market Trends", "Fresh Headlines"]}
              interval={2800}
              className="text-3xl tracking-tight"
            />
          </span>
        </h1>
        <p className="mt-2 text-slate-600 dark:text-zinc-400">
          Headlines from RSS feeds you configure under{" "}
          <Link to="/settings" className="font-semibold text-violet-600 underline dark:text-violet-400">Settings</Link>.
          The background job runs <strong>every hour</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {error ? (
          <p className="col-span-full text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : items === null ? (
          <p className="col-span-full text-sm text-slate-500 dark:text-zinc-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="col-span-full text-sm text-slate-600 dark:text-zinc-400">
            No cached headlines yet. Add RSS feeds in{" "}
            <Link to="/settings" className="underline font-semibold text-violet-600 dark:text-violet-400">Settings</Link> and wait for the background job.
          </p>
        ) : (
          items.slice(0, 24).map((x, i) => {
            const body = (x.body || "").replace(/<[^>]+>/g, "");
            return (
              <a
                key={i}
                href={x.source_url || "#"}
                target="_blank" rel="noopener noreferrer"
                className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-400/60 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-800 dark:hover:border-violet-500/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">{x.source || "News"}</p>
                <p className="line-clamp-2 font-semibold leading-snug text-slate-900 group-hover:text-violet-700 dark:text-zinc-100 dark:group-hover:text-violet-300">{x.title || ""}</p>
                <p className="line-clamp-3 text-sm text-slate-600 dark:text-zinc-400">{body}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 dark:text-zinc-500">{timeAgo(x.published_at || x.fetched_at)}</span>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Read →</span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </main>
    </div>
  );
}
