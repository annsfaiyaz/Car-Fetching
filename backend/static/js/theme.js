(function () {
  "use strict";
  const LS_THEME = "pakwheels_theme";

  function applyTheme(dark) {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(LS_THEME, dark ? "dark" : "light");
    } catch (e) {}
  }

  function initThemeToggle() {
    const btn = document.getElementById("btn-theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      applyTheme(!document.documentElement.classList.contains("dark"));
    });
  }

  window.WheelWiseTheme = { init: initThemeToggle };
  document.addEventListener("DOMContentLoaded", initThemeToggle);
})();
