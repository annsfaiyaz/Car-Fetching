import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AnimatedTextCycle from "../components/AnimatedTextCycle";

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Peshawar", "Multan", "Quetta", "Sialkot", "Gujranwala"];

const inputCls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export default function ShowroomSetup() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", city: "", description: "", logo_url: "", contact_phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/showroom/my", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setExisting(data);
          setForm({
            business_name: data.business_name || "",
            city: data.city || "",
            description: data.description || "",
            logo_url: data.logo_url || "",
            contact_phone: data.contact_phone || "",
          });
        }
      })
      .finally(() => setLoadingExisting(false));
  }, [token]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.business_name.trim() || !form.city.trim()) {
      setError("Business name and city are required.");
      return;
    }
    setSaving(true); setError("");
    const method = existing ? "PUT" : "POST";
    const url = existing ? "/api/showroom/my" : "/api/showroom/setup";
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || `Server error (${r.status})`);
      navigate("/showroom-dashboard");
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-500" />
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
          <div className="absolute right-1/4 top-10 h-40 w-40 rounded-full bg-amber-400/8 blur-2xl dark:bg-amber-500/8"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          {existing ? "Edit your showroom" : "Become a showroom partner"}
        </p>
        <h1 className="mx-auto max-w-xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {existing ? "Update your " : "Set up your "}{" "}
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={["showroom", "profile", "presence", "brand"]}
              interval={2500}
              className="text-4xl sm:text-5xl tracking-tight"
            />
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600 dark:text-zinc-400">
          {existing
            ? "Keep your showroom details up to date to attract more buyers."
            : "Create your public showroom profile to list cars and reach thousands of buyers."}
        </p>
      </section>

      {/* Form */}
      <div className="mx-auto max-w-lg px-4 pb-16">
        <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="business_name">Business Name *</label>
              <input id="business_name" type="text" value={form.business_name}
                onChange={(e) => set("business_name", e.target.value)}
                placeholder="e.g. Al-Hamd Motors"
                className={inputCls} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="city">City *</label>
              <select id="city" value={form.city} onChange={(e) => set("city", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <option value="">Select city…</option>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="description">Description</label>
              <textarea id="description" rows={3} value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Tell customers about your showroom…"
                className={`${inputCls} resize-y`} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="logo_url">Logo URL</label>
              <input id="logo_url" type="url" value={form.logo_url}
                onChange={(e) => set("logo_url", e.target.value)}
                placeholder="https://…"
                className={inputCls} />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300" htmlFor="contact_phone">Contact Phone</label>
              <input id="contact_phone" type="tel" value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)}
                placeholder="03xx-xxxxxxx"
                className={inputCls} />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            <button type="submit" disabled={saving}
              className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 py-3 text-sm font-semibold text-white shadow-sm hover:from-violet-400 active:scale-[0.99] disabled:opacity-60">
              {saving ? "Saving…" : existing ? "Save Changes" : "Create Showroom"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
