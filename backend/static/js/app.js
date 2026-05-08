(function () {
  "use strict";

  const LS_PLATFORM_URL = "pakwheels_platform_search_url";
  const LS_OLX_URL = "pakwheels_olx_search_url";
  const LS_NL_QUERY = "pakwheels_nl_query";
  const LS_THEME = "pakwheels_theme";

  const CHAT_WELCOME =
    "Ask about your saved listings (prices, cities, comparisons) or general used-car topics in Pakistan. Listing details come from your database snapshot when you send a message.";

  let chatThread = [];
  let allItems = [];
  let lastMeta = { total_in_db: 0, filtered_by_search_url: false };
  /** Current page (1-based) for the listing grid; PAGE_SIZE cards per page. */
  let listingPage = 1;
  const PAGE_SIZE = 10;

  const STREAM_MAX_DEFAULT = 25;

  function $(id) {
    return document.getElementById(id);
  }

  function appendChatBubble(role, text) {
    const box = $("chat-messages");
    const wrap = document.createElement("div");
    wrap.className = "flex max-w-[92%] flex-col " + (role === "user" ? "self-end" : "self-start");
    const bubble = document.createElement("div");
    bubble.className =
      "rounded-lg px-3 py-2 text-sm leading-snug whitespace-pre-wrap break-words " +
      (role === "user"
        ? "border border-amber-400/35 bg-amber-500/15 dark:border-amber-400/35"
        : "border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900");
    bubble.textContent = text;
    wrap.appendChild(bubble);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function setChatOpen(open) {
    const panel = $("chat-panel");
    const fab = $("chat-fab");
    panel.classList.toggle("hidden", !open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) setTimeout(() => $("chat-input").focus(), 80);
  }

  function resetChat() {
    chatThread = [];
    $("chat-messages").innerHTML = "";
    appendChatBubble("assistant", CHAT_WELCOME);
  }

  async function sendChat() {
    const input = $("chat-input");
    const text = input.value.trim();
    if (!text) return;

    const btn = $("chat-send");
    const box = $("chat-messages");
    appendChatBubble("user", text);
    input.value = "";

    const pending = { role: "user", content: text };
    const payload = { messages: [...chatThread, pending] };
    const pu = $("platform-url").value.trim();
    if (pu) payload.search_url = pu;

    btn.disabled = true;
    btn.classList.add("opacity-60");
    $("toast-error").classList.add("hidden");

    try {
      const r = await fetch("/api/pakwheels/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rawText = await r.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(rawText || r.statusText);
      }
      if (!r.ok) {
        let detail = data.detail;
        if (typeof detail !== "string") detail = JSON.stringify(detail);
        throw new Error(detail || rawText || "Chat failed");
      }
      chatThread.push(pending);
      chatThread.push({ role: "assistant", content: data.reply });
      appendChatBubble("assistant", data.reply);
    } catch (e) {
      if (box.lastChild) box.removeChild(box.lastChild);
      showToastError(String(e.message || e));
    } finally {
      btn.disabled = false;
      btn.classList.remove("opacity-60");
    }
  }

  function platformUrlQuery() {
    const u = $("platform-url").value.trim();
    const ox = $("olx-url").value.trim();
    const params = new URLSearchParams();
    if (u) params.set("search_url", u);
    if (ox) params.set("olx_search_url", ox);
    const qs = params.toString();
    return qs ? "?" + qs : "";
  }

  function setScrapeOverlayProgress(message, progress) {
    const detail = $("scrape-overlay-detail");
    const fill = $("scrape-progress-fill");
    if (detail != null && message != null) detail.textContent = message;
    if (fill != null && typeof progress === "number" && !Number.isNaN(progress)) {
      fill.style.width = Math.min(100, Math.max(0, progress * 100)) + "%";
    }
  }

  function runStreamingScrape(syncOrigin) {
    const url = $("platform-url").value.trim();
    const olxUrl = $("olx-url").value.trim();
    localStorage.setItem(LS_PLATFORM_URL, url);
    localStorage.setItem(LS_OLX_URL, olxUrl);
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = proto + "//" + location.host + "/api/pakwheels/ws/scrape";

    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(wsUrl);

      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        fn(arg);
      };

      ws.onopen = () => {
        const payload = {
          url,
          sync_origin: syncOrigin === "ai" ? "ai" : "url",
          max_listings: STREAM_MAX_DEFAULT,
        };
        if (olxUrl) payload.olx_url = olxUrl;
        ws.send(JSON.stringify(payload));
        setScrapeOverlayProgress("Connecting…", 0);
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "started") {
          const t = msg.target || STREAM_MAX_DEFAULT;
          setScrapeOverlayProgress(
            `Fetching up to ${t} listings (each opens a detail page in the scraper)…`,
            0
          );
        }
        if (msg.type === "listing") {
          const idx = msg.index || 0;
          const tgt = msg.target || STREAM_MAX_DEFAULT;
          setScrapeOverlayProgress(`Saved ${idx} / ${tgt}`, msg.progress);
        }
        if (msg.type === "done") {
          applyResyncResponse(msg);
          finish(resolve, msg);
          ws.close();
        }
        if (msg.type === "error") {
          finish(reject, new Error(msg.message || "Scrape failed"));
          ws.close();
        }
      };

      ws.onerror = () => {
        finish(reject, new Error("WebSocket connection failed"));
      };

      ws.onclose = (ev) => {
        if (!settled && ev.code !== 1000) {
          finish(reject, new Error("Connection closed before completion"));
        }
      };
    });
  }

  function setScraping(active) {
    const el = $("scrape-overlay");
    el.classList.toggle("hidden", !active);
    el.setAttribute("aria-hidden", active ? "false" : "true");
    document.body.style.overflow = active ? "hidden" : "";
    const qIn = $("nl-query");
    if (qIn) qIn.disabled = active;
    if (!active) {
      setScrapeOverlayProgress("", 0);
      const fill = $("scrape-progress-fill");
      if (fill) fill.style.width = "0%";
    }
  }

  function showHints(hints) {
    const p = $("hints-panel");
    if (!hints || !hints.length) {
      p.classList.add("hidden");
      p.innerHTML = "";
      return;
    }
    p.innerHTML = hints.map((h) => '<p class="mb-2 last:mb-0">' + escapeHtml(h) + "</p>").join("");
    p.classList.remove("hidden");
  }

  function defaultEmptyHtml() {
    return (
      "<h3 class=\"mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100\">No listings yet</h3>" +
      "<p class=\"text-slate-600 dark:text-slate-400\">Type what you want in the bar above and press <strong>Enter</strong>. " +
      "We fetch matching listings from <strong>PakWheels</strong> and <strong>OLX</strong> into SQLite.</p>"
    );
  }

  function filterMismatchHtml() {
    return (
      "<h3 class=\"mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100\">No rows for this search</h3>" +
      "<p class=\"text-slate-600 dark:text-slate-400\">Your saved URL filter doesn’t match anything in the DB. Run a new search or clear site data for this page and reload to browse all listings.</p>"
    );
  }

  function formatPrice(n) {
    if (n == null || n === "") return "—";
    return (
      "PKR " +
      Number(n).toLocaleString("en-PK", {
        maximumFractionDigits: 0,
      })
    );
  }

  function formatSyncLabel(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function formatPostedTime(val) {
    if (!val) return "";
    // If it looks like an ISO timestamp, convert it to a readable format
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return formatSyncLabel(val);
    return val;
  }

  function searchOriginClasses(car) {
    const o = car.search_origin;
    if (o === "ai") {
      return "border border-violet-400/35 bg-violet-500/15 text-violet-200";
    }
    if (o === "url") {
      return "border border-sky-400/35 bg-sky-500/15 text-sky-200";
    }
    return "border border-purple-500/25 bg-purple-950/40 text-purple-200";
  }

  function searchOriginLabel(car) {
    const o = car.search_origin;
    if (o === "ai") return "AI search";
    if (o === "url") return "URL";
    return "Legacy";
  }

  function platformSourceClasses(car) {
    return (car.source || "pakwheels") === "olx"
      ? "border border-teal-500/45 bg-teal-500/15 font-semibold text-teal-900 dark:text-teal-200"
      : "border border-amber-500/45 bg-amber-500/15 font-semibold text-amber-950 dark:text-amber-100";
  }

  function platformSourceLabel(car) {
    return (car.source || "pakwheels") === "olx" ? "OLX" : "PakWheels";
  }

  function listingOutboundLabel(car) {
    return (car.source || "pakwheels") === "olx" ? "Open on OLX →" : "Open on PakWheels →";
  }

  function matchesQuery(car, q) {
    if (!q) return true;
    const hay = [
      car.title,
      car.description,
      car.city,
      car.transmission,
      car.model_year,
      car.mileage,
      car.price,
      car.posted_time,
      car.url,
      car.id,
      car.source_search_url,
      car.search_origin,
      car.source,
    ]
      .filter((x) => x != null && x !== "")
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function updateListingSearchVisibility() {
    const wrap = $("listings-toolbar");
    if (!wrap) return;
    const show = allItems.length > 0;
    wrap.classList.toggle("hidden", !show);
    wrap.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function hidePaginationBar() {
    const nav = $("pagination-bar");
    if (nav) nav.classList.add("hidden");
  }

  function updatePaginationBar(totalFiltered) {
    const nav = $("pagination-bar");
    const summary = $("pagination-summary");
    const prev = $("pagination-prev");
    const next = $("pagination-next");
    if (!nav || !summary || !prev || !next) return;

    const maxPage = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
    if (listingPage > maxPage) listingPage = maxPage;
    if (listingPage < 1) listingPage = 1;

    const needsPaging = totalFiltered > PAGE_SIZE;
    nav.classList.toggle("hidden", !needsPaging);
    if (!needsPaging) return;

    const start = totalFiltered === 0 ? 0 : (listingPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(listingPage * PAGE_SIZE, totalFiltered);
    summary.textContent =
      "Showing " + start + "–" + end + " of " + totalFiltered + " · Page " + listingPage + " of " + maxPage;
    prev.disabled = listingPage <= 1;
    next.disabled = listingPage >= maxPage;
  }

  function render() {
    updateListingSearchVisibility();

    const searchEl = $("search");
    const q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    const filtered = allItems.filter((c) => matchesQuery(c, q));

    const totalDb = lastMeta.total_in_db != null ? lastMeta.total_in_db : allItems.length;
    const pu = $("platform-url").value.trim();
    if (pu && lastMeta.filtered_by_search_url) {
      $("count-display").textContent = allItems.length + " shown · " + totalDb + " total in DB";
    } else {
      $("count-display").textContent = allItems.length + " listings in database";
    }
    const fb = $("filter-badge");
    if (fb) fb.classList.toggle("hidden", !q);

    const grid = $("grid");
    const empty = $("empty");

    if (allItems.length === 0) {
      grid.innerHTML = "";
      hidePaginationBar();
      empty.classList.remove("hidden");
      empty.innerHTML =
        totalDb > 0 && lastMeta.filtered_by_search_url ? filterMismatchHtml() : defaultEmptyHtml();
      return;
    }

    empty.classList.add("hidden");

    const totalFiltered = filtered.length;
    const maxPage = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
    if (listingPage > maxPage) listingPage = maxPage;
    if (listingPage < 1) listingPage = 1;

    const pageSlice = filtered.slice((listingPage - 1) * PAGE_SIZE, listingPage * PAGE_SIZE);

    grid.innerHTML = pageSlice
      .map(
        (car) => `
      <article class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <h2 class="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">${escapeHtml(car.title || "Untitled")}</h2>
        <div class="text-lg font-bold text-amber-600 dark:text-amber-400">${formatPrice(car.price)}</div>
        <div class="flex flex-wrap gap-1.5">
          <span class="rounded-md px-2 py-0.5 text-[0.72rem] ${platformSourceClasses(car)}" title="Marketplace">${escapeHtml(platformSourceLabel(car))}</span>
          <span class="rounded-md px-2 py-0.5 text-[0.72rem] font-medium ${searchOriginClasses(car)}">${escapeHtml(searchOriginLabel(car))}</span>
          <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[0.72rem] text-slate-600 dark:bg-slate-800 dark:text-slate-400">${escapeHtml(String(car.city || "—"))}</span>
          <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[0.72rem] text-slate-600 dark:bg-slate-800 dark:text-slate-400">${car.model_year != null ? escapeHtml(String(car.model_year)) : "—"}</span>
          <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[0.72rem] text-slate-600 dark:bg-slate-800 dark:text-slate-400">${escapeHtml(car.transmission || "—")}</span>
          <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[0.72rem] text-slate-600 dark:bg-slate-800 dark:text-slate-400">${car.mileage != null ? escapeHtml(String(car.mileage).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + " km" : "—"}</span>
        </div>
        ${car.description ? `<p class="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">${escapeHtml(car.description)}</p>` : ""}
        <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-500">
          <span>${escapeHtml(formatPostedTime(car.posted_time))}</span>
          <a class="font-semibold text-amber-600 hover:underline dark:text-amber-400" href="${escapeAttr(car.url || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(listingOutboundLabel(car))}</a>
        </div>
      </article>
    `
      )
      .join("");

    if (filtered.length === 0 && q) {
      grid.innerHTML =
        '<div class="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-600"><h3 class="mb-1 font-semibold text-slate-800 dark:text-slate-200">No matches</h3><p class="text-sm text-slate-600 dark:text-slate-400">Try another keyword.</p></div>';
      hidePaginationBar();
      return;
    }

    updatePaginationBar(totalFiltered);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function showToastSuccess(msg) {
    const el = $("toast-success");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(showToastSuccess._t);
    showToastSuccess._t = setTimeout(() => el.classList.add("hidden"), 9000);
  }

  function showToastError(msg) {
    const el = $("toast-error");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  async function loadCached() {
    const r = await fetch("/api/pakwheels/listings" + platformUrlQuery());
    if (!r.ok) throw new Error("Failed to load listings");
    const data = await r.json();
    allItems = data.items || [];
    lastMeta = {
      total_in_db: data.total_in_db != null ? data.total_in_db : data.count,
      filtered_by_search_url: !!data.filtered_by_search_url,
    };
    $("sync-display").textContent = "Last scrape saved: " + formatSyncLabel(data.synced_at);
    $("sync-stats").textContent = "";
    const errEl = $("toast-error");
    if (data.last_error) {
      errEl.textContent = data.last_error;
      errEl.classList.remove("hidden");
    } else {
      errEl.classList.add("hidden");
    }
    listingPage = 1;
    render();
  }

  function applyResyncResponse(data) {
    allItems = data.items || [];
    lastMeta = {
      total_in_db: data.total_in_db != null ? data.total_in_db : data.count,
      filtered_by_search_url: !!data.filtered_by_search_url,
    };
    $("sync-display").textContent = "Last scrape saved: " + formatSyncLabel(data.synced_at);
    const ws = data.write_stats;
    const win = data.max_age_hours_used != null ? ` · window ${data.max_age_hours_used}h` : "";
    const extra = ws
      ? `This run: ${ws.upserted} new, ${ws.modified} updated · scraped ${data.scraped_count ?? "—"}${win}`
      : "";
    $("sync-stats").textContent = extra;
    if (ws && data.count != null) {
      showToastSuccess(
        `${data.count} listing(s) for this search. Inserts: ${ws.upserted}, updates: ${ws.modified}.`
      );
    }
    showHints(data.hints || []);
    listingPage = 1;
    render();
  }

  async function translateAndSearchPakwheels() {
    const query = $("nl-query").value.trim();
    if (!query) {
      showToastError("Type what you’re looking for, then press Enter.");
      return;
    }
    localStorage.setItem(LS_NL_QUERY, query);

    const qIn = $("nl-query");
    qIn.classList.add("opacity-60");
    qIn.disabled = true;
    $("toast-error").classList.add("hidden");
    $("toast-success").classList.add("hidden");
    $("ollama-model-hint").textContent = "";

    try {
      const r = await fetch("/api/pakwheels/suggest-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query,
            }),
      });
      const text = await r.text();
      let sug;
      try {
        sug = JSON.parse(text);
      } catch {
        throw new Error(text || r.statusText);
      }
      if (!r.ok) {
        let detail = sug.detail;
        if (typeof detail !== "string") detail = JSON.stringify(detail);
        throw new Error(detail || text || "Could not build PakWheels URL");
      }
      $("platform-url").value = sug.suggested_url || "";
      $("olx-url").value = sug.olx_url || "";
      localStorage.setItem(LS_PLATFORM_URL, $("platform-url").value.trim());
      localStorage.setItem(LS_OLX_URL, $("olx-url").value.trim());
      const model = sug.model || "";
      const olxModel = sug.olx_model || "";
      let mh = "";
      if (model) mh += "PW: " + model;
      if (olxModel) mh += (mh ? " · " : "") + "OLX: " + olxModel;
      $("ollama-model-hint").textContent = mh;

      showHints([]);
      setScraping(true);
      try {
        await runStreamingScrape("ai");
      } finally {
        setScraping(false);
      }
    } catch (e) {
      showToastError(String(e.message || e));
    } finally {
      qIn.classList.remove("opacity-60");
      qIn.disabled = false;
    }
  }

  function syncThemeToggleLabel() {
    const btn = $("btn-theme-toggle");
    if (!btn) return;
    const dark = document.documentElement.classList.contains("dark");
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function applyStoredTheme() {
    try {
      const s = localStorage.getItem(LS_THEME);
      if (s === "dark") document.documentElement.classList.add("dark");
      else if (s === "light") document.documentElement.classList.remove("dark");
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    } catch (_) {}
    syncThemeToggleLabel();
  }

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(LS_THEME, dark ? "dark" : "light");
    } catch (_) {}
    syncThemeToggleLabel();
  }

  function initPlatformUrl() {
    try {
      const saved = localStorage.getItem(LS_PLATFORM_URL);
      if (saved) $("platform-url").value = saved;
      const ox = localStorage.getItem(LS_OLX_URL);
      if (ox) $("olx-url").value = ox;
      const nq = localStorage.getItem(LS_NL_QUERY);
      if (nq) $("nl-query").value = nq;
    } catch (_) {}
  }

  /** Boot */
  applyStoredTheme();

  $("btn-theme-toggle").addEventListener("click", toggleTheme);

  $("nl-query").addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    translateAndSearchPakwheels();
  });

  $("chat-fab").addEventListener("click", () => {
    const panel = $("chat-panel");
    setChatOpen(panel.classList.contains("hidden"));
  });
  $("chat-close").addEventListener("click", () => setChatOpen(false));
  $("chat-send").addEventListener("click", () => sendChat());
  $("chat-clear").addEventListener("click", () => resetChat());
  $("chat-input").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      sendChat();
    }
  });

  $("search").addEventListener("input", () => {
    listingPage = 1;
    render();
  });

  $("pagination-prev").addEventListener("click", () => {
    if (listingPage > 1) {
      listingPage--;
      render();
      $("grid").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  $("pagination-next").addEventListener("click", () => {
    listingPage++;
    render();
    $("grid").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  initPlatformUrl();
  resetChat();

  loadCached().catch((e) => {
    showToastError(String(e.message || e));
  });
})();
