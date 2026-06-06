import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [accountType, setAccountType] = useState(params.get("type") === "rental_partner" ? "rental_partner" : "seller");
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
        body: JSON.stringify({
          email,
          username,
          password,
          full_name: fullName || null,
          account_type: accountType,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = data.detail;
        setError(typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg || "Registration failed" : "Registration failed");
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

  const radioClass = "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 p-3 transition has-[:checked]:border-violet-500 has-[:checked]:bg-violet-500/5 dark:border-zinc-700 dark:has-[:checked]:border-violet-500/60 dark:has-[:checked]:bg-violet-950/30";

  return (
    <main className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">Get started</p>
          <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">Create account</h1>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-zinc-400">Choose your account type, then complete your profile.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-zinc-300">Account type</legend>
              <label className={radioClass}>
                <input type="radio" name="account_type" value="seller" checked={accountType === "seller"} onChange={() => setAccountType("seller")} className="mt-1 text-violet-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">Sell your car</span>
                  <span className="mt-0.5 block text-xs text-slate-600 dark:text-zinc-400">List vehicles for sale with AI-powered ads.</span>
                </span>
              </label>
              <label className={radioClass}>
                <input type="radio" name="account_type" value="rental_partner" checked={accountType === "rental_partner"} onChange={() => setAccountType("rental_partner")} className="mt-1 text-violet-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">Rent your car</span>
                  <span className="mt-0.5 block text-xs text-slate-600 dark:text-zinc-400">Join as a rental partner on the rent-a-car vertical.</span>
                </span>
              </label>
            </fieldset>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="username">Username</label>
              <input id="username" type="text" required pattern="[a-z0-9_]{3,32}" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Lowercase letters, numbers, underscore (3–32 chars).</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="full_name">
                Full name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="full_name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="password">Password</label>
              <input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 py-3 text-sm font-semibold text-white shadow-md hover:from-violet-400 disabled:opacity-60">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-zinc-400">
            Have an account?{" "}
            <Link to="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
