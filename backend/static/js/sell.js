(function () {
  "use strict";

  const LS_DRAFT = "wheelwise_sell_draft";
  const preview = document.getElementById("image-preview");
  const fileInput = document.getElementById("car-images");
  const form = document.getElementById("sell-form");
  const statusEl = document.getElementById("sell-status");
  const analyzeBtn = document.getElementById("btn-analyze");
  let selectedFiles = [];

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className =
      "mt-4 rounded-lg px-4 py-3 text-sm " +
      (isError
        ? "border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        : "border border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200");
    statusEl.classList.remove("hidden");
  }

  function goToReviewPage() {
    const loggedIn = window.WheelWiseAuth && WheelWiseAuth.getAccessToken();
    if (loggedIn) {
      window.location.href = "/post-ad";
      return;
    }
    window.location.href = "/login?next=" + encodeURIComponent("/post-ad");
  }

  function renderPreviews() {
    preview.innerHTML = "";
    selectedFiles.forEach(function (file, i) {
      const wrap = document.createElement("div");
      wrap.className = "relative aspect-video overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-700";
      const img = document.createElement("img");
      img.className = "h-full w-full object-cover";
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className =
        "absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80";
      rm.textContent = "Remove";
      rm.addEventListener("click", function () {
        selectedFiles.splice(i, 1);
        renderPreviews();
      });
      wrap.appendChild(img);
      wrap.appendChild(rm);
      preview.appendChild(wrap);
    });
  }

  fileInput.addEventListener("change", function () {
    const incoming = Array.from(fileInput.files || []);
    selectedFiles = selectedFiles.concat(incoming).slice(0, 6);
    fileInput.value = "";
    renderPreviews();
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showStatus("Please upload at least one car photo.", true);
      return;
    }

    const hint = document.getElementById("user-hint").value.trim();
    const fd = new FormData();
    selectedFiles.forEach(function (f) {
      fd.append("files", f);
    });
    if (hint) fd.append("user_hint", hint);

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing…";
    showStatus("AI is analyzing your photos. This may take up to 30 seconds…", false);

    try {
      const r = await fetch("/api/sell/analyze-photos", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        const detail = data.detail || r.statusText;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }

      const images = (data._processing_info && data._processing_info.saved_images) || [];
      const imageUrls = images.map(function (pair) {
        return pair[1];
      });
      const primaryImage = imageUrls[0] || "";

      const draft = {
        make: data.make,
        model: data.model,
        variant: data.variant,
        model_year: data.model_year,
        body_type: data.body_type,
        color_exterior: data.color_exterior,
        transmission: data.transmission_guess,
        fuel_type: data.fuel_guess,
        mileage: data.mileage_km,
        condition: data.condition_summary,
        title: data.suggested_title,
        description: data.suggested_description,
        image_url: primaryImage,
        image_urls: imageUrls,
        confidence: data.confidence || {},
        user_hint: hint,
        analyzed_at: new Date().toISOString(),
      };

      sessionStorage.setItem(LS_DRAFT, JSON.stringify(draft));
      showStatus("Analysis complete! Review your details before publishing…", false);
      setTimeout(goToReviewPage, 600);
    } catch (err) {
      showStatus(String(err.message || err), true);
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "Analyze with AI";
    }
  });

  function updateSellGuestUi() {
    const banner = document.getElementById("sell-login-banner");
    const link = document.getElementById("sell-login-link");
    if (!banner) return;
    const loggedIn = window.WheelWiseAuth && WheelWiseAuth.getAccessToken();
    if (loggedIn) {
      banner.classList.add("hidden");
      return;
    }
    banner.classList.remove("hidden");
    if (link) {
      link.href = "/login?next=" + encodeURIComponent("/sell");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateSellGuestUi();
  });
})();
