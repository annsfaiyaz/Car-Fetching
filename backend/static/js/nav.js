(function () {
  "use strict";

  const NAV_LINKS = [
    { id: "home", href: "/", label: "Home" },
    { id: "news", href: "/news", label: "News" },
    { id: "about", href: "/about", label: "How it works" },
  ];

  const SERVICES_ITEMS = [
    { id: "sell", href: "/sell", label: "Sell your car" },
    { id: "rent", href: "/rent", label: "Rent a car" },
  ];

  const EXTRA_LINKS = [];

  const SETTINGS_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

  function linkClass(active) {
    return active ? "ww-pill-active" : "ww-pill-link";
  }

  function isServicesActive(activePage) {
    return SERVICES_ITEMS.some(function (s) {
      return s.id === activePage;
    });
  }

  function renderServicesDropdown(activePage, mobile) {
    const servicesActive = isServicesActive(activePage);
    if (mobile) {
      let html =
        '<p class="px-4 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Services</p>';
      SERVICES_ITEMS.forEach(function (item) {
        const active = item.id === activePage;
        html +=
          '<a href="' +
          item.href +
          '" class="block rounded-xl px-4 py-3 text-sm font-medium ' +
          (active
            ? "bg-violet-500/15 text-violet-800 dark:text-violet-200"
            : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800") +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          item.label +
          "</a>";
      });
      return html;
    }

    const menuItems = SERVICES_ITEMS.map(function (item) {
      const active = item.id === activePage;
      return (
        '<a href="' +
        item.href +
        '" role="menuitem" class="block px-4 py-2.5 text-sm ' +
        (active
          ? "bg-violet-50 font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"
          : "text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800") +
        '"' +
        (active ? ' aria-current="page"' : "") +
        ">" +
        item.label +
        "</a>"
      );
    }).join("");

    return (
      '<div class="relative" data-nav-services>' +
      '<button type="button" class="' +
      linkClass(servicesActive) +
      ' inline-flex items-center gap-1" aria-haspopup="true" aria-expanded="false" data-services-toggle>' +
      "Services" +
      '<svg class="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>' +
      "</button>" +
      '<div class="absolute left-0 top-full z-50 mt-1 hidden min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900" role="menu" data-services-menu>' +
      menuItems +
      "</div></div>"
    );
  }

  function renderNavLinks(activePage, mobile) {
    const loggedIn = window.WheelWiseAuth && WheelWiseAuth.getAccessToken();
    let html = "";

    NAV_LINKS.forEach(function (l) {
      const active = l.id === activePage;
      if (mobile) {
        html +=
          '<a href="' +
          l.href +
          '" class="block rounded-xl px-4 py-3 text-sm font-medium ' +
          (active
            ? "bg-violet-500/15 text-violet-800 dark:text-violet-200"
            : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800") +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          l.label +
          "</a>";
      } else {
        html +=
          '<a href="' +
          l.href +
          '" class="' +
          linkClass(active) +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          l.label +
          "</a>";
      }
    });

    html += renderServicesDropdown(activePage, mobile);

    EXTRA_LINKS.forEach(function (l) {
      if (l.auth && !loggedIn) return;
      const active = l.id === activePage;
      if (mobile) {
        html +=
          '<a href="' +
          l.href +
          '" class="block rounded-xl px-4 py-3 text-sm font-medium ' +
          (active
            ? "bg-violet-500/15 text-violet-800 dark:text-violet-200"
            : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800") +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          l.label +
          "</a>";
      } else {
        html +=
          '<a href="' +
          l.href +
          '" class="' +
          linkClass(active) +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          l.label +
          "</a>";
      }
    });

    return html;
  }

  function renderNavbar(activePage) {
    return (
      '<header class="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/90">' +
      '<div class="mx-auto max-w-7xl px-4 lg:px-6">' +
      '<div class="flex h-[4.25rem] items-center justify-between gap-3">' +
      '<a href="/" class="group flex shrink-0 items-center gap-2.5">' +
      '<span class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-violet-600 to-violet-800 shadow-lg shadow-violet-500/30 ring-2 ring-white/20 transition group-hover:scale-105 dark:ring-violet-400/20">' +
      '<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/><circle cx="8" cy="17" r="1.5" fill="currentColor"/><circle cx="16" cy="17" r="1.5" fill="currentColor"/></svg>' +
      '<span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-900"></span>' +
      "</span>" +
      '<span class="hidden leading-tight sm:block">' +
      '<span class="block text-sm font-bold tracking-tight text-slate-900 dark:text-white">WheelWise <span class="text-violet-600 dark:text-violet-400">PK</span></span>' +
      '<span class="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">AI car marketplace</span>' +
      "</span></a>" +
      '<nav class="hidden items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-inner md:flex dark:border-zinc-700/80 dark:bg-zinc-800/60" aria-label="Primary">' +
      renderNavLinks(activePage, false) +
      "</nav>" +
      '<div class="flex items-center gap-1.5 sm:gap-2">' +
      '<span id="nav-auth" class="flex items-center gap-1"></span>' +
      '<span id="nav-settings-btn"></span>' +
      '<button type="button" id="btn-theme-toggle" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-violet-400 dark:hover:bg-zinc-700" aria-label="Toggle color theme">' +
      '<svg class="h-5 w-5 dark:hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>' +
      '<svg class="hidden h-5 w-5 dark:inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>' +
      "</button>" +
      '<button type="button" id="btn-mobile-menu" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 md:hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" aria-expanded="false" aria-controls="mobile-nav-panel">' +
      '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      "</button></div></div>" +
      '<div id="mobile-nav-panel" class="hidden border-t border-slate-200/80 pb-4 pt-2 md:hidden dark:border-zinc-800">' +
      '<nav class="flex flex-col gap-1" aria-label="Mobile">' +
      renderNavLinks(activePage, true) +
      "</nav></div></div></header>"
    );
  }

  function initServicesDropdown() {
    document.querySelectorAll("[data-nav-services]").forEach(function (wrap) {
      const btn = wrap.querySelector("[data-services-toggle]");
      const menu = wrap.querySelector("[data-services-menu]");
      if (!btn || !menu) return;

      function close() {
        menu.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
      }

      function open() {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
      }

      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (menu.classList.contains("hidden")) open();
        else close();
      });

      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target)) close();
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    });
  }

  function initMobileMenu() {
    const btn = document.getElementById("btn-mobile-menu");
    const panel = document.getElementById("mobile-nav-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      const isHidden = panel.classList.toggle("hidden");
      btn.setAttribute("aria-expanded", isHidden ? "false" : "true");
    });
  }

  function mountNavbar() {
    const mount = document.getElementById("site-nav");
    if (!mount) return;
    const activePage = mount.getAttribute("data-page") || "";
    mount.outerHTML = renderNavbar(activePage);
    initMobileMenu();
    initServicesDropdown();
    if (window.WheelWiseTheme) WheelWiseTheme.init();
    if (window.WheelWiseAuth) WheelWiseAuth.updateNavAuth();
  }

  document.addEventListener("DOMContentLoaded", mountNavbar);

  window.WheelWiseNav = { mountNavbar, renderNavLinks };
})();
