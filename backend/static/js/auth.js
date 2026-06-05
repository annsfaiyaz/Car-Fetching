/** Shared auth: token storage, /api/auth/me, nav helpers. */
(function () {
  "use strict";

  const LS_ACCESS = "wheelwise_access_token";
  const LS_USER = "wheelwise_user";

  function getAccessToken() {
    try {
      return localStorage.getItem(LS_ACCESS) || localStorage.getItem("ww_token") || "";
    } catch (e) {
      return "";
    }
  }

  function setSession(data) {
    try {
      if (data.access_token) {
        localStorage.setItem(LS_ACCESS, data.access_token);
        localStorage.removeItem("ww_token");
      }
      if (data.user) localStorage.setItem(LS_USER, JSON.stringify(data.user));
    } catch (e) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem("ww_token");
      localStorage.removeItem(LS_USER);
    } catch (e) {}
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(LS_USER);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function authHeaders() {
    const t = getAccessToken();
    return t ? { Authorization: "Bearer " + t } : {};
  }

  async function fetchMe() {
    const t = getAccessToken();
    if (!t) return null;
    const r = await fetch("/api/auth/me", { headers: authHeaders() });
    if (!r.ok) {
      clearSession();
      return null;
    }
    const user = await r.json();
    try {
      localStorage.setItem(LS_USER, JSON.stringify(user));
    } catch (e) {}
    return user;
  }

  function requireAuth(redirectTo) {
    if (!getAccessToken()) {
      const next = encodeURIComponent(redirectTo || window.location.pathname + window.location.search);
      window.location.href = "/login?next=" + next;
      return false;
    }
    return true;
  }

  function userInitial(user) {
    const name = (user && (user.username || user.full_name || user.email)) || "?";
    return String(name).charAt(0).toUpperCase();
  }

  function isGuestLoginNavPage() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path === "/sell") return true;
    if (path === "/post-ad" && !new URLSearchParams(window.location.search).get("edit")) return true;
    return false;
  }

  function isAuthFormPage() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/login" || path === "/register";
  }

  function loginHref() {
    if (isGuestLoginNavPage()) {
      return "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search);
    }
    return "/login";
  }

  const SETTINGS_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

  function updateNavAuth() {
    const el = document.getElementById("nav-auth");
    if (!el) return;
    const user = getUser();

    // Inject settings button for admins only
    const settingsSlot = document.getElementById("nav-settings-btn");
    if (settingsSlot) {
      if (user && getAccessToken() && user.role === "admin") {
        settingsSlot.innerHTML =
          '<a href="/settings" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700" aria-label="Settings">' +
          SETTINGS_SVG + "</a>";
      } else {
        settingsSlot.innerHTML = "";
      }
    }

    if (user && getAccessToken()) {
      const name = user.username || user.email || "Account";
      const isRental = user.account_type === "rental_partner";
      const dashHref  = isRental ? "/rent-dashboard" : "/my-ads";
      const dashTitle = isRental ? "My Rentals" : "My ads";
      const dashIcon  = isRental
        ? '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/><circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none"/></svg>'
        : '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>';
      el.innerHTML =
        '<div class="hidden items-center gap-1 sm:flex">' +
        '<a href="' + dashHref + '" title="' + dashTitle + '" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-violet-950 dark:hover:text-violet-300">' +
        dashIcon + "</a>" +
        '<div class="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 py-1 pl-1 pr-2 dark:border-zinc-700 dark:bg-zinc-800/80">' +
        '<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">' +
        userInitial(user) +
        "</span>" +
        '<span class="max-w-[5.5rem] truncate text-xs font-semibold text-slate-700 dark:text-zinc-200 lg:max-w-[7rem]">' +
        name +
        "</span></div>" +
        '<button type="button" id="btn-logout" class="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-200">Logout</button></div>' +
        '<a href="' + dashHref + '" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 sm:hidden dark:border-zinc-700 dark:bg-zinc-800" aria-label="' + dashTitle + '">' +
        dashIcon + "</a>";
      const btn = document.getElementById("btn-logout");
      if (btn) {
        btn.addEventListener("click", function () {
          clearSession();
          window.location.href = "/";
        });
      }
    } else if (isAuthFormPage()) {
      el.innerHTML = "";
    } else if (isGuestLoginNavPage()) {
      el.innerHTML =
        '<a href="' +
        loginHref() +
        '" class="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:px-4 sm:text-sm">Login</a>';
    } else {
      el.innerHTML =
        '<a href="/login" class="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:px-4 sm:text-sm">Login</a>';
    }
  }

  function redirectAfterLogin(user) {
    if (user.role === "admin") {
      window.location.href = "/admin";
      return;
    }
    if (user.account_type === "rental_partner") {
      window.location.href = "/rent-dashboard";
      return;
    }
    window.location.href = "/";
  }

  async function requireAdmin() {
    const user = await fetchMe();
    if (!user) {
      window.location.href = "/login?next=" + encodeURIComponent(location.pathname);
      return null;
    }
    if (user.role !== "admin") {
      window.location.href = "/";
      return null;
    }
    return user;
  }

  window.WheelWiseAuth = {
    getAccessToken: getAccessToken,
    setSession: setSession,
    clearSession: clearSession,
    getUser: getUser,
    authHeaders: authHeaders,
    fetchMe: fetchMe,
    requireAuth: requireAuth,
    updateNavAuth: updateNavAuth,
    redirectAfterLogin: redirectAfterLogin,
    requireAdmin: requireAdmin,
  };
  window.WWAuth = window.WheelWiseAuth;
})();
