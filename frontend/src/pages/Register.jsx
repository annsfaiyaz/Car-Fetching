import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AnimatedTextCycle from "../components/AnimatedTextCycle";

const ACCOUNT_TYPES = [
  {
    value: "buyer",
    label: "Buy a Car",
    sub: "Search 50,000+ listings across PakWheels & OLX.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    ),
  },
  {
    value: "seller",
    label: "Sell Your Car",
    sub: "Post AI-powered listings and reach thousands of buyers.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
      </svg>
    ),
  },
  {
    value: "rental_partner",
    label: "Rent a Car",
    sub: "List your fleet and earn from daily rental bookings.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
        <circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    value: "showroom",
    label: "Add Your Showroom",
    sub: "Showcase your full inventory with a verified dealer profile.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"/>
      </svg>
    ),
  },
];

function redirectAfterRegister(user, next, navigate) {
  if (next && next.startsWith("/") && !next.startsWith("//")) { navigate(next); return; }
  if (user?.role === "admin") { navigate("/admin"); return; }
  const types = (user?.account_type || "").split(",").map((t) => t.trim());
  if (types.includes("showroom")) { navigate("/showroom-setup"); return; }
  if (types.includes("rental_partner")) { navigate("/rent-dashboard"); return; }
  if (types.includes("seller")) { navigate("/sell"); return; }
  navigate("/");
}

export default function Register() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const defaultType = ["buyer", "seller", "rental_partner", "showroom"].includes(params.get("type"))
    ? params.get("type")
    : "buyer";

  const [selectedTypes, setSelectedTypes] = useState([defaultType]);

  function toggleType(val) {
    setSelectedTypes((prev) =>
      prev.includes(val) ? (prev.length > 1 ? prev.filter((t) => t !== val) : prev) : [...prev, val]
    );
  }
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, full_name: fullName || null, account_type: selectedTypes.join(",") }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data.detail;
        setError(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg || "Registration failed" : "Registration failed");
        return;
      }
      setSession({ access_token: data.access_token, user: data.user });
      redirectAfterRegister(data.user, params.get("next"), navigate);
    } finally {
      setLoading(false);
    }
  }

  const selected = ACCOUNT_TYPES.filter((t) => selectedTypes.includes(t.value));

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-10 text-center sm:py-12">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          Join WheelWise PK
        </p>
        <h1 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          I want to{" "}
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={["buy a car", "sell my car", "rent a car", "add my showroom"]}
              interval={2500}
              className="text-3xl sm:text-4xl tracking-tight"
            />
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          Choose your purpose below — your account is tailored to what you need.
        </p>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-16 lg:px-6">
        {/* Service type cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ACCOUNT_TYPES.map((t) => {
            const active = selectedTypes.includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleType(t.value)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition-all ${
                  active
                    ? "border-violet-500 bg-violet-500/10 shadow-sm dark:border-violet-400/70 dark:bg-violet-500/15"
                    : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-violet-500/40"
                }`}
              >
                {active && (
                  <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-white">
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  </span>
                )}
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                  {t.icon}
                </span>
                <span className={`text-xs font-semibold leading-tight ${active ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-zinc-200"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected types description */}
        {selected.length > 0 && (
          <div className="mb-5 space-y-1.5 rounded-xl border border-violet-200/60 bg-violet-500/5 px-4 py-3 dark:border-violet-800/30 dark:bg-violet-500/10">
            {selected.map((t) => (
              <p key={t.value} className="text-sm text-slate-700 dark:text-zinc-300">
                <span className="font-semibold text-violet-700 dark:text-violet-300">{t.label}:</span>{" "}{t.sub}
              </p>
            ))}
            {selected.length > 1 && (
              <p className="mt-1 text-xs text-violet-600 dark:text-violet-400 font-medium">✓ Multi-service account — access all selected dashboards after login.</p>
            )}
          </div>
        )}

        {/* Form */}
        <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <h2 className="mb-5 text-base font-bold text-slate-900 dark:text-white">Complete your profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="username">Username</label>
              <input id="username" type="text" required pattern="[a-z0-9_]{3,32}" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Lowercase letters, numbers, underscore · 3–32 chars</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="full_name">
                Full name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="full_name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="password">Password</label>
              <input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 py-3 text-sm font-semibold text-white shadow-md hover:from-violet-400 active:scale-[0.99] disabled:opacity-60">
              {loading ? "Creating account…" : `Create account`}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
