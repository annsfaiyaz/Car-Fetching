import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatPrice } from "../utils/format";

export default function RentDetail() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [car, setCar] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [message, setMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    fetch("/api/rent/listings/" + id)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setCar)
      .catch(() => setNotFound(true));
  }, [id]);

  const days = pickupDate && returnDate
    ? Math.max(1, Math.ceil((new Date(returnDate) - new Date(pickupDate)) / 86400000))
    : null;

  async function handleBook(e) {
    e.preventDefault();
    setBookingError(""); setBookingSuccess(""); setSubmitting(true);
    try {
      const r = await fetch("/api/rent/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: Number(id), renter_name: renterName, renter_phone: renterPhone, pickup_date: pickupDate, return_date: returnDate, message }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.detail || "Booking failed");
      setBookingSuccess("Booking request sent! The owner will contact you shortly.");
    } catch (err) {
      setBookingError(String(err.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30";

  if (notFound) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center lg:px-6">
      <p className="text-lg font-semibold text-slate-700 dark:text-zinc-200">Listing not found</p>
      <Link to="/rent" className="mt-4 inline-flex text-sm text-violet-600 hover:underline dark:text-violet-400">Browse all rentals</Link>
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-6">
        <Link to="/rent" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
          Back to listings
        </Link>
      </div>

      {!car ? (
        <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-4">
              <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-zinc-800"></div>
              <div className="h-6 w-3/4 animate-pulse rounded-lg bg-slate-200 dark:bg-zinc-800"></div>
            </div>
            <div className="lg:col-span-2"><div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-zinc-800"></div></div>
          </div>
        </div>
      ) : (
        <main className="mx-auto max-w-5xl px-4 py-8 pb-20 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Left */}
            <div className="lg:col-span-3 space-y-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <img
                  src={car.image_url || "/static/images/car-placeholder.svg"}
                  alt="Car photo"
                  className="h-72 w-full object-cover"
                  onError={(e) => { e.target.src = "/static/images/car-placeholder.svg"; e.target.classList.add("p-8", "object-contain"); }}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{car.title}</h1>
                  {car.driver_included
                    ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Driver included</span>
                    : <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-400">Self-drive</span>}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                    {car.city}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 capitalize dark:border-zinc-700 dark:bg-zinc-800">{car.car_type}</span>
                  {car.model_year && <span className="font-medium">{car.model_year}</span>}
                </div>

                {car.description && <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{car.description}</p>}

                <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-zinc-800">
                    <p className="text-xs text-slate-400 dark:text-zinc-500">Fuel policy</p>
                    <p className="mt-0.5 text-sm font-semibold capitalize text-slate-800 dark:text-zinc-100">{car.fuel_policy || "—"}</p>
                  </div>
                  {car.security_deposit > 0 && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-zinc-800">
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Security deposit</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">{formatPrice(car.security_deposit)}</p>
                    </div>
                  )}
                  {car.pickup_area && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-zinc-800">
                      <p className="text-xs text-slate-400 dark:text-zinc-500">Pickup area</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-zinc-100">{car.pickup_area}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: booking */}
            <div className="lg:col-span-2">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">{formatPrice(car.price_per_day)}</span>
                    <span className="text-sm text-slate-500 dark:text-zinc-400">/ day</span>
                  </div>
                  {days && <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Total: {formatPrice(car.price_per_day * days)} for {days} day{days !== 1 ? "s" : ""}</p>}
                </div>

                <form onSubmit={handleBook} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Request booking</h2>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">Your name</label>
                    <input type="text" required placeholder="Ali Khan" value={renterName} onChange={(e) => setRenterName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">Phone number</label>
                    <input type="tel" required placeholder="0300-0000000" value={renterPhone} onChange={(e) => setRenterPhone(e.target.value)} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">Pickup date</label>
                      <input type="date" required value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">Return date</label>
                      <input type="date" required value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">Message <span className="text-slate-400">(optional)</span></label>
                    <textarea rows={2} placeholder="Any special requirements..." value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
                  </div>
                  {bookingError && <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{bookingError}</div>}
                  {bookingSuccess && <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300">{bookingSuccess}</div>}
                  <button type="submit" disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-md hover:from-violet-400 hover:to-violet-600 active:scale-[0.99] disabled:opacity-60">
                    {submitting ? "Sending…" : "Request booking"}
                  </button>
                </form>

                {car.contact_phone && (
                  <a
                    href={`https://wa.me/${car.contact_phone.replace(/\D/g, "")}?text=Hi%2C+I'm+interested+in+renting+${encodeURIComponent(car.title)}`}
                    target="_blank" rel="noopener"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
