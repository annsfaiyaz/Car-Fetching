(function () {
  "use strict";

  var driverFilter = null; // null | true | false

  function setDriver(val) {
    driverFilter = val;
    document.querySelectorAll(".driver-btn").forEach(function (btn) {
      btn.classList.remove(
        "border-violet-500", "bg-violet-500/10", "text-violet-700", "dark:text-violet-300",
        "active-driver"
      );
      btn.classList.add(
        "border-slate-300", "bg-white", "text-slate-600",
        "dark:border-zinc-700", "dark:bg-zinc-800", "dark:text-zinc-300"
      );
    });
    var active = val === true ? "driver-yes" : val === false ? "driver-no" : "driver-any";
    var btn = document.getElementById(active);
    if (btn) {
      btn.classList.remove(
        "border-slate-300", "bg-white", "text-slate-600",
        "dark:border-zinc-700", "dark:bg-zinc-800", "dark:text-zinc-300"
      );
      btn.classList.add("border-violet-500", "bg-violet-500/10", "text-violet-700", "dark:text-violet-300");
    }
  }

  window.setDriver = setDriver;

  function buildParams() {
    var params = new URLSearchParams();
    var city = document.getElementById("filter-city").value;
    var type = document.getElementById("filter-type").value;
    var price = document.getElementById("filter-price").value;
    if (city) params.set("city", city);
    if (type) params.set("car_type", type);
    if (price) params.set("max_price", price);
    if (driverFilter !== null) params.set("driver_included", driverFilter ? "true" : "false");
    return params;
  }

  function fmt(n) {
    return "PKR " + Number(n).toLocaleString("en-PK");
  }

  function renderCard(car) {
    var img = car.image_url || "/static/images/car-placeholder.svg";
    var driverBadge = car.driver_included
      ? '<span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Driver included</span>'
      : '<span class="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400">Self-drive</span>';

    var card = document.createElement("a");
    card.href = "/rent-detail?id=" + car.id;
    card.className =
      "group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900";
    card.innerHTML =
      '<div class="relative h-44 overflow-hidden bg-slate-100 dark:bg-zinc-800">' +
        '<img src="' + img + '" alt="' + car.title + '" class="h-full w-full object-cover transition group-hover:scale-105" onerror="this.src=\'/static/images/car-placeholder.svg\'; this.classList.add(\'p-6\',\'object-contain\')" />' +
        '<div class="absolute bottom-2 left-2">' + driverBadge + "</div>" +
      "</div>" +
      '<div class="flex flex-1 flex-col gap-2 p-4">' +
        '<p class="text-sm font-semibold leading-snug text-slate-900 dark:text-white">' + car.title + "</p>" +
        '<div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">' +
          '<span class="flex items-center gap-0.5">' +
            '<svg class="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>' +
            car.city +
          "</span>" +
          '<span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 capitalize dark:border-zinc-700 dark:bg-zinc-800">' + car.car_type + "</span>" +
          (car.model_year ? "<span>" + car.model_year + "</span>" : "") +
        "</div>" +
        '<div class="mt-auto pt-2 flex items-baseline gap-1">' +
          '<span class="text-lg font-bold text-violet-600 dark:text-violet-400">' + fmt(car.price_per_day) + "</span>" +
          '<span class="text-xs text-slate-400 dark:text-zinc-500">/ day</span>' +
        "</div>" +
      "</div>";
    return card;
  }

  async function loadListings() {
    var grid = document.getElementById("listings-grid");
    var loading = document.getElementById("loading-state");
    var empty = document.getElementById("empty-state");
    var count = document.getElementById("result-count");

    grid.innerHTML = "";
    grid.classList.add("hidden");
    loading.classList.remove("hidden");
    empty.classList.add("hidden");
    count.textContent = "";

    try {
      var params = buildParams();
      var res = await fetch("/api/rent/listings?" + params.toString());
      if (!res.ok) throw new Error("API error");
      var listings = await res.json();

      loading.classList.add("hidden");

      if (!listings.length) {
        empty.classList.remove("hidden");
        return;
      }

      count.textContent = listings.length + " car" + (listings.length !== 1 ? "s" : "") + " found";
      grid.classList.remove("hidden");
      listings.forEach(function (car) {
        grid.appendChild(renderCard(car));
      });
    } catch (err) {
      loading.classList.add("hidden");
      empty.classList.remove("hidden");
    }
  }

  window.applyFilters = loadListings;

  // ── AI Natural Language Search ─────────────────────────────────────────────

  function applyNLFilters(filters) {
    var cityEl  = document.getElementById("filter-city");
    var typeEl  = document.getElementById("filter-type");
    var priceEl = document.getElementById("filter-price");

    if (filters.city && cityEl) {
      // Try to match to an existing option, else set as text value
      var matched = false;
      for (var i = 0; i < cityEl.options.length; i++) {
        if (cityEl.options[i].value.toLowerCase() === (filters.city || "").toLowerCase()) {
          cityEl.value = cityEl.options[i].value;
          matched = true;
          break;
        }
      }
      if (!matched) cityEl.value = "";
    }
    if (filters.car_type && typeEl) typeEl.value = filters.car_type;
    if (filters.max_price && priceEl) priceEl.value = filters.max_price;
    if (filters.driver_included !== null && filters.driver_included !== undefined) {
      setDriver(filters.driver_included);
    }
  }

  function initNLSearch() {
    var input   = document.getElementById("nl-search-input");
    var btn     = document.getElementById("nl-search-btn");
    var label   = document.getElementById("nl-search-label");
    var resultP = document.getElementById("nl-search-result");
    var clearBtn = document.getElementById("nl-search-clear");

    if (!input || !btn) return;

    async function runSearch() {
      var q = input.value.trim();
      if (!q) return;
      btn.disabled = true;
      label.textContent = "Searching…";
      resultP.classList.add("hidden");
      try {
        var r = await fetch("/api/rent/nl-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        var data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Search failed");

        applyNLFilters(data);
        loadListings();

        var parts = [];
        if (data.city)            parts.push("City: " + data.city);
        if (data.car_type)        parts.push("Type: " + data.car_type);
        if (data.max_price)       parts.push("Max: PKR " + Number(data.max_price).toLocaleString() + "/day");
        if (data.driver_included !== null && data.driver_included !== undefined)
          parts.push("Driver: " + (data.driver_included ? "included" : "self-drive"));
        if (parts.length) {
          resultP.textContent = "AI applied: " + parts.join(" · ");
          resultP.classList.remove("hidden");
          clearBtn.classList.remove("hidden");
        }
      } catch (e) {
        resultP.textContent = "Could not parse query. Try adjusting the filters manually.";
        resultP.classList.remove("hidden");
      } finally {
        btn.disabled = false;
        label.textContent = "Search with AI";
      }
    }

    btn.addEventListener("click", runSearch);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") runSearch(); });

    clearBtn.addEventListener("click", function () {
      input.value = "";
      resultP.classList.add("hidden");
      clearBtn.classList.add("hidden");
      document.getElementById("filter-city").value = "";
      document.getElementById("filter-type").value = "";
      document.getElementById("filter-price").value = "";
      setDriver(null);
      loadListings();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Apply URL params from homepage quick-search
    var params = new URLSearchParams(window.location.search);
    if (params.get("city")) {
      var cityEl = document.getElementById("filter-city");
      if (cityEl) cityEl.value = params.get("city");
    }
    if (params.get("car_type")) {
      var typeEl = document.getElementById("filter-type");
      if (typeEl) typeEl.value = params.get("car_type");
    }
    if (params.get("driver_included") === "true")  setDriver(true);
    if (params.get("driver_included") === "false") setDriver(false);
    if (!params.get("driver_included")) setDriver(null);

    loadListings();
    initNLSearch();

    // Allow pressing Enter in inputs to search
    ["filter-city", "filter-type", "filter-price"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("keydown", function (e) { if (e.key === "Enter") loadListings(); });
    });

    // Smart partner CTA: send existing rental partners straight to their dashboard
    var cta = document.getElementById("partner-cta");
    if (cta && window.WheelWiseAuth) {
      var user = WheelWiseAuth.getUser ? WheelWiseAuth.getUser() : null;
      if (user && user.account_type === "rental_partner") {
        cta.href = "/rent-dashboard";
        cta.textContent = "Go to my dashboard";
      }
    }
  });
})();
