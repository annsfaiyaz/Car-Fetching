import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const FIELDS = [
  { id: "title", label: "Title", span: 2, required: true },
  { id: "make", label: "Make" },
  { id: "model", label: "Model" },
  { id: "variant", label: "Variant" },
  { id: "year", label: "Year", type: "number", min: 1980, max: 2030 },
  { id: "price", label: "Price (PKR)", type: "number", min: 0 },
  { id: "city", label: "City" },
  { id: "body", label: "Body type" },
  { id: "color", label: "Color" },
  { id: "transmission", label: "Transmission" },
  { id: "fuel", label: "Fuel" },
  { id: "mileage", label: "Mileage (km)", type: "number", min: 0 },
  { id: "condition", label: "Condition" },
];

export default function PostAd() {
  const { token, authHeaders, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const sessionId = params.get("session");

  const [form, setForm] = useState({ title: "", make: "", model: "", variant: "", year: "", price: "", city: "", body: "", color: "", transmission: "", fuel: "", mileage: "", condition: "", description: "", image_url: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchMe().then((user) => { if (!user) navigate("/login?next=/post-ad"); });
  }, []);

  useEffect(() => {
    if (!token) return;
    if (editId) {
      setIsEdit(true);
      fetch("/api/user-ads/" + editId, { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => setForm({ title: data.title || "", make: data.make || "", model: data.model || "", variant: data.variant || "", year: data.model_year || "", price: data.price || "", city: data.city || "", body: data.body_type || "", color: data.color || "", transmission: data.transmission || "", fuel: data.fuel_type || "", mileage: data.mileage || "", condition: data.condition || "", description: data.description || "", image_url: data.image_url || "" }))
        .catch(() => {});
    } else if (sessionId) {
      fetch("/api/sell/session/" + sessionId, { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => setForm((prev) => ({ ...prev, title: data.title || "", make: data.make || "", model: data.model || "", variant: data.variant || "", year: data.model_year || "", body: data.body_type || "", color: data.color || "", transmission: data.transmission || "", fuel: data.fuel_type || "", mileage: data.mileage || "", condition: data.condition || "", description: data.description || "", image_url: data.image_url || "" })))
        .catch(() => {});
    }
  }, [token, editId, sessionId]);

  function update(field, val) { setForm((f) => ({ ...f, [field]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const body = {
        title: form.title,
        make: form.make,
        model: form.model,
        variant: form.variant,
        model_year: form.year ? Number(form.year) : null,
        price: form.price ? Number(form.price) : null,
        city: form.city,
        body_type: form.body,
        color: form.color,
        transmission: form.transmission,
        fuel_type: form.fuel,
        mileage: form.mileage ? Number(form.mileage) : null,
        condition: form.condition,
        description: form.description,
        image_url: form.image_url,
      };
      if (sessionId) body.session_id = sessionId;
      const url = editId ? "/api/user-ads/" + editId : "/api/user-ads/";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Failed to publish");
      setStatus("Published!");
      setTimeout(() => navigate("/my-ads"), 1500);
    } catch (err) {
      setStatus(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800";

  return (
    <>
      <section className="ww-page-hero px-4 pb-2 pt-6 text-center sm:pt-10">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-300">
          {isEdit ? "Edit listing" : "Review & publish"}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {isEdit ? "Edit your listing" : "Confirm your listing"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 dark:text-zinc-400">
          {isEdit ? "Update the details and save." : "Check what AI detected, add price and city, edit anything, then publish when you are ready."}
        </p>
      </section>

      <main className="mx-auto max-w-3xl px-4 pb-16 lg:px-6">
        {!isEdit && sessionId && (
          <div className="mb-6 flex gap-3 rounded-xl border border-violet-300/50 bg-violet-500/10 px-4 py-3 text-sm text-violet-900 dark:border-violet-600/40 dark:text-violet-200">
            <svg className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
            </svg>
            <span>Fields were pre-filled from AI photo analysis. Edit anything before publishing.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          {form.image_url && (
            <div className="mb-6">
              <img src={form.image_url} alt="Car preview" className="max-h-56 w-full rounded-xl border border-slate-200 object-cover dark:border-zinc-700" />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.id} className={f.span === 2 ? "sm:col-span-2" : ""}>
                <label className={`text-sm font-medium${f.required ? "" : " text-slate-700 dark:text-zinc-300"}`}>{f.label}{f.required ? " *" : ""}</label>
                <input
                  type={f.type || "text"}
                  min={f.min}
                  max={f.max}
                  required={f.required}
                  value={form[f.id]}
                  onChange={(e) => update(f.id, e.target.value)}
                  className={inputCls}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">Description</label>
              <textarea rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputCls + " py-3"} />
            </div>
            <div className="sm:col-span-2 pt-2">
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 disabled:opacity-60">
                {loading ? "Publishing…" : isEdit ? "Save changes" : "Confirm & publish"}
              </button>
            </div>
          </div>
        </form>
        {status && <p className={`mt-4 text-center text-sm ${status === "Published!" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{status}</p>}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-zinc-500">
          No AI data yet?{" "}
          <Link to="/sell" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">Upload photos first →</Link>
          {" · "}
          <Link to="/my-ads" className="font-semibold text-slate-600 hover:underline dark:text-zinc-400">My ads</Link>
        </p>
      </main>
    </>
  );
}
