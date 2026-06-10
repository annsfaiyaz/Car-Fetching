import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../utils/format";
import AnimatedTextCycle from "../components/AnimatedTextCycle";

const CAR_TYPES = ["sedan", "suv", "hatchback", "van", "pickup"];
const FUEL_POLICIES = [["renter_pays", "Renter pays fuel"], ["included", "Fuel included"]];

const EMPTY_FORM = { title: "", make: "", model: "", year: "", car_type: "", city: "", pickup_area: "", price: "", deposit: "", fuel_policy: "renter_pays", phone: "", driver: false, image_url: "", description: "" };

export default function RentDashboard() {
  const { token, authHeaders, fetchMe } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [scanLabel, setScanLabel] = useState("Upload & Scan photos");
  const [scanStatus, setScanStatus] = useState("");
  const [priceHint, setPriceHint] = useState("");
  const photoRef = useRef();

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) { navigate("/login?next=/rent-dashboard"); return; }
      setUser(u);
      if (u.account_type === "rental_partner") loadListings();
    });
  }, []);

  async function loadListings() {
    const r = await fetch("/api/rent/my-listings", { headers: authHeaders() });
    if (r.ok) setListings(await r.json());
  }

  async function loadBookings() {
    const r = await fetch("/api/rent/my-bookings", { headers: authHeaders() });
    if (r.ok) {
      const data = await r.json();
      setBookings(data);
      setPendingCount(data.filter((b) => b.status === "pending").length);
    }
  }

  async function loadInsights() {
    setInsightsLoading(true);
    const r = await fetch("/api/rent/insights", { headers: authHeaders() });
    if (r.ok) setInsights(await r.json());
    setInsightsLoading(false);
  }

  function switchTab(t) {
    setTab(t);
    if (t === "bookings" && !bookings) loadBookings();
    if (t === "insights" && !insights) loadInsights();
  }

  function openAdd() { setEditId(null); setForm(EMPTY_FORM); setFormError(""); setModal(true); }
  function openEdit(car) {
    setEditId(car.id);
    setForm({ title: car.title || "", make: car.make || "", model: car.model || "", year: car.model_year || "", car_type: car.car_type || "", city: car.city || "", pickup_area: car.pickup_area || "", price: car.price_per_day || "", deposit: car.security_deposit || "", fuel_policy: car.fuel_policy || "renter_pays", phone: car.contact_phone || "", driver: !!car.driver_included, image_url: car.image_url || "", description: car.description || "" });
    setFormError(""); setModal(true);
  }

  async function deleteListing(id) {
    if (!confirm("Delete this listing?")) return;
    await fetch("/api/rent/listings/" + id, { method: "DELETE", headers: authHeaders() });
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  async function updateBooking(id, status) {
    await fetch("/api/rent/bookings/" + id, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ status }) });
    loadBookings();
  }

  async function scanPhotos() {
    const files = photoRef.current?.files;
    if (!files?.length) return;
    setScanLabel("Scanning…"); setScanStatus("Analyzing photos with AI…"); setPriceHint("");
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("images", f));
    try {
      const r = await fetch("/api/sell/analyze", { method: "POST", headers: authHeaders(), body: fd });
      const data = await r.json();
      if (r.ok) {
        setForm((prev) => ({ ...prev, make: data.make || prev.make, model: data.model || prev.model, year: data.model_year || prev.year, car_type: data.body_type?.toLowerCase() || prev.car_type, title: data.title || prev.title, description: data.description || prev.description, image_url: data.image_url || prev.image_url }));
        setScanStatus("Done! Fields updated.");
        if (data.suggested_price_hint) setPriceHint(data.suggested_price_hint);
      } else { setScanStatus("Scan failed."); }
    } catch { setScanStatus("Scan failed."); }
    finally { setScanLabel("Upload & Scan photos"); }
  }

  async function submitForm(e) {
    e.preventDefault(); setFormError("");
    const body = { title: form.title, make: form.make, model: form.model, model_year: form.year ? Number(form.year) : null, car_type: form.car_type, city: form.city, pickup_area: form.pickup_area, price_per_day: Number(form.price), security_deposit: form.deposit ? Number(form.deposit) : null, fuel_policy: form.fuel_policy, contact_phone: form.phone, driver_included: form.driver, image_url: form.image_url, description: form.description };
    const url = editId ? "/api/rent/listings/" + editId : "/api/rent/listings";
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(data.detail || "Save failed"); return; }
    setModal(false); loadListings();
  }

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const tabCls = (t) => tab === t
    ? "tab-btn rounded-lg px-5 py-2 text-sm font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300"
    : "tab-btn rounded-lg px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500";

  if (!user) return null;

  if (user.account_type !== "rental_partner") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="overflow-hidden rounded-2xl border border-sky-200/60 bg-white shadow-sm dark:border-sky-800/30 dark:bg-zinc-900">
          <div className="bg-gradient-to-br from-sky-500/10 to-sky-700/5 px-6 py-10 text-center dark:from-sky-800/20 dark:to-sky-900/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Become a rental partner</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              List your cars, set your price, and start receiving booking requests — all from one dashboard.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/register?type=rental_partner&next=/rent-dashboard" className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-sky-400">Create partner account</Link>
              <Link to="/login?next=/rent-dashboard" className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Login</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 dark:divide-zinc-800 dark:border-zinc-800">
            {[["Free", "No commission"], ["AI pricing", "Market suggestions"], ["Insights", "Demand forecasting"]].map(([t, s]) => (
              <div key={t} className="px-4 py-3 text-center">
                <p className="text-sm font-bold text-sky-600 dark:text-sky-400">{t}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
      <section className="px-4 pb-4 pt-6 text-center sm:pt-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-sky-700 dark:border-sky-500/30 dark:text-sky-300">Rental Partner</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          My Rental{" "}
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={["Dashboard", "Listings", "Bookings", "Earnings"]}
              interval={2800}
              className="text-3xl sm:text-4xl tracking-tight"
            />
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base text-slate-600 dark:text-zinc-400">Manage your rental listings and respond to booking requests.</p>
      </section>

      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:w-fit">
          <button className={tabCls("listings")} onClick={() => switchTab("listings")}>My Listings</button>
          <button className={tabCls("bookings")} onClick={() => switchTab("bookings")}>
            Booking Requests {pendingCount > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">{pendingCount}</span>}
          </button>
          <button className={tabCls("insights")} onClick={() => switchTab("insights")}>AI Insights</button>
        </div>
      </div>

      {/* Listings panel */}
      {tab === "listings" && (
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 lg:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Cars</h2>
            <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/25 hover:from-sky-400">+ Add Car</button>
          </div>
          {listings === null && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2].map(i=><div key={i} className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800"/>)}</div>}
          {listings?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="text-lg font-semibold">No listings yet</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">Add your first rental car to start receiving bookings.</p>
              <button onClick={openAdd} className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-6 py-3 text-sm font-semibold text-white hover:from-sky-400">Add your first car</button>
            </div>
          )}
          {listings && listings.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((car) => (
                <article key={car.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  {car.image_url && <div className="-mx-4 -mt-4 mb-1 overflow-hidden rounded-t-xl"><img src={car.image_url} alt={car.title} className="h-40 w-full object-cover" onError={(e)=>{e.target.src="/static/images/car-placeholder.svg";}}/></div>}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{car.title}</h3>
                  <div className="flex items-baseline gap-1"><span className="text-lg font-bold text-sky-600 dark:text-sky-400">{formatPrice(car.price_per_day)}</span><span className="text-xs text-slate-400">/day</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(car)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Edit</button>
                    <button onClick={() => deleteListing(car.id)} className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400">Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Bookings panel */}
      {tab === "bookings" && (
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 lg:px-6">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Incoming Bookings</h2>
          {bookings === null && <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800"/>)}</div>}
          {bookings?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="text-lg font-semibold">No bookings yet</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">Booking requests will appear here once renters submit them.</p>
            </div>
          )}
          {bookings && bookings.length > 0 && (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{b.renter_name}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{b.renter_phone} · {b.pickup_date} → {b.return_date}</p>
                      {b.message && <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">"{b.message}"</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === "confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : b.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>{b.status}</span>
                      {b.status === "pending" && (
                        <>
                          <button onClick={() => updateBooking(b.id, "confirmed")} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">Confirm</button>
                          <button onClick={() => updateBooking(b.id, "cancelled")} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/20 dark:text-red-400">Cancel</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Insights panel */}
      {tab === "insights" && (
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 lg:px-6">
          <h2 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Demand Insights</h2>
          {insightsLoading && <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800"/>)}</div>}
          {insights && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-200/60 bg-violet-500/5 p-5 dark:border-violet-800/30 dark:bg-violet-950/10">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Summary</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{insights.summary}</p>
                <div className="mt-3 flex gap-4">
                  <div><p className="text-xs text-slate-500">Total bookings (90d)</p><p className="text-xl font-bold text-slate-900 dark:text-white">{insights.total_bookings ?? "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Confirmation rate</p><p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{insights.confirmation_rate ?? "—"}</p></div>
                </div>
              </div>
              {insights.tips?.map((tip, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-sm text-slate-700 dark:text-zinc-300">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{editId ? "Edit Rental Car" : "Add Rental Car"}</h3>
              <button onClick={() => setModal(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
              </button>
            </div>
            <form id="listing-form" onSubmit={submitForm} className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {/* AI scan */}
              <div className="mb-4 rounded-xl border border-dashed border-violet-300/60 bg-violet-500/5 p-3 dark:border-violet-700/40 dark:bg-violet-950/10">
                <p className="mb-2 text-xs font-semibold text-violet-700 dark:text-violet-300">Auto-fill from photos (AI)</p>
                <div className="flex items-center gap-2">
                  <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={scanPhotos} />
                  <button type="button" onClick={() => photoRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:bg-zinc-800 dark:text-violet-300 dark:hover:bg-violet-950">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                    {scanLabel}
                  </button>
                  {scanStatus && <p className="text-xs text-slate-500 dark:text-zinc-400">{scanStatus}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Title *</label><input type="text" placeholder="e.g. Honda City 2022 — Self Drive" required value={form.title} onChange={e=>upd("title",e.target.value)} className={inputCls}/></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Make</label><input type="text" placeholder="Honda" value={form.make} onChange={e=>upd("make",e.target.value)} className={inputCls}/></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Model *</label><input type="text" placeholder="City" required value={form.model} onChange={e=>upd("model",e.target.value)} className={inputCls}/></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Year</label><input type="number" placeholder="2022" min="1970" max="2030" value={form.year} onChange={e=>upd("year",e.target.value)} className={inputCls}/></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Car Type *</label><select required value={form.car_type} onChange={e=>upd("car_type",e.target.value)} className={inputCls}><option value="">Select type</option>{CAR_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">City *</label><input type="text" placeholder="Karachi" required value={form.city} onChange={e=>upd("city",e.target.value)} className={inputCls}/></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Pickup Area</label><input type="text" placeholder="DHA Phase 5" value={form.pickup_area} onChange={e=>upd("pickup_area",e.target.value)} className={inputCls}/></div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Price per Day (PKR) *</label>
                    {priceHint && <span className="text-[0.65rem] font-medium text-violet-600 dark:text-violet-400">{priceHint}</span>}
                  </div>
                  <input type="number" placeholder="4500" min="0" required value={form.price} onChange={e=>upd("price",e.target.value)} className={inputCls}/>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Security Deposit (PKR)</label><input type="number" placeholder="20000" min="0" value={form.deposit} onChange={e=>upd("deposit",e.target.value)} className={inputCls}/></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Fuel Policy *</label><select required value={form.fuel_policy} onChange={e=>upd("fuel_policy",e.target.value)} className={inputCls}>{FUEL_POLICIES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Contact Phone</label><input type="text" placeholder="0300-0000000" value={form.phone} onChange={e=>upd("phone",e.target.value)} className={inputCls}/></div>
                <div className="flex items-center gap-3 pt-2"><input id="f-driver" type="checkbox" checked={form.driver} onChange={e=>upd("driver",e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"/><label htmlFor="f-driver" className="text-sm font-medium text-slate-700 dark:text-zinc-300">Driver included</label></div>
                <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Image URL</label><input type="url" placeholder="https://..." value={form.image_url} onChange={e=>upd("image_url",e.target.value)} className={inputCls}/></div>
                <div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-400">Description</label><textarea rows={3} placeholder="Describe the car, rules, availability..." value={form.description} onChange={e=>upd("description",e.target.value)} className={inputCls}/></div>
              </div>
              {formError && <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{formError}</div>}
            </form>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-zinc-800">
              <button onClick={() => setModal(false)} type="button" className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
              <button type="submit" form="listing-form" className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 px-6 py-2 text-sm font-semibold text-white hover:from-sky-400 disabled:opacity-60">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
