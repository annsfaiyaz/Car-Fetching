import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { hasType } from "../utils/format";

const NAV_LINKS = [
  { id: "home", href: "/", label: "Home" },
  { id: "sell", href: "/sell", label: "Sell Your Car" },
  { id: "rent", href: "/rent", label: "Rent a Car" },
  { id: "showrooms", href: "/showrooms", label: "Showrooms" },
  { id: "about", href: "/about", label: "About" },
];

function CarIcon() {
  return (
    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
      <circle cx="8" cy="17" r="1.5" fill="currentColor"/>
      <circle cx="16" cy="17" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
}

function MyAdsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
    </svg>
  );
}

function RentalIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
      <circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export default function Navbar() {
  const { user, token, clearSession } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activePage = NAV_LINKS.find((l) => {
    if (l.href === "/") return location.pathname === "/";
    return location.pathname.startsWith(l.href);
  })?.id;

  const isRental   = hasType(user, "rental_partner");
  const isShowroom = hasType(user, "showroom");
  const isSeller   = hasType(user, "seller");

  function userInitial(u) {
    const name = (u && (u.username || u.full_name || u.email)) || "?";
    return String(name).charAt(0).toUpperCase();
  }

  function logout() {
    clearSession();
    navigate("/");
  }

  const isAuthPage = ["/login", "/register"].includes(location.pathname);
  const isGuestLoginPage = location.pathname === "/sell" || location.pathname === "/post-ad";

  function loginHref() {
    if (isGuestLoginPage) return "/login?next=" + encodeURIComponent(location.pathname + location.search);
    return "/login";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/90">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex h-[4.25rem] items-center justify-between gap-3">

          {/* Logo */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-violet-600 to-violet-800 shadow-lg shadow-violet-500/30 ring-2 ring-white/20 transition group-hover:scale-105 dark:ring-violet-400/20">
              <CarIcon />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-900"></span>
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                WheelWise <span className="text-violet-600 dark:text-violet-400">PK</span>
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">AI car marketplace</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-1 shadow-inner md:flex dark:border-zinc-700/80 dark:bg-zinc-800/60" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.id}
                to={l.href}
                className={activePage === l.id ? "ww-pill-active" : "ww-pill-link"}
                aria-current={activePage === l.id ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Auth area */}
            <span className="flex items-center gap-1">
              {user && token ? (
                <div className="hidden items-center gap-1 sm:flex">
                  {/* Dashboard icons — one per account type */}
                  {isShowroom && (
                    <Link to="/showroom-dashboard" title="My Showroom"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-violet-950 dark:hover:text-violet-300">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"/>
                      </svg>
                    </Link>
                  )}
                  {isRental && (
                    <Link to="/rent-dashboard" title="My Rentals"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-violet-950 dark:hover:text-violet-300">
                      <RentalIcon />
                    </Link>
                  )}
                  {(isSeller || (!isShowroom && !isRental)) && (
                    <Link to="/my-ads" title="My Ads"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-violet-950 dark:hover:text-violet-300">
                      <MyAdsIcon />
                    </Link>
                  )}
                  {/* User chip */}
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 py-1 pl-1 pr-2 dark:border-zinc-700 dark:bg-zinc-800/80">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">
                      {userInitial(user)}
                    </span>
                    <span className="max-w-[5.5rem] truncate text-xs font-semibold text-slate-700 dark:text-zinc-200 lg:max-w-[7rem]">
                      {user.username || user.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  >
                    Logout
                  </button>
                </div>
              ) : !isAuthPage ? (
                <Link
                  to={loginHref()}
                  className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:px-4 sm:text-sm"
                >
                  Login
                </Link>
              ) : null}
            </span>

            {/* Admin settings icon */}
            {user?.role === "admin" && token && (
              <Link
                to="/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                aria-label="Settings"
              >
                <SettingsIcon />
              </Link>
            )}

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-violet-400 dark:hover:bg-zinc-700"
              aria-label="Toggle color theme"
            >
              {dark ? (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
                </svg>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 md:hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              aria-expanded={mobileOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-slate-200/80 pb-4 pt-2 md:hidden dark:border-zinc-800">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.id}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                    activePage === l.id
                      ? "bg-violet-500/15 text-violet-800 dark:text-violet-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  aria-current={activePage === l.id ? "page" : undefined}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
