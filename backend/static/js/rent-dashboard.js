(function () {
  "use strict";

  const PLACEHOLDER = "/static/images/car-placeholder.svg";

  // ── Helpers ──────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign(
      { "Content-Type": "application/json" },
      WheelWiseAuth.authHeaders(),
      opts.headers || {}
    );
    return fetch(path, opts);
  }

  function fmtPrice(n) {
    return n != null ? "PKR " + Number(n).toLocaleString() + "/day" : "—";
  }

  function statusBadge(status) {
    const map = {
      pending:   "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
    };
    const cls = map[status] || "bg-slate-200 text-slate-600";
    return '<span class="rounded-md px-2 py-0.5 text-[0.72rem] font-semibold ' + cls + '">' + esc(status) + "</span>";
  }

  // ── Tab switching ────────────────────────────────────────────────────────

  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels  = {
    listings: document.getElementById("panel-listings"),
    bookings: document.getElementById("panel-bookings"),
    insights: document.getElementById("panel-insights"),
  };

  let insightsLoaded = false;

  function activateTab(name) {
    tabBtns.forEach(function (btn) {
      const active = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("bg-sky-500", active);
      btn.classList.toggle("text-white", active);
      btn.classList.toggle("text-slate-600", !active);
      btn.classList.toggle("dark:text-zinc-400", !active);
    });
    Object.keys(panels).forEach(function (k) {
      if (panels[k]) panels[k].classList.toggle("hidden", k !== name);
    });
    if (name === "insights" && !insightsLoaded) {
      insightsLoaded = true;
      loadInsights();
    }
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { activateTab(btn.getAttribute("data-tab")); });
  });

  activateTab("listings");

  // ── Listings ─────────────────────────────────────────────────────────────

  const listingsGrid    = document.getElementById("listings-grid");
  const listingsEmpty   = document.getElementById("listings-empty");
  const listingsLoading = document.getElementById("listings-loading");

  function renderListingCard(l) {
    const img = l.image_url
      ? '<img src="' + esc(l.image_url) + '" alt="" class="aspect-[16/10] w-full rounded-lg object-cover" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'" />'
      : '<div class="flex aspect-[16/10] w-full items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800"><img src="' + PLACEHOLDER + '" alt="" class="h-14 opacity-30" /></div>';

    const activePill = l.is_active
      ? '<span class="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.72rem] font-semibold text-emerald-700 dark:text-emerald-300">Active</span>'
      : '<span class="rounded-md bg-slate-200 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-500 dark:bg-zinc-700 dark:text-zinc-400">Inactive</span>';

    return (
      '<article data-listing-id="' + l.id + '" class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">' +
      img +
      '<h2 class="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-zinc-100">' + esc(l.title) + "</h2>" +
      '<div class="text-lg font-bold text-sky-600 dark:text-sky-400">' + fmtPrice(l.price_per_day) + "</div>" +
      '<div class="flex flex-wrap gap-1.5">' + activePill +
      (l.city ? '<span class="rounded-md bg-slate-100 px-2 py-0.5 text-[0.72rem] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">' + esc(l.city) + "</span>" : "") +
      (l.driver_included ? '<span class="rounded-md bg-violet-500/15 px-2 py-0.5 text-[0.72rem] font-semibold text-violet-700 dark:text-violet-300">Driver incl.</span>' : "") +
      "</div>" +
      '<div class="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-zinc-800">' +
      '<div class="flex gap-3">' +
      '<button type="button" data-edit-id="' + l.id + '" class="font-semibold text-sky-600 hover:underline dark:text-sky-400">Edit</button>' +
      '<button type="button" data-toggle-id="' + l.id + '" data-active="' + l.is_active + '" class="font-semibold ' +
        (l.is_active ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400") +
        ' hover:underline">' + (l.is_active ? "Deactivate" : "Activate") + "</button>" +
      '<button type="button" data-delete-id="' + l.id + '" class="font-semibold text-red-600 hover:underline dark:text-red-400">Delete</button>' +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  async function loadListings() {
    try {
      const r = await api("/api/rent/my-listings");
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed to load listings");
      if (listingsLoading) listingsLoading.remove();
      if (!data.length) { listingsEmpty.classList.remove("hidden"); return; }
      listingsGrid.innerHTML = data.map(renderListingCard).join("");
    } catch (e) {
      if (listingsLoading) listingsLoading.classList.add("hidden");
      listingsGrid.innerHTML = '<div class="col-span-full rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">' + esc(String(e.message || e)) + "</div>";
    }
  }

  listingsGrid.addEventListener("click", async function (ev) {
    // Edit
    const editBtn = ev.target.closest("[data-edit-id]");
    if (editBtn) { openModal(editBtn.getAttribute("data-edit-id")); return; }

    // Toggle active
    const toggleBtn = ev.target.closest("[data-toggle-id]");
    if (toggleBtn) {
      const id = toggleBtn.getAttribute("data-toggle-id");
      const isActive = toggleBtn.getAttribute("data-active") === "true";
      toggleBtn.disabled = true;
      try {
        const r = await api("/api/rent/my-listings/" + id, {
          method: "PATCH",
          body: JSON.stringify({ is_active: !isActive }),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Update failed"); }
        await loadListings();
      } catch (e) { alert(String(e.message || e)); toggleBtn.disabled = false; }
      return;
    }

    // Delete
    const delBtn = ev.target.closest("[data-delete-id]");
    if (delBtn) {
      const id = delBtn.getAttribute("data-delete-id");
      const title = delBtn.closest("article") && delBtn.closest("article").querySelector("h2") && delBtn.closest("article").querySelector("h2").textContent;
      if (!confirm("Delete" + (title ? ' "' + title.trim() + '"' : " this listing") + "? This cannot be undone.")) return;
      delBtn.disabled = true;
      try {
        const r = await api("/api/rent/my-listings/" + id, { method: "DELETE" });
        if (!r.ok && r.status !== 204) { const d = await r.json(); throw new Error(d.detail || "Delete failed"); }
        await loadListings();
      } catch (e) { alert(String(e.message || e)); delBtn.disabled = false; }
    }
  });

  // ── Add / Edit modal ─────────────────────────────────────────────────────

  const modal       = document.getElementById("listing-modal");
  const modalTitle  = document.getElementById("modal-title");
  const formError   = document.getElementById("form-error");
  const submitBtn   = document.getElementById("modal-submit");

  const FIELDS = ["title", "make", "model", "year", "car-type", "city", "pickup-area", "price", "deposit", "fuel-policy", "phone", "image-url", "description", "driver"];

  function getField(id) { return document.getElementById("f-" + id); }

  function clearForm() {
    FIELDS.forEach(function (id) {
      const el = getField(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = false;
      else el.value = el.tagName === "SELECT" ? (el.options[0] && el.options[0].value) : "";
    });
    document.getElementById("edit-listing-id").value = "";
    formError.classList.add("hidden");
    formError.textContent = "";
  }

  function fillForm(l) {
    getField("title").value       = l.title || "";
    getField("make").value        = l.make || "";
    getField("model").value       = l.model || "";
    getField("year").value        = l.model_year || "";
    getField("car-type").value    = l.car_type || "";
    getField("city").value        = l.city || "";
    getField("pickup-area").value = l.pickup_area || "";
    getField("price").value       = l.price_per_day != null ? l.price_per_day : "";
    getField("deposit").value     = l.deposit_amount != null ? l.deposit_amount : "";
    getField("fuel-policy").value = l.fuel_policy || "renter_pays";
    getField("phone").value       = l.contact_phone || "";
    getField("image-url").value   = l.image_url || "";
    getField("description").value = l.description || "";
    getField("driver").checked    = !!l.driver_included;
    document.getElementById("edit-listing-id").value = String(l.id);
  }

  function openModal(editId) {
    clearForm();
    if (editId) {
      modalTitle.textContent = "Edit Listing";
      // Fetch current values from the grid card data attributes
      const card = listingsGrid.querySelector('[data-listing-id="' + editId + '"]');
      // Re-fetch from API for accurate values
      api("/api/rent/my-listings").then(function (r) { return r.json(); }).then(function (list) {
        const item = list.find(function (l) { return String(l.id) === String(editId); });
        if (item) fillForm(item);
      });
    } else {
      modalTitle.textContent = "Add Rental Car";
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  document.getElementById("btn-add-listing").addEventListener("click", function () { openModal(null); });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

  document.getElementById("listing-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    formError.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    const editId = document.getElementById("edit-listing-id").value;
    const payload = {
      title:          getField("title").value.trim(),
      make:           getField("make").value.trim() || null,
      model:          getField("model").value.trim(),
      model_year:     getField("year").value ? parseInt(getField("year").value) : null,
      car_type:       getField("car-type").value,
      city:           getField("city").value.trim(),
      pickup_area:    getField("pickup-area").value.trim() || null,
      price_per_day:  parseInt(getField("price").value),
      deposit_amount: getField("deposit").value ? parseInt(getField("deposit").value) : null,
      fuel_policy:    getField("fuel-policy").value,
      contact_phone:  getField("phone").value.trim() || null,
      image_url:      getField("image-url").value.trim() || null,
      description:    getField("description").value.trim(),
      driver_included: getField("driver").checked,
    };

    try {
      const url    = editId ? "/api/rent/my-listings/" + editId : "/api/rent/my-listings";
      const method = editId ? "PATCH" : "POST";
      const r = await api(url, { method: method, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Save failed");
      closeModal();
      await loadListings();
    } catch (err) {
      formError.textContent = String(err.message || err);
      formError.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save";
    }
  });

  // ── Bookings ─────────────────────────────────────────────────────────────

  const bookingsList    = document.getElementById("bookings-list");
  const bookingsEmpty   = document.getElementById("bookings-empty");
  const bookingsLoading = document.getElementById("bookings-loading");
  const bookingsBadge   = document.getElementById("bookings-badge");

  function renderBookingRow(b) {
    const canAct = b.status === "pending";
    return (
      '<div data-booking-id="' + b.id + '" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">' +
      '<div class="flex flex-wrap items-start justify-between gap-3">' +
      '<div class="min-w-0">' +
      '<p class="truncate text-sm font-bold text-slate-900 dark:text-zinc-100">' + esc(b.renter_name) + "</p>" +
      '<p class="text-xs text-slate-500 dark:text-zinc-400">' + esc(b.listing_title || "Unknown listing") + "</p>" +
      "</div>" +
      '<div class="shrink-0">' + statusBadge(b.status) + "</div>" +
      "</div>" +
      '<div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-zinc-400">' +
      '<span>Phone: <strong class="text-slate-800 dark:text-zinc-200">' + esc(b.renter_phone) + "</strong></span>" +
      '<span>Pickup: <strong class="text-slate-800 dark:text-zinc-200">' + esc(b.pickup_date) + "</strong></span>" +
      '<span>Return: <strong class="text-slate-800 dark:text-zinc-200">' + esc(b.return_date) + "</strong></span>" +
      "</div>" +
      (b.message ? '<p class="mt-2 text-xs italic text-slate-500 dark:text-zinc-400">"' + esc(b.message) + '"</p>' : "") +
      (canAct
        ? '<div class="mt-3 flex gap-3 border-t border-slate-100 pt-3 dark:border-zinc-800">' +
          '<button type="button" data-action="confirmed" data-id="' + b.id + '" class="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400">Confirm</button>' +
          '<button type="button" data-action="cancelled" data-id="' + b.id + '" class="rounded-lg border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">Decline</button>' +
          "</div>"
        : "") +
      "</div>"
    );
  }

  async function loadBookings() {
    try {
      const r = await api("/api/rent/my-bookings");
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed to load bookings");
      if (bookingsLoading) bookingsLoading.remove();
      if (!data.length) { bookingsEmpty.classList.remove("hidden"); return; }

      const pending = data.filter(function (b) { return b.status === "pending"; }).length;
      if (pending) {
        bookingsBadge.textContent = pending;
        bookingsBadge.classList.remove("hidden");
      }

      bookingsList.innerHTML = data.map(renderBookingRow).join("");
    } catch (e) {
      if (bookingsLoading) bookingsLoading.classList.add("hidden");
      bookingsList.innerHTML = '<div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">' + esc(String(e.message || e)) + "</div>";
    }
  }

  bookingsList.addEventListener("click", async function (ev) {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    btn.disabled = true;
    try {
      const r = await api("/api/rent/bookings/" + id + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Update failed");
      await loadBookings();
    } catch (e) {
      alert(String(e.message || e));
      btn.disabled = false;
    }
  });

  // ── AI: Photo auto-fill ──────────────────────────────────────────────────

  function initPhotoScan() {
    const fileInput  = document.getElementById("f-photos");
    const scanBtn    = document.getElementById("btn-scan-photos");
    const scanLabel  = document.getElementById("scan-label");
    const scanStatus = document.getElementById("scan-status");
    if (!fileInput || !scanBtn) return;

    scanBtn.addEventListener("click", function () { fileInput.click(); });

    fileInput.addEventListener("change", async function () {
      const files = Array.from(fileInput.files);
      if (!files.length) return;
      scanBtn.disabled = true;
      scanLabel.textContent = "Scanning…";
      scanStatus.textContent = "";
      try {
        const fd = new FormData();
        files.forEach(function (f) { fd.append("files", f); });
        const r = await fetch("/api/sell/analyze-photos", {
          method: "POST",
          headers: WheelWiseAuth.authHeaders(),
          body: fd,
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Scan failed");

        const v = data.vehicle || data;
        if (v.make)       { getField("make").value  = v.make; }
        if (v.model)      { getField("model").value = v.model; }
        if (v.model_year) { getField("year").value  = v.model_year; }
        if (v.body_type) {
          const map = { sedan:"sedan", suv:"suv", hatchback:"hatchback", van:"van", pickup:"pickup" };
          const t = map[(v.body_type || "").toLowerCase()];
          if (t) getField("car-type").value = t;
        }
        if (!getField("title").value && v.make && v.model) {
          getField("title").value = [v.make, v.model, v.model_year || ""].filter(Boolean).join(" ");
        }
        scanStatus.textContent = "Fields filled from photos.";
        triggerPriceSuggestion();
      } catch (e) {
        scanStatus.textContent = "Scan failed: " + String(e.message || e);
      } finally {
        scanBtn.disabled = false;
        scanLabel.textContent = "Upload & Scan photos";
        fileInput.value = "";
      }
    });
  }

  // ── AI: Price suggestion ─────────────────────────────────────────────────

  async function triggerPriceSuggestion() {
    const city    = getField("city").value.trim();
    const carType = getField("car-type").value;
    const hint    = document.getElementById("price-hint");
    if (!city || !carType || !hint) return;
    try {
      const r = await api("/api/rent/suggest-price?city=" + encodeURIComponent(city) + "&car_type=" + encodeURIComponent(carType));
      const data = await r.json();
      if (!r.ok || !data.suggested) { hint.classList.add("hidden"); return; }
      hint.textContent = "Market avg: PKR " + Number(data.suggested).toLocaleString() + "/day (" + data.sample_size + " listings)";
      hint.classList.remove("hidden");
    } catch (_) { hint.classList.add("hidden"); }
  }

  function initPriceSuggestion() {
    ["f-city", "f-car-type"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", triggerPriceSuggestion);
    });
  }

  // ── AI: Description generator ────────────────────────────────────────────

  function initDescriptionGenerator() {
    const btn   = document.getElementById("btn-gen-desc");
    const label = document.getElementById("gen-desc-label");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      btn.disabled = true;
      label.textContent = "Generating…";
      try {
        const payload = {
          make:           getField("make").value.trim() || null,
          model:          getField("model").value.trim() || null,
          model_year:     getField("year").value ? parseInt(getField("year").value) : null,
          car_type:       getField("car-type").value || null,
          city:           getField("city").value.trim() || null,
          pickup_area:    getField("pickup-area").value.trim() || null,
          price_per_day:  getField("price").value ? parseInt(getField("price").value) : null,
          driver_included: getField("driver").checked,
          fuel_policy:    getField("fuel-policy").value || null,
        };
        const r = await api("/api/rent/generate-description", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Generation failed");
        getField("description").value = data.description;
      } catch (e) {
        alert("Description generation failed: " + String(e.message || e));
      } finally {
        btn.disabled = false;
        label.textContent = "Generate with AI";
      }
    });
  }

  // ── AI: Demand insights ──────────────────────────────────────────────────

  async function loadInsights() {
    const loading = document.getElementById("insights-loading");
    const content = document.getElementById("insights-content");
    try {
      const r = await api("/api/rent/demand-forecast");
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Failed to load insights");
      if (loading) loading.remove();

      document.getElementById("insights-summary-text").textContent = data.summary || "";
      document.getElementById("insights-total").textContent = data.total_bookings ?? "0";
      document.getElementById("insights-rate").textContent = (data.confirmed_rate ?? 0) + "%";

      const tipsEl = document.getElementById("insights-tips");
      tipsEl.innerHTML = (data.insights || []).map(function (tip) {
        return (
          '<div class="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">' +
          '<span class="mt-0.5 text-violet-500">✦</span>' +
          '<p class="text-sm text-slate-700 dark:text-zinc-300">' + esc(tip) + "</p>" +
          "</div>"
        );
      }).join("");

      content.classList.remove("hidden");
    } catch (e) {
      if (loading) loading.classList.add("hidden");
      const content2 = document.getElementById("insights-content");
      content2.innerHTML = '<div class="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">' + esc(String(e.message || e)) + "</div>";
      content2.classList.remove("hidden");
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    const gate   = document.getElementById("rent-dash-gate");
    const hero   = document.getElementById("rent-dash-hero");
    const tabs   = document.getElementById("rent-dash-tabs");
    const loggedIn = window.WheelWiseAuth && WheelWiseAuth.getAccessToken();

    if (!loggedIn) {
      if (gate) gate.classList.remove("hidden");
      return;
    }

    // Logged in — show dashboard
    if (gate) gate.classList.add("hidden");
    if (hero) hero.classList.remove("hidden");
    if (tabs) tabs.classList.remove("hidden");

    loadListings();
    loadBookings();
    initPhotoScan();
    initPriceSuggestion();
    initDescriptionGenerator();
  });
})();
