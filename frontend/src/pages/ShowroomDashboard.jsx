import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AnimatedTextCycle from "../components/AnimatedTextCycle";
import { formatPrice, hasType } from "../utils/format";

const EMPTY_FORM = {
  title: "", make: "", model: "", variant: "", year: "", price: "",
  city: "", transmission: "", fuel: "", mileage: "", condition: "",
  description: "", image_url: "",
};

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Peshawar", "Multan", "Quetta", "Sialkot", "Gujranwala"];
const inputCls = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

export default function ShowroomDashboard() {
  const { token, authHeaders, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const imgRef  = useRef(null);

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add/edit flow: null | "upload" | "form"
  const [addStep, setAddStep] = useState(null);
  const [editId, setEditId] = useState(null);

  // Step 1 — photo upload
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [hint, setHint] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // Step 2 — form
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    if (user && !hasType(user, "showroom")) { navigate("/"); return; }
    loadData();
  }, [token, user]);

  async function loadData() {
    try {
      const [p, l] = await Promise.all([
        fetch("/api/showroom/my", { headers: authHeaders() }).then((r) => r.ok ? r.json() : null),
        fetch("/api/user-ads/my", { headers: authHeaders() }).then((r) => r.ok ? r.json() : { items: [] }),
      ]);
      setProfile(p);
      setListings(l?.items || []);
    } catch { setError("Failed to load dashboard."); }
    finally { setLoading(false); }
  }

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); }

  function handleFiles(files) {
    const selected = Array.from(files).slice(0, 6);
    setPhotos(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
    setAnalyzeError("");
  }

  async function handleImgUpload(file) {
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/user-ads/upload-image", { method: "POST", headers: authHeaders(), body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Upload failed");
      set("image_url", data.url);
    } catch (err) {
      setFormError(String(err.message || err));
    } finally { setUploadingImg(false); }
  }

  function openAdd() {
    setEditId(null);
    setPhotos([]); setPreviews([]); setHint(""); setAnalyzeError("");
    setForm(EMPTY_FORM); setFormError("");
    setAddStep("upload");
  }

  function openEdit(ad) {
    setEditId(ad.id);
    setForm({
      title: ad.title || "", make: ad.make || "", model: ad.model || "",
      variant: ad.variant || "", year: ad.model_year || "", price: ad.price || "",
      city: ad.city || "", transmission: ad.transmission || "", fuel: ad.fuel_type || "",
      mileage: ad.mileage || "", condition: ad.condition || "",
      description: ad.description || "", image_url: ad.image_url || "",
    });
    setFormError("");
    setAddStep("form");
  }

  function closeForm() { setAddStep(null); setEditId(null); }

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!photos.length) { setAnalyzeError("Please upload at least one photo."); return; }
    setAnalyzing(true); setAnalyzeError("");
    try {
      const fd = new FormData();
      photos.forEach((img) => fd.append("files", img));
      if (hint.trim()) fd.append("user_hint", hint.trim());
      const r = await fetch("/api/sell/analyze-photos", { method: "POST", headers: authHeaders(), body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Analysis failed");
      const imgUrl = data._processing_info?.saved_images?.[0]?.[1] || "";
      setForm({
        title:        data.suggested_title || "",
        make:         data.make || "",
        model:        data.model || "",
        variant:      data.variant || "",
        year:         data.model_year || "",
        price:        "",
        city:         "",
        transmission: data.transmission_guess || "",
        fuel:         data.fuel_guess || "",
        mileage:      data.mileage_km || "",
        condition:    data.condition_summary || "",
        description:  data.suggested_description || "",
        image_url:    imgUrl,
      });
      setAddStep("form");
    } catch (err) {
      setAnalyzeError(String(err.message || err));
    } finally { setAnalyzing(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setSaving(true); setFormError("");
    const body = {
      title:        form.title,
      make:         form.make || undefined,
      model:        form.model || undefined,
      variant:      form.variant || undefined,
      model_year:   form.year ? Number(form.year) : undefined,
      price:        form.price ? Number(form.price) : undefined,
      city:         form.city || undefined,
      transmission: form.transmission || undefined,
      fuel_type:    form.fuel || undefined,
      mileage:      form.mileage ? Number(form.mileage) : undefined,
      condition:    form.condition || undefined,
      description:  form.description || undefined,
      image_url:    form.image_url || undefined,
    };
    try {
      const url = editId ? `/api/user-ads/${editId}` : "/api/user-ads";
      const r = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Failed to save");
      closeForm();
      await loadData();
    } catch (err) { setFormError(String(err.message || err)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this listing?")) return;
    await fetch(`/api/user-ads/${id}`, { method: "DELETE", headers: authHeaders() });
    setListings((prev) => prev.filter((a) => a.id !== id));
  }

  const published = listings.filter((a) => a.status === "published" || !a.status);
  const drafts    = listings.filter((a) => a.status && a.status !== "published");

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-500" />
    </div>
  );

  if (!profile) return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
      <section className="relative overflow-hidden px-4 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">Showroom Partner</p>
        <h1 className="mx-auto max-w-xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Set up your{" "}
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle words={["showroom", "profile", "presence"]} interval={2500} className="text-4xl sm:text-5xl tracking-tight" />
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-600 dark:text-zinc-400">Create your public showroom profile to start listing cars.</p>
        <div className="mt-8">
          <Link to="/showroom-setup" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:from-violet-400 active:scale-95">Set Up Showroom →</Link>
        </div>
      </section>
    </div>
  );

  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 text-center sm:py-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-600/15"></div>
          <div className="absolute left-1/4 top-10 h-40 w-40 rounded-full bg-amber-400/8 blur-2xl dark:bg-amber-500/8"></div>
        </div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
          Showroom Dashboard · {profile.city}
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          <span className="relative inline-flex text-violet-600 dark:text-violet-400">
            <AnimatedTextCycle
              words={[profile.business_name, `${profile.total_listings} cars listed`, profile.is_verified ? "Verified ✓" : "Pending verification"]}
              interval={3000} className="text-4xl sm:text-5xl tracking-tight"
            />
          </span>
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to={`/showrooms/${profile.id}`} className="rounded-xl border border-violet-300/60 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-500/15 dark:border-violet-600/40 dark:text-violet-300">View Public Page</Link>
          <Link to="/showroom-setup" className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">Edit Profile</Link>
          <button onClick={openAdd} className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white hover:from-violet-400 active:scale-95">+ Add Car</button>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-16 lg:px-6">
        {/* Stat cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Cars Listed", value: profile.total_listings ?? 0 },
            { label: "Published",         value: published.length },
            { label: "Drafts",            value: drafts.length },
            { label: "Verified Status",   value: profile.is_verified ? "✓ Verified" : "Pending" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{s.label}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Verification notice */}
        {!profile.is_verified && (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 dark:border-amber-500/20">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Verification pending</p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">Our team will review and verify your showroom shortly. Verified showrooms appear with a badge.</p>
          </div>
        )}

        {/* ── STEP 1: Photo Upload & AI Analysis ── */}
        {addStep === "upload" && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-violet-200/60 bg-white shadow-sm dark:border-violet-800/30 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add New Car — Upload Photos</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">AI will auto-fill make, model, year, transmission and more from your photos.</p>
              </div>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="p-5 space-y-4">
              {/* Drop zone */}
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 transition hover:border-violet-400 hover:bg-violet-50/30 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-violet-500"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              >
                <svg className="mb-3 h-10 w-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Drag & drop photos here, or click to browse</span>
                <span className="mt-1 text-xs text-slate-400 dark:text-zinc-500">JPG, PNG or WebP · up to 6 images</span>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)} />
              </label>

              {/* Previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="" className="h-20 w-full rounded-lg border border-slate-200 object-cover dark:border-zinc-700" />
                  ))}
                </div>
              )}

              {/* Hint */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Hint for AI <span className="font-normal text-slate-400">(optional)</span></label>
                <input type="text" value={hint} onChange={(e) => setHint(e.target.value)}
                  placeholder='e.g. "2019 Toyota Corolla manual, white"'
                  className={inputCls} />
              </div>

              {analyzeError && (
                <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{analyzeError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={analyzing || !photos.length}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-2.5 text-sm font-semibold text-white hover:from-violet-400 active:scale-[0.99] disabled:opacity-60">
                  {analyzing ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Analyzing…</>
                  ) : (
                    <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg> Analyze with AI</>
                  )}
                </button>
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setAddStep("form"); }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Skip — fill manually
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 2: Review & Confirm Form ── */}
        {addStep === "form" && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-violet-200/60 bg-white shadow-sm dark:border-violet-800/30 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editId ? "Edit Listing" : "Review & Confirm Details"}
                </h2>
                {!editId && (
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">AI pre-filled the details — review, add price & city, then publish.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editId && (
                  <button onClick={() => setAddStep("upload")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    ← Re-analyze
                  </button>
                )}
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Image preview from AI */}
            {form.image_url && (
              <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
                <img src={form.image_url} alt="car" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <span className="absolute bottom-2 left-3 rounded-full bg-violet-500/90 px-2.5 py-0.5 text-[0.65rem] font-semibold text-white">AI analyzed</span>
              </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Title *</label>
                <input id="car-form-title" type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Toyota Corolla 2020 GLI" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Make</label>
                <input type="text" value={form.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Model</label>
                <input type="text" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Corolla" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Variant</label>
                <input type="text" value={form.variant} onChange={(e) => set("variant", e.target.value)} placeholder="GLI" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Year</label>
                <input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2020" min="1980" max="2030" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Price (PKR) *</label>
                <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="3500000" min="0" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">City *</label>
                <select value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls}>
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Transmission</label>
                <select value={form.transmission} onChange={(e) => set("transmission", e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option>Automatic</option><option>Manual</option><option>CVT</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Fuel</label>
                <select value={form.fuel} onChange={(e) => set("fuel", e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option><option>CNG</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Mileage (km)</label>
                <input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} placeholder="45000" min="0" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Condition</label>
                <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option>Excellent</option><option>Good</option><option>Fair</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Car Image</label>
                <div className="mt-1 flex gap-2">
                  <input type="url" value={form.image_url} onChange={(e) => set("image_url", e.target.value)}
                    placeholder="https://… or upload below" className={`flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100`} />
                  <button type="button" onClick={() => imgRef.current?.click()}
                    disabled={uploadingImg}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {uploadingImg
                      ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-violet-500" /> Uploading…</>
                      : <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg> Upload</>
                    }
                  </button>
                  <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={(e) => handleImgUpload(e.target.files?.[0])} />
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="preview" className="mt-2 h-24 w-36 rounded-lg border border-slate-200 object-cover dark:border-zinc-700"
                    onError={(e) => { e.target.style.display = "none"; }} />
                )}
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe condition, features, history…" className={`${inputCls} resize-y`} />
              </div>

              {formError && (
                <div className="col-span-2 sm:col-span-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{formError}</div>
              )}

              <div className="col-span-2 flex gap-3 sm:col-span-3">
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-6 py-2.5 text-sm font-semibold text-white hover:from-violet-400 active:scale-[0.99] disabled:opacity-60">
                  {saving ? "Saving…" : editId ? "Save Changes" : "Add to Showroom"}
                </button>
                <button type="button" onClick={closeForm}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listings table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Your Listings <span className="ml-1.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300">{listings.length}</span>
            </h2>
            <button onClick={openAdd} className="rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:from-violet-400">
              + Add Car
            </button>
          </div>

          {listings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-5 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M6 11l1-4h10l1 4M7 11v2a2 2 0 002 2h6a2 2 0 002-2v-2"/>
                  <circle cx="8" cy="17" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-zinc-100">No cars listed yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Upload photos and let AI fill in the details — takes under a minute.</p>
              </div>
              <button onClick={openAdd} className="rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:from-violet-400">
                + Add First Car with AI
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {listings.map((ad) => (
                <div key={ad.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {ad.image_url ? (
                      <img src={ad.image_url} alt={ad.title} className="h-12 w-16 shrink-0 rounded-lg border border-slate-100 object-cover dark:border-zinc-800" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800">
                        <svg className="h-5 w-5 text-slate-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909"/></svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{ad.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {ad.price && <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{formatPrice(ad.price)}</p>}
                        {ad.city && <p className="text-xs text-slate-400 dark:text-zinc-500">📍 {ad.city}</p>}
                        {ad.model_year && <p className="text-xs text-slate-400 dark:text-zinc-500">🗓 {ad.model_year}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${ad.status === "published" || !ad.status ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {ad.status || "published"}
                    </span>
                    <button onClick={() => openEdit(ad)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Edit</button>
                    <button onClick={() => handleDelete(ad.id)} className="rounded-lg border border-red-200/60 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </div>
    </div>
  );
}
