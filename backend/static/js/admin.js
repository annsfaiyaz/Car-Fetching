(function () {
  "use strict";

  let currentUser = null;

  // ── API helper ──────────────────────────────────────────────────────────────
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign(
      { "Content-Type": "application/json" },
      WheelWiseAuth.authHeaders(),
      opts.headers || {}
    );
    return fetch(path, opts).then(function (r) {
      if (r.status === 403) { window.location.href = "/"; throw new Error("Forbidden"); }
      return r;
    });
  }

  // ── XSS helper ──────────────────────────────────────────────────────────────
  function esc(s) {
    const d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  // ── Panel navigation ────────────────────────────────────────────────────────
  const PANEL_TITLES = { dashboard: "Dashboard", users: "Users", listings: "Listings" };

  function activatePanel(name) {
    document.querySelectorAll(".panel").forEach(function (el) {
      el.classList.toggle("active", el.id === "panel-" + name);
    });
    document.querySelectorAll(".nav-item[data-panel]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-panel") === name);
    });
    const titleEl = document.getElementById("topbar-title");
    if (titleEl) titleEl.textContent = PANEL_TITLES[name] || name;
    closeSidebar();
  }

  // Wire all nav-item[data-panel] and panel-link buttons
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-panel]");
    if (btn) { activatePanel(btn.getAttribute("data-panel")); }
  });

  // ── Sidebar toggle (mobile) ─────────────────────────────────────────────────
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  const toggleBtn = document.getElementById("btn-sidebar-toggle");

  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("opacity-0", "pointer-events-none");
    overlay.classList.add("opacity-100");
  }
  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("opacity-0", "pointer-events-none");
    overlay.classList.remove("opacity-100");
  }
  if (toggleBtn) toggleBtn.addEventListener("click", openSidebar);
  if (overlay)   overlay.addEventListener("click", closeSidebar);

  // ── Theme toggle ────────────────────────────────────────────────────────────
  const themeBtn = document.getElementById("btn-theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const isDark = document.documentElement.classList.toggle("dark");
      try { localStorage.setItem("pakwheels_theme", isDark ? "dark" : "light"); } catch (e) {}
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    if (e.target.closest("#btn-logout")) {
      WheelWiseAuth.clearSession();
      window.location.href = "/";
    }
  });

  // ── Badge helpers ───────────────────────────────────────────────────────────
  function setBadge(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val > 0 ? val : "";
  }

  // ── Render helpers ──────────────────────────────────────────────────────────
  function roleBadge(role) {
    if (role === "admin")
      return '<span class="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">admin</span>';
    return '<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">user</span>';
  }

  function activeBadge(active) {
    if (active)
      return '<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>';
    return '<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></span>';
  }

  function sourceBadge(src) {
    const colors = {
      pakwheels: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      olx:       "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      wheelwise: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    };
    const cls = colors[src] || "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400";
    return '<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ' + cls + '">' + esc(src) + '</span>';
  }

  // ── Users table (full) ──────────────────────────────────────────────────────
  function renderUsers(data) {
    const tbody = document.getElementById("users-tbody");
    if (!tbody) return;
    const items = data.items || [];
    setBadge("sidebar-users-count", items.length);
    tbody.innerHTML = "";
    items.forEach(function (u) {
      const isSelf = currentUser && u.id === currentUser.id;
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-100 transition hover:bg-slate-50/60 dark:border-zinc-800 dark:hover:bg-zinc-800/40 last:border-0";
      tr.innerHTML =
        '<td class="px-5 py-3 text-xs text-slate-400 dark:text-zinc-500">' + u.id + '</td>' +
        '<td class="px-5 py-3 font-medium text-slate-800 dark:text-zinc-100">' + esc(u.email) + '</td>' +
        '<td class="px-5 py-3 text-slate-600 dark:text-zinc-300">@' + esc(u.username) + '</td>' +
        '<td class="px-5 py-3 text-slate-600 dark:text-zinc-300">' + esc(u.account_type || "—") + '</td>' +
        '<td class="px-5 py-3">' + roleBadge(u.role) + '</td>' +
        '<td class="px-5 py-3">' + activeBadge(u.is_active) + '</td>' +
        '<td class="px-5 py-3">' + (isSelf ? '<span class="text-xs text-slate-400">You</span>' :
          '<button type="button" class="rounded-lg px-3 py-1 text-xs font-medium transition ' +
          (u.is_active
            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/60') +
          '" data-toggle-active="' + u.id + '" data-active="' + (u.is_active ? "1" : "0") + '">' +
          (u.is_active ? "Deactivate" : "Activate") + '</button>') + '</td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-toggle-active]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-toggle-active");
        const active = btn.getAttribute("data-active") === "1";
        api("/api/admin/users/" + id, {
          method: "PATCH",
          body: JSON.stringify({ is_active: !active }),
        })
          .then(function (r) { return r.json(); })
          .then(function () { loadUsers(); });
      });
    });
  }

  // ── Dashboard users preview ─────────────────────────────────────────────────
  function renderDashUsers(items) {
    const tbody = document.getElementById("dash-users-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    items.slice(0, 5).forEach(function (u) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-100 last:border-0 dark:border-zinc-800";
      tr.innerHTML =
        '<td class="px-5 py-2.5">' +
        '<div class="flex items-center gap-2.5">' +
        '<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-[11px] font-bold text-white">' +
        esc((u.username || u.email || "?").charAt(0).toUpperCase()) + '</span>' +
        '<div><p class="text-xs font-medium text-slate-800 dark:text-zinc-100">' + esc(u.username || u.email) + '</p>' +
        '<p class="text-[10px] text-slate-400 dark:text-zinc-500">' + esc(u.email) + '</p></div></div></td>' +
        '<td class="px-5 py-2.5 text-xs text-slate-500 dark:text-zinc-400">' + esc(u.account_type || "—") + '</td>' +
        '<td class="px-5 py-2.5">' + roleBadge(u.role) + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Listings table (full) ───────────────────────────────────────────────────
  function renderListings(data) {
    const tbody = document.getElementById("listings-tbody");
    if (!tbody) return;
    const items = data.items || [];
    setBadge("sidebar-listings-count", items.length);
    tbody.innerHTML = "";
    items.forEach(function (l) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-100 transition hover:bg-slate-50/60 dark:border-zinc-800 dark:hover:bg-zinc-800/40 last:border-0";
      tr.innerHTML =
        '<td class="px-5 py-3 text-xs text-slate-400 dark:text-zinc-500">' + l.id + '</td>' +
        '<td class="px-5 py-3 max-w-xs truncate font-medium text-slate-800 dark:text-zinc-100" title="' + esc(l.title || "") + '">' + esc(l.title || "—") + '</td>' +
        '<td class="px-5 py-3">' + sourceBadge(l.source) + '</td>' +
        '<td class="px-5 py-3 text-slate-600 dark:text-zinc-300">' + (l.price != null ? "₨ " + l.price.toLocaleString() : "—") + '</td>' +
        '<td class="px-5 py-3 text-xs text-slate-400 dark:text-zinc-500">' + (l.user_id ? "#" + l.user_id : "—") + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Dashboard listings preview ──────────────────────────────────────────────
  function renderDashListings(items) {
    const tbody = document.getElementById("dash-listings-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    items.slice(0, 5).forEach(function (l) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-100 last:border-0 dark:border-zinc-800";
      tr.innerHTML =
        '<td class="px-5 py-2.5 max-w-[200px] truncate text-xs font-medium text-slate-800 dark:text-zinc-100" title="' + esc(l.title || "") + '">' + esc(l.title || "—") + '</td>' +
        '<td class="px-5 py-2.5">' + sourceBadge(l.source) + '</td>' +
        '<td class="px-5 py-2.5 text-xs text-slate-500 dark:text-zinc-400">' + (l.price != null ? "₨ " + l.price.toLocaleString() : "—") + '</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Load functions ───────────────────────────────────────────────────────────
  function loadStats() {
    return api("/api/admin/stats")
      .then(function (r) { return r.json(); })
      .then(function (s) {
        document.getElementById("stat-users").textContent    = s.users;
        document.getElementById("stat-listings").textContent = s.listings;
        document.getElementById("stat-wheelwise").textContent = s.wheelwise_listings;
      });
  }

  function loadUsers() {
    return api("/api/admin/users?limit=100")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderUsers(data);
        renderDashUsers(data.items || []);
      });
  }

  function loadListings() {
    return api("/api/admin/listings?limit=50")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderListings(data);
        renderDashListings(data.items || []);
      });
  }

  // ── Refresh buttons ──────────────────────────────────────────────────────────
  const refreshUsers    = document.getElementById("btn-refresh-users");
  const refreshListings = document.getElementById("btn-refresh-listings");
  if (refreshUsers)    refreshUsers.addEventListener("click", loadUsers);
  if (refreshListings) refreshListings.addEventListener("click", loadListings);

  // ── Boot ─────────────────────────────────────────────────────────────────────
  WheelWiseAuth.requireAdmin().then(function (user) {
    if (!user) return;
    currentUser = user;

    const greet = document.getElementById("admin-greeting");
    if (greet) greet.textContent = "Signed in as " + user.email;

    const avatar = document.getElementById("sidebar-avatar");
    const uname  = document.getElementById("sidebar-username");
    if (avatar) avatar.textContent = (user.username || user.email || "A").charAt(0).toUpperCase();
    if (uname)  uname.textContent  = user.username || user.email;

    loadStats();
    loadUsers();
    loadListings();
  });
})();
