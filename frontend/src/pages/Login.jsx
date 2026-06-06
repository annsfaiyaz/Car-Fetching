import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data.detail;
        setError(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg || "Login failed" : "Login failed");
        return;
      }
      setSession({ access_token: data.access_token, user: data.user });
      const next = params.get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        navigate(next);
        return;
      }
      const user = data.user;
      if (user?.role === "admin") navigate("/admin");
      else if (user?.account_type === "rental_partner") navigate("/rent-dashboard");
      else navigate("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-12">
      <div className="ww-page-hero w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Welcome back</p>
          <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">Publish and manage your car ads on WheelWise PK.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="email">Email</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="password">Password</label>
              <input
                id="password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 py-3 text-sm font-semibold text-white shadow-md hover:from-violet-400 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-zinc-700">
            <p className="text-center text-sm text-slate-600 dark:text-zinc-400">Don&apos;t have an account?</p>
            <Link
              to="/register"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-violet-300 bg-violet-500/5 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-500/10 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-500/15"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
