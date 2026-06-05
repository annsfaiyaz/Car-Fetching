(function () {
  const form = document.getElementById("login-form");
  const errEl = document.getElementById("login-error");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errEl.classList.add("hidden");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const btn = document.getElementById("login-submit");
    btn.disabled = true;
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      });
      const data = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        const detail = data.detail;
        errEl.textContent =
          typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg || "Login failed" : "Login failed";
        errEl.classList.remove("hidden");
        return;
      }
      WheelWiseAuth.setSession({ access_token: data.access_token, user: data.user });
      const params = new URLSearchParams(location.search);
      const next = params.get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        window.location.href = next;
        return;
      }
      WheelWiseAuth.redirectAfterLogin(data.user);
    } finally {
      btn.disabled = false;
    }
  });
})();
