import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const NAV_ITEMS = [
  { panel: "dashboard", label: "Dashboard", section: "Menu" },
  { panel: "users", label: "Users", section: "Menu" },
  { panel: "listings", label: "Listings", section: "Menu" },
  { panel: "showrooms", label: "Showrooms", section: "Menu" },
  { panel: "rent-listings", label: "Rental Listings", section: "Rentals" },
  { panel: "rent-bookings", label: "Bookings", section: "Rentals" },
];

export default function Admin() {
  const { token, authHeaders, user, fetchMe, clearSession } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentListings, setRecentListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [rentListings, setRentListings] = useState([]);
  const [rentBookings, setRentBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState("");
  const [showrooms, setShowrooms] = useState([]);

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u || u.role !== "admin") navigate("/");
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    loadDashboard();
  }, [token]);

  async function loadDashboard() {
    try {
      const r = await fetch("/api/admin/stats", { headers: authHeaders() });
      const data = await r.json();
      setStats(data);
      setRecentUsers(data.recent_users || []);
      setRecentListings(data.recent_listings || []);
    } catch {}
  }

  async function loadUsers() {
    const r = await fetch("/api/admin/users", { headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setUsers(d.items || []); }
  }

  async function loadListings() {
    const r = await fetch("/api/admin/listings", { headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setListings(d.items || []); }
  }

  async function loadRentListings() {
    const r = await fetch("/api/admin/rent/listings", { headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setRentListings(d.items || []); }
  }

  async function loadShowrooms() {
    const r = await fetch("/api/admin/showrooms", { headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setShowrooms(d.items || []); }
  }

  async function toggleVerify(id) {
    const r = await fetch(`/api/admin/showrooms/${id}/verify`, { method: "PUT", headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setShowrooms((prev) => prev.map((s) => s.id === id ? { ...s, is_verified: d.is_verified } : s)); }
  }

  async function deleteShowroom(id) {
    if (!window.confirm("Delete this showroom? This cannot be undone.")) return;
    const r = await fetch(`/api/admin/showrooms/${id}`, { method: "DELETE", headers: authHeaders() });
    if (r.ok) setShowrooms((prev) => prev.filter((s) => s.id !== id));
  }

  async function loadRentBookings(filter) {
    const f = filter !== undefined ? filter : bookingFilter;
    const q = f ? "?status=" + f : "";
    const r = await fetch("/api/admin/rent/bookings" + q, { headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setRentBookings(d.items || []); }
  }

  function switchPanel(p) {
    setActivePanel(p);
    setSidebarOpen(false);
    if (p === "users" && !users.length) loadUsers();
    if (p === "listings" && !listings.length) loadListings();
    if (p === "rent-listings" && !rentListings.length) loadRentListings();
    if (p === "rent-bookings") loadRentBookings();
    if (p === "showrooms" && !showrooms.length) loadShowrooms();
  }

  function logout() { clearSession(); navigate("/"); }

  function userInitial(u) {
    if (!u) return "A";
    return String(u.username || u.email || "A").charAt(0).toUpperCase();
  }

  const statCards = [
    { label: "Total Users", key: "users" },
    { label: "Total Listings", key: "listings" },
    { label: "WheelWise Ads", key: "wheelwise_ads" },
    { label: "Showrooms", key: "showrooms" },
    { label: "Rental Cars", key: "rent_listings" },
    { label: "Bookings", key: "rent_bookings" },
  ];

  const thClass = "px-5 py-2.5 text-xs font-semibold text-slate-500 dark:text-zinc-400";
  const tdClass = "px-5 py-3 text-sm text-slate-700 dark:text-zinc-300";

  return (
    <div className="h-full bg-slate-100 text-slate-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5 dark:border-zinc-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-violet-600 to-violet-800 shadow-lg shadow-violet-500/25">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/><circle cx="8" cy="17" r="1.5" fill="currentColor"/><circle cx="16" cy="17" r="1.5" fill="currentColor"/></svg>
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">WheelWise <span className="text-violet-600 dark:text-violet-400">PK</span></p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {["Menu", "Rentals"].map((section) => (
            <div key={section}>
              <p className="mb-2 mt-3 first:mt-0 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">{section}</p>
              {NAV_ITEMS.filter((n) => n.section === section).map((n) => (
                <button
                  key={n.panel}
                  onClick={() => switchPanel(n.panel)}
                  className={`nav-item w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-200 ${activePanel === n.panel ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : "hover:bg-slate-50 dark:hover:bg-zinc-800"}`}
                >
                  {n.label}
                </button>
              ))}
              {section === "Menu" && <div className="my-3 border-t border-slate-200 dark:border-zinc-800" />}
            </div>
          ))}
          <div className="my-3 border-t border-slate-200 dark:border-zinc-800" />
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">App</p>
          <Link to="/" className="nav-item w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800">Back to site</Link>
          <Link to="/settings" className="nav-item w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800">Settings</Link>
        </nav>

        {/* User + logout */}
        <div className="shrink-0 border-t border-slate-200 px-3 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-zinc-800">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-white">{userInitial(user)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-zinc-100">{user?.username || user?.email || "—"}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Administrator</p>
            </div>
            <button onClick={logout} title="Logout" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-full flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 lg:hidden">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white capitalize">{activePanel.replace("-", " ")}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:text-violet-400 dark:hover:bg-zinc-800">
              {dark ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">

          {/* Dashboard */}
          {activePanel === "dashboard" && (
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Overview</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">Welcome, {user?.username || "admin"}.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {statCards.map((s) => (
                  <div key={s.key} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{s.label}</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{stats[s.key] ?? "—"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                {/* Recent users */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold">Recent Users</h3>
                    <button onClick={() => switchPanel("users")} className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400">View all</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-zinc-800/60"><tr><th className={thClass}>User</th><th className={thClass}>Type</th><th className={thClass}>Role</th></tr></thead>
                      <tbody>
                        {recentUsers.map((u) => (
                          <tr key={u.id} className="border-t border-slate-100 dark:border-zinc-800">
                            <td className={tdClass}>{u.username || u.email}</td>
                            <td className={tdClass}>{u.account_type || "seller"}</td>
                            <td className={tdClass}>{u.role || "user"}</td>
                          </tr>
                        ))}
                        {recentUsers.length === 0 && <tr><td colSpan={3} className={tdClass}>No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Recent listings */}
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold">Recent Listings</h3>
                    <button onClick={() => switchPanel("listings")} className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400">View all</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-zinc-800/60"><tr><th className={thClass}>Title</th><th className={thClass}>Source</th><th className={thClass}>Price</th></tr></thead>
                      <tbody>
                        {recentListings.map((l) => (
                          <tr key={l.id} className="border-t border-slate-100 dark:border-zinc-800">
                            <td className={tdClass + " max-w-[10rem] truncate"}>{l.title}</td>
                            <td className={tdClass}>{l.source || "—"}</td>
                            <td className={tdClass}>{l.price ? "PKR " + Number(l.price).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                        {recentListings.length === 0 && <tr><td colSpan={3} className={tdClass}>No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Users */}
          {activePanel === "users" && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div><h2 className="text-xl font-bold">Users</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">Manage registered accounts</p></div>
                <button onClick={loadUsers} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Refresh</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <tr>{["ID","Email","Username","Type","Role","Active","Actions"].map(h=><th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100 dark:border-zinc-800">
                        <td className={tdClass}>{u.id}</td>
                        <td className={tdClass}>{u.email}</td>
                        <td className={tdClass}>{u.username}</td>
                        <td className={tdClass}>{u.account_type || "seller"}</td>
                        <td className={tdClass}>{u.role}</td>
                        <td className={tdClass}>{u.is_active ? "Yes" : "No"}</td>
                        <td className={tdClass}>—</td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={7} className={tdClass}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Listings */}
          {activePanel === "listings" && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div><h2 className="text-xl font-bold">Listings</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">Recently scraped and posted cars</p></div>
                <button onClick={loadListings} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Refresh</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <tr>{["ID","Title","Source","Price (PKR)","User"].map(h=><th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id} className="border-t border-slate-100 dark:border-zinc-800">
                        <td className={tdClass}>{l.id}</td>
                        <td className={tdClass + " max-w-[14rem] truncate"}>{l.title}</td>
                        <td className={tdClass}>{l.source}</td>
                        <td className={tdClass}>{l.price ? Number(l.price).toLocaleString() : "—"}</td>
                        <td className={tdClass}>{l.user_id || "—"}</td>
                      </tr>
                    ))}
                    {listings.length === 0 && <tr><td colSpan={5} className={tdClass}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Showrooms */}
          {activePanel === "showrooms" && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Showrooms</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">Manage showroom profiles and verification</p>
                </div>
                <button onClick={loadShowrooms} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Refresh</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <tr>{["ID","Business Name","City","Owner","Phone","Verified","Active","Created","Actions"].map(h=><th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {showrooms.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100 dark:border-zinc-800">
                        <td className={tdClass}>{s.id}</td>
                        <td className={tdClass + " font-medium"}>{s.business_name}</td>
                        <td className={tdClass}>{s.city}</td>
                        <td className={tdClass}>
                          <div className="flex flex-col">
                            <span>{s.owner_username || "—"}</span>
                            <span className="text-xs text-slate-400 dark:text-zinc-500">{s.owner_email}</span>
                          </div>
                        </td>
                        <td className={tdClass}>{s.contact_phone || "—"}</td>
                        <td className={tdClass}>
                          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${s.is_verified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                            {s.is_verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className={tdClass}>{s.is_active ? "Yes" : "No"}</td>
                        <td className={tdClass}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleVerify(s.id)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${s.is_verified ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-700 dark:text-zinc-300" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"}`}>
                              {s.is_verified ? "Unverify" : "Verify"}
                            </button>
                            <a href={`/showrooms/${s.id}`} target="_blank" rel="noopener noreferrer"
                              className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300">
                              View
                            </a>
                            <button onClick={() => deleteShowroom(s.id)}
                              className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {showrooms.length === 0 && <tr><td colSpan={9} className={tdClass}>No showrooms found</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Rent listings */}
          {activePanel === "rent-listings" && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div><h2 className="text-xl font-bold">Rental Listings</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">All cars listed by rental partners</p></div>
                <button onClick={loadRentListings} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Refresh</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <tr>{["ID","Title","Car","City","Price/day","Driver","Status","Partner","Phone"].map(h=><th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rentListings.map((l) => (
                      <tr key={l.id} className="border-t border-slate-100 dark:border-zinc-800">
                        <td className="px-4 py-3 text-sm">{l.id}</td>
                        <td className="px-4 py-3 text-sm max-w-[10rem] truncate">{l.title}</td>
                        <td className="px-4 py-3 text-sm">{l.make} {l.model}</td>
                        <td className="px-4 py-3 text-sm">{l.city}</td>
                        <td className="px-4 py-3 text-sm">{l.price_per_day ? "PKR " + Number(l.price_per_day).toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-sm">{l.driver_included ? "Yes" : "No"}</td>
                        <td className="px-4 py-3 text-sm">{l.status || "active"}</td>
                        <td className="px-4 py-3 text-sm">{l.owner_id || "—"}</td>
                        <td className="px-4 py-3 text-sm">{l.contact_phone || "—"}</td>
                      </tr>
                    ))}
                    {rentListings.length === 0 && <tr><td colSpan={9} className={tdClass}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Rent bookings */}
          {activePanel === "rent-bookings" && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <div><h2 className="text-xl font-bold">Rental Bookings</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">All booking requests from clients</p></div>
                <div className="flex items-center gap-2">
                  <select value={bookingFilter} onChange={(e) => { const v = e.target.value; setBookingFilter(v); loadRentBookings(v); }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button onClick={loadRentBookings} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Refresh</button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                    <tr>{["ID","Listing","City","Partner","Client Name","Client Phone","Pickup","Return","Status","Booked At"].map(h=><th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rentBookings.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100 dark:border-zinc-800">
                        <td className="px-4 py-3 text-sm">{b.id}</td>
                        <td className="px-4 py-3 text-sm">{b.listing_id}</td>
                        <td className="px-4 py-3 text-sm">{b.city || "—"}</td>
                        <td className="px-4 py-3 text-sm">{b.partner_id || "—"}</td>
                        <td className="px-4 py-3 text-sm">{b.renter_name}</td>
                        <td className="px-4 py-3 text-sm">{b.renter_phone}</td>
                        <td className="px-4 py-3 text-sm">{b.pickup_date}</td>
                        <td className="px-4 py-3 text-sm">{b.return_date}</td>
                        <td className="px-4 py-3 text-sm">{b.status}</td>
                        <td className="px-4 py-3 text-sm">{b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                    {rentBookings.length === 0 && <tr><td colSpan={10} className={tdClass}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
