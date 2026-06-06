export function formatPrice(n) {
  if (n == null || n === "") return "—";
  return "PKR " + Number(n).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export function relativeTime(val) {
  if (!val) return "";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(val))) return val;
  try {
    const diff = Math.floor((Date.now() - new Date(val)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) { const m = Math.floor(diff / 60); return m + " min" + (m !== 1 ? "s" : "") + " ago"; }
    if (diff < 86400) { const h = Math.floor(diff / 3600); return h + " hour" + (h !== 1 ? "s" : "") + " ago"; }
    if (diff < 86400 * 30) { const d = Math.floor(diff / 86400); return d + " day" + (d !== 1 ? "s" : "") + " ago"; }
    if (diff < 86400 * 365) { const mo = Math.floor(diff / (86400 * 30)); return mo + " month" + (mo !== 1 ? "s" : "") + " ago"; }
    return new Date(val).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return ""; }
}

export function formatPostedTime(car) {
  return relativeTime(car.posted_time) || relativeTime(car.created_at) || "";
}

export function listingImageSrc(car) {
  const raw = String(car.image_url || "").trim();
  if (!raw) return "/static/images/car-placeholder.svg";
  try {
    const host = new URL(raw).hostname;
    if (host.includes("pakwheels.com")) {
      return "/api/img-proxy?url=" + encodeURIComponent(raw);
    }
    return raw;
  } catch { return raw; }
}

export function listingDetailHref(car) {
  if (car.has_internal_detail === true || car.has_internal_detail === "true") {
    return "/api/listings/" + encodeURIComponent(String(car.id)) + "/html";
  }
  return car.url || "#";
}

export function listingDetailExternal(car) {
  return !(car.has_internal_detail === true || car.has_internal_detail === "true");
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = Math.round((Date.now() - new Date(iso)) / 60000);
  if (d < 60) return d + "m ago";
  if (d < 1440) return Math.round(d / 60) + "h ago";
  return Math.round(d / 1440) + "d ago";
}
