(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  document.getElementById("btn-theme-toggle").addEventListener("click", function () {
    document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("pakwheels_theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
    } catch (e) {}
  });

  async function saveKv(key, value) {
    const r = await fetch("/api/settings/kv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key, value: value }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || r.statusText);
    }
  }

  async function load() {
    const r = await fetch("/api/settings");
    const data = await r.json();
    const s = data.settings || {};
    const prov = String(s["llm.default_provider"] ?? "local");
    if ($("set-provider").querySelector('option[value="' + prov + '"]')) {
      $("set-provider").value = prov;
    }
    $("set-max-pages").value = String(s["scrape.max_pages"] ?? 3);
    $("set-max-listings").value = String(s["scrape.max_listings"] ?? 25);
    $("set-max-age").value = String(s["scrape.max_age_hours"] ?? 168);
  }

  $("settings-save").addEventListener("click", async function () {
    const status = $("save-status");
    status.textContent = "Saving…";
    try {
      await saveKv("llm.default_provider", $("set-provider").value);
      await saveKv("scrape.max_pages", parseInt($("set-max-pages").value, 10));
      await saveKv("scrape.max_listings", parseInt($("set-max-listings").value, 10));
      await saveKv("scrape.max_age_hours", parseInt($("set-max-age").value, 10));
      status.textContent = "Saved.";
      status.classList.remove("text-red-600", "dark:text-red-400");
    } catch (e) {
      status.textContent = String(e.message || e);
      status.classList.add("text-red-600", "dark:text-red-400");
    }
  });

  load().catch(function (e) {
    $("save-status").textContent = "Could not load settings: " + String(e.message || e);
  });
})();
