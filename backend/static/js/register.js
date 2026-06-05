(function () {
  const form = document.getElementById("register-form");
  const errEl = document.getElementById("register-error");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errEl.classList.add("hidden");
    const accountType =
      document.querySelector('input[name="account_type"]:checked')?.value || "seller";
    const body = {
      email: document.getElementById("email").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      full_name: document.getElementById("full_name").value.trim() || null,
      account_type: accountType,
    };
    const btn = document.getElementById("register-submit");
    btn.disabled = true;
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        const detail = data.detail;
        errEl.textContent =
          typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg || "Registration failed" : "Registration failed";
        errEl.classList.remove("hidden");
        return;
      }
      WheelWiseAuth.setSession({ access_token: data.access_token, user: data.user });
      WheelWiseAuth.redirectAfterLogin(data.user);
    } finally {
      btn.disabled = false;
    }
  });
})();
