(function () {
  "use strict";

  var listingData = null;

  function fmt(n) {
    return "PKR " + Number(n).toLocaleString("en-PK");
  }

  function daysBetween(a, b) {
    var d1 = new Date(a);
    var d2 = new Date(b);
    return Math.round((d2 - d1) / 86400000);
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function updateTotal() {
    if (!listingData) return;
    var p = document.getElementById("pickup-date").value;
    var r = document.getElementById("return-date").value;
    var totalEl = document.getElementById("total-display");
    if (p && r && r > p) {
      var days = daysBetween(p, r);
      totalEl.textContent = days + " day" + (days !== 1 ? "s" : "") + " = " + fmt(days * listingData.price_per_day) + " total";
    } else {
      totalEl.textContent = "";
    }
  }

  function renderListing(car) {
    listingData = car;

    document.title = car.title + " — WheelWise PK";
    document.getElementById("car-title").textContent = car.title;

    var img = document.getElementById("car-image");
    img.src = car.image_url || "/static/images/car-placeholder.svg";
    img.alt = car.title;

    var cityEl = document.getElementById("car-city");
    cityEl.innerHTML = cityEl.innerHTML + car.city + (car.pickup_area ? " · " + car.pickup_area : "");

    document.getElementById("car-type-badge").textContent = car.car_type;
    if (car.model_year) document.getElementById("car-year").textContent = car.model_year;
    document.getElementById("car-description").textContent = car.description || "";

    if (car.driver_included) {
      document.getElementById("badge-driver").classList.remove("hidden");
    } else {
      document.getElementById("badge-self").classList.remove("hidden");
    }

    document.getElementById("car-fuel").textContent =
      car.fuel_policy === "included" ? "Fuel included" : "Renter pays fuel";

    if (car.deposit_amount) {
      document.getElementById("deposit-box").classList.remove("hidden");
      document.getElementById("car-deposit").textContent = fmt(car.deposit_amount);
    }

    document.getElementById("car-pickup").textContent = car.pickup_area || car.city;
    document.getElementById("price-display").textContent = fmt(car.price_per_day);

    // WhatsApp
    if (car.contact_phone) {
      var phone = car.contact_phone.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = "92" + phone.slice(1);
      var waBtn = document.getElementById("whatsapp-btn");
      waBtn.href = "https://wa.me/" + phone + "?text=" + encodeURIComponent("Hi, I am interested in renting: " + car.title);
      waBtn.classList.remove("hidden");
      waBtn.classList.add("flex");
    }

    // Min dates
    var today = todayStr();
    document.getElementById("pickup-date").min = today;
    document.getElementById("return-date").min = today;

    document.getElementById("detail-loading").classList.add("hidden");
    document.getElementById("detail-main").classList.remove("hidden");
  }

  async function loadListing() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    if (!id) {
      document.getElementById("detail-loading").classList.add("hidden");
      document.getElementById("detail-not-found").classList.remove("hidden");
      return;
    }
    try {
      var res = await fetch("/api/rent/listings/" + id);
      if (!res.ok) throw new Error("not found");
      var car = await res.json();
      renderListing(car);
    } catch (err) {
      document.getElementById("detail-loading").classList.add("hidden");
      document.getElementById("detail-not-found").classList.remove("hidden");
    }
  }

  async function submitBooking(e) {
    e.preventDefault();
    if (!listingData) return;

    var errEl = document.getElementById("booking-error");
    var okEl = document.getElementById("booking-success");
    var btn = document.getElementById("btn-book");

    errEl.classList.add("hidden");
    okEl.classList.add("hidden");

    var name = document.getElementById("renter-name").value.trim();
    var phone = document.getElementById("renter-phone").value.trim();
    var pickup = document.getElementById("pickup-date").value;
    var ret = document.getElementById("return-date").value;
    var msg = document.getElementById("booking-message").value.trim();

    if (!name || !phone || !pickup || !ret) {
      errEl.textContent = "Please fill in all required fields.";
      errEl.classList.remove("hidden");
      return;
    }
    if (ret <= pickup) {
      errEl.textContent = "Return date must be after pickup date.";
      errEl.classList.remove("hidden");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      var res = await fetch("/api/rent/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingData.id,
          renter_name: name,
          renter_phone: phone,
          pickup_date: pickup,
          return_date: ret,
          message: msg || null,
        }),
      });

      if (!res.ok) {
        var data = await res.json().catch(function () { return {}; });
        throw new Error(data.detail || "Booking failed. Please try again.");
      }

      var days = daysBetween(pickup, ret);
      okEl.innerHTML =
        "<strong>Booking request sent!</strong><br>" +
        "The rental partner will contact you on <strong>" + phone + "</strong> to confirm.<br>" +
        "<span class='text-slate-500 dark:text-zinc-400'>" + days + " day" + (days !== 1 ? "s" : "") +
        " · " + fmt(days * listingData.price_per_day) + " estimated total</span>";
      okEl.classList.remove("hidden");
      document.getElementById("booking-form").reset();
      document.getElementById("total-display").textContent = "";
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Request booking";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadListing();

    document.getElementById("pickup-date").addEventListener("change", function () {
      var ret = document.getElementById("return-date");
      if (!ret.value || ret.value <= this.value) {
        ret.value = "";
      }
      ret.min = this.value;
      updateTotal();
    });

    document.getElementById("return-date").addEventListener("change", updateTotal);
    document.getElementById("booking-form").addEventListener("submit", submitBooking);
  });
})();
