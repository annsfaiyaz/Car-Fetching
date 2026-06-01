(function () {
  "use strict";

  const LS_DRAFT = "wheelwise_sell_draft";
  const form = document.getElementById("post-ad-form");
  const statusEl = document.getElementById("post-status");
  const previewImg = document.getElementById("preview-image");

  let editAdId = null;

  function getEditIdFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const raw = p.get("edit");
    if (!raw) return null;
    const id = parseInt(raw, 10);
    return isFinite(id) && id > 0 ? id : null;
  }

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className =
      "mt-4 rounded-lg px-4 py-3 text-sm " +
      (isError
        ? "border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        : "border border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200");
    statusEl.classList.remove("hidden");
  }

  function buildTitle(draft) {
    if (draft.title) return draft.title;
    const parts = [draft.make, draft.model, draft.variant, draft.model_year].filter(Boolean);
    return parts.join(" ").trim() || "Car for sale";
  }

  /** Split stored description back into main text + metadata fields. */
  function parseDescriptionMeta(description) {
    const meta = {};
    const main = [];
    const prefixes = [
      ["Make:", "make"],
      ["Model:", "model"],
      ["Variant:", "variant"],
      ["Body:", "body_type"],
      ["Color:", "color_exterior"],
      ["Fuel:", "fuel_type"],
      ["Condition:", "condition"],
    ];
    for (const line of (description || "").split("\n")) {
      const trimmed = line.trim();
      let hit = false;
      for (let i = 0; i < prefixes.length; i++) {
        const pair = prefixes[i];
        if (trimmed.indexOf(pair[0]) === 0) {
          meta[pair[1]] = trimmed.slice(pair[0].length).trim();
          hit = true;
          break;
        }
      }
      if (!hit) main.push(line);
    }
    return { description: main.join("\n").trim(), meta: meta };
  }

  function buildDescriptionWithMeta(payload) {
    const parts = [];
    if (payload.description) parts.push(payload.description);
    const metaLines = [];
    if (payload.make) metaLines.push("Make: " + payload.make);
    if (payload.model) metaLines.push("Model: " + payload.model);
    if (payload.variant) metaLines.push("Variant: " + payload.variant);
    if (payload.body_type) metaLines.push("Body: " + payload.body_type);
    if (payload.color_exterior) metaLines.push("Color: " + payload.color_exterior);
    if (payload.fuel_type) metaLines.push("Fuel: " + payload.fuel_type);
    if (payload.condition) metaLines.push("Condition: " + payload.condition);
    if (metaLines.length) parts.push(metaLines.join("\n"));
    return parts.filter(Boolean).join("\n\n").trim();
  }

  function readPayloadFromForm() {
    return {
      title: document.getElementById("field-title").value.trim(),
      description: document.getElementById("field-description").value.trim(),
      price: parseInt(document.getElementById("field-price").value, 10) || null,
      city: document.getElementById("field-city").value.trim() || null,
      model_year: parseInt(document.getElementById("field-year").value, 10) || null,
      transmission: document.getElementById("field-transmission").value.trim() || null,
      mileage: parseInt(document.getElementById("field-mileage").value, 10) || null,
      image_url: document.getElementById("field-image-url").value.trim() || null,
      make: document.getElementById("field-make").value.trim() || null,
      model: document.getElementById("field-model").value.trim() || null,
      variant: document.getElementById("field-variant").value.trim() || null,
      body_type: document.getElementById("field-body").value.trim() || null,
      color_exterior: document.getElementById("field-color").value.trim() || null,
      fuel_type: document.getElementById("field-fuel").value.trim() || null,
      condition: document.getElementById("field-condition").value.trim() || null,
    };
  }

  function fillFormFromItem(item) {
    const parsed = parseDescriptionMeta(item.description || "");
    document.getElementById("field-title").value = item.title || "";
    document.getElementById("field-description").value = parsed.description;
    if (item.price != null) document.getElementById("field-price").value = item.price;
    if (item.city) document.getElementById("field-city").value = item.city;
    if (item.model_year) document.getElementById("field-year").value = item.model_year;
    if (item.transmission) document.getElementById("field-transmission").value = item.transmission;
    if (item.mileage != null) document.getElementById("field-mileage").value = item.mileage;
    if (parsed.meta.make) document.getElementById("field-make").value = parsed.meta.make;
    if (parsed.meta.model) document.getElementById("field-model").value = parsed.meta.model;
    if (parsed.meta.variant) document.getElementById("field-variant").value = parsed.meta.variant;
    if (parsed.meta.body_type) document.getElementById("field-body").value = parsed.meta.body_type;
    if (parsed.meta.color_exterior) document.getElementById("field-color").value = parsed.meta.color_exterior;
    if (parsed.meta.fuel_type) document.getElementById("field-fuel").value = parsed.meta.fuel_type;
    if (parsed.meta.condition) document.getElementById("field-condition").value = parsed.meta.condition;
    if (item.image_url) {
      previewImg.src = item.image_url;
      previewImg.classList.remove("hidden");
      document.getElementById("field-image-url").value = item.image_url;
    }
  }

  function hasDraft() {
    try {
      return !!sessionStorage.getItem(LS_DRAFT);
    } catch (e) {
      return false;
    }
  }

  function setReviewModeUi() {
    const badge = document.getElementById("page-badge");
    const heading = document.getElementById("page-heading");
    const sub = document.getElementById("page-sub");
    const btn = document.getElementById("btn-publish");
    const aiBanner = document.getElementById("ai-banner");
    if (badge) badge.textContent = "Review & confirm";
    if (heading) heading.textContent = "Confirm your listing";
    if (sub) {
      sub.textContent =
        "Check what AI detected from your photos. Add price and city, edit anything, then publish when you are ready.";
    }
    if (btn) btn.textContent = "Confirm & publish";
    if (aiBanner) aiBanner.classList.remove("hidden");
    document.title = "Confirm listing — WheelWise PK";
  }

  function setEditModeUi() {
    const badge = document.getElementById("page-badge");
    const heading = document.getElementById("page-heading");
    const sub = document.getElementById("page-sub");
    const btn = document.getElementById("btn-publish");
    const aiBanner = document.getElementById("ai-banner");
    const sellHint = document.getElementById("sell-hint");
    if (badge) {
      badge.textContent = "Edit listing";
      badge.className =
        "mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-amber-800 dark:border-amber-500/30 dark:text-amber-300";
    }
    if (heading) heading.textContent = "Edit your ad";
    if (sub) sub.textContent = "Update price, photos, or details, then save changes.";
    if (btn) btn.textContent = "Save changes";
    if (aiBanner) aiBanner.classList.add("hidden");
    if (sellHint) sellHint.classList.add("hidden");
    document.title = "Edit ad — WheelWise PK";
  }

  function loadDraft() {
    if (editAdId) return;
    let draft = null;
    try {
      const raw = sessionStorage.getItem(LS_DRAFT);
      if (raw) draft = JSON.parse(raw);
    } catch (e) {}

    if (!draft) {
      document.getElementById("ai-banner").classList.add("hidden");
      return;
    }

    document.getElementById("field-title").value = buildTitle(draft);
    document.getElementById("field-description").value = draft.description || "";
    if (draft.model_year) document.getElementById("field-year").value = draft.model_year;
    if (draft.color_exterior) document.getElementById("field-color").value = draft.color_exterior;
    if (draft.body_type) document.getElementById("field-body").value = draft.body_type;
    if (draft.transmission) document.getElementById("field-transmission").value = draft.transmission;
    if (draft.fuel_type) document.getElementById("field-fuel").value = draft.fuel_type;
    if (draft.mileage) document.getElementById("field-mileage").value = draft.mileage;
    if (draft.condition) document.getElementById("field-condition").value = draft.condition;
    if (draft.make) document.getElementById("field-make").value = draft.make;
    if (draft.model) document.getElementById("field-model").value = draft.model;
    if (draft.variant) document.getElementById("field-variant").value = draft.variant;
    if (draft.image_url) {
      previewImg.src = draft.image_url;
      previewImg.classList.remove("hidden");
      document.getElementById("field-image-url").value = draft.image_url;
    }
  }

  async function loadAdForEdit(id) {
    showStatus("Loading your ad…", false);
    const r = await fetch("/api/user-ads/" + id, { headers: WheelWiseAuth.authHeaders() });
    const data = await r.json();
    if (!r.ok) {
      const detail = data.detail || r.statusText;
      throw new Error(typeof detail === "string" ? detail : "Could not load ad");
    }
    fillFormFromItem(data.item || {});
    statusEl.classList.add("hidden");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!window.WheelWiseAuth || !WheelWiseAuth.getAccessToken()) {
      window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }

    const raw = readPayloadFromForm();
    if (!raw.title) {
      showStatus("Title is required.", true);
      return;
    }

    const btn = document.getElementById("btn-publish");
    btn.disabled = true;
    showStatus(editAdId ? "Saving changes…" : "Publishing your ad…", false);

    try {
      let r;
      if (editAdId) {
        const patchBody = {
          title: raw.title,
          price: raw.price,
          city: raw.city,
          model_year: raw.model_year,
          transmission: raw.transmission,
          mileage: raw.mileage,
          description: buildDescriptionWithMeta(raw),
          image_url: raw.image_url,
        };
        r = await fetch("/api/user-ads/" + editAdId, {
          method: "PATCH",
          headers: Object.assign({ "Content-Type": "application/json" }, WheelWiseAuth.authHeaders()),
          body: JSON.stringify(patchBody),
        });
      } else {
        r = await fetch("/api/user-ads", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, WheelWiseAuth.authHeaders()),
          body: JSON.stringify(raw),
        });
      }
      const data = await r.json();
      if (!r.ok) {
        const detail = data.detail || r.statusText;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      sessionStorage.removeItem(LS_DRAFT);
      showStatus(editAdId ? "Ad updated successfully!" : "Ad published successfully!", false);
      setTimeout(function () {
        window.location.href = "/my-ads";
      }, 800);
    } catch (err) {
      showStatus(String(err.message || err), true);
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    editAdId = getEditIdFromUrl();

    if (editAdId) {
      if (!window.WheelWiseAuth || !WheelWiseAuth.requireAuth("/post-ad?edit=" + editAdId)) return;
      setEditModeUi();
      try {
        await loadAdForEdit(editAdId);
      } catch (err) {
        showStatus(String(err.message || err), true);
      }
      return;
    }

    if (!hasDraft()) {
      window.location.replace("/sell");
      return;
    }

    setReviewModeUi();
    loadDraft();
    if (window.WheelWiseAuth) WheelWiseAuth.updateNavAuth();
  });
})();
