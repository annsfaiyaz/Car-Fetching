(function () {
  "use strict";

  const PLACEHOLDER = "/static/images/car-placeholder.svg";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPrice(price) {
    if (price == null || price === "") return "Price on request";
    return "PKR " + Number(price).toLocaleString();
  }

  function renderAdCard(item) {
    const img = item.image_url
      ? '<img src="' + escapeHtml(item.image_url) + '" alt="" class="aspect-[16/10] w-full rounded-lg object-cover" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'" />'
      : '<div class="flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800"><img src="' + PLACEHOLDER + '" alt="" class="h-16 opacity-40" /></div>';

    const badges = [];
    if (item.city) badges.push('<span class="rounded-md bg-sky-500/15 px-2 py-0.5 text-[0.72rem] font-semibold text-sky-700 dark:text-sky-300">' + escapeHtml(item.city) + "</span>");
    if (item.model_year) badges.push('<span class="rounded-md bg-violet-500/15 px-2 py-0.5 text-[0.72rem] font-semibold text-violet-700 dark:text-violet-300">' + escapeHtml(String(item.model_year)) + "</span>");
    badges.push('<span class="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.72rem] font-semibold text-emerald-700 dark:text-emerald-300">Your listing</span>');

    return (
      '<article class="animate-fade-in flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">' +
      img +
      '<h2 class="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-zinc-100">' +
      escapeHtml(item.title || "Untitled") +
      "</h2>" +
      '<div class="text-lg font-bold text-amber-600 dark:text-amber-400">' +
      formatPrice(item.price) +
      "</div>" +
      '<div class="flex flex-wrap gap-1.5">' +
      badges.join("") +
      "</div>" +
      (item.description
        ? '<p class="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">' +
          escapeHtml(item.description) +
          "</p>"
        : "") +
      '<div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-zinc-800">' +
      '<div class="flex gap-3">' +
      '<a href="/post-ad?edit=' +
      encodeURIComponent(String(item.id)) +
      '" class="font-semibold text-violet-600 hover:underline dark:text-violet-400">Edit</a>' +
      '<button type="button" data-delete-ad="' +
      escapeHtml(String(item.id)) +
      '" class="font-semibold text-red-600 hover:underline dark:text-red-400">Delete</button>' +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  document.addEventListener("DOMContentLoaded", async function () {
    if (!window.WheelWiseAuth || !WheelWiseAuth.requireAuth("/my-ads")) return;

    const list = document.getElementById("ads-list");
    const empty = document.getElementById("ads-empty");
    const loading = document.getElementById("ads-loading");

    try {
      const r = await fetch("/api/user-ads", { headers: WheelWiseAuth.authHeaders() });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed to load ads");
      if (loading) loading.remove();
      const items = data.items || [];
      if (!items.length) {
        empty.classList.remove("hidden");
        return;
      }
      list.innerHTML = items.map(renderAdCard).join("");

      list.addEventListener("click", async function (ev) {
        const btn = ev.target.closest("[data-delete-ad]");
        if (!btn) return;
        const adId = btn.getAttribute("data-delete-ad");
        if (!adId) return;
        const title =
          btn.closest("article") &&
          btn.closest("article").querySelector("h2") &&
          btn.closest("article").querySelector("h2").textContent;
        if (
          !window.confirm(
            "Delete this ad" + (title ? ' (“' + title.trim() + '”)' : "") + "? This cannot be undone."
          )
        ) {
          return;
        }
        btn.disabled = true;
        try {
          const dr = await fetch("/api/user-ads/" + encodeURIComponent(adId), {
            method: "DELETE",
            headers: WheelWiseAuth.authHeaders(),
          });
          const dd = await dr.json().catch(function () {
            return {};
          });
          if (!dr.ok) throw new Error(dd.detail || "Delete failed");
          btn.closest("article").remove();
          if (!list.querySelector("article")) {
            empty.classList.remove("hidden");
          }
        } catch (delErr) {
          alert(String(delErr.message || delErr));
          btn.disabled = false;
        }
      });
    } catch (e) {
      if (loading) loading.classList.add("hidden");
      list.innerHTML =
        '<div class="col-span-full rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">' +
        escapeHtml(String(e.message || e)) +
        "</div>";
    }
  });
})();
