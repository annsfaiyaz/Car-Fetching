# PakWheels search results page — extraction logic

Use these selectors and fallbacks when reading **search results** HTML (not the listing detail page). The backend scraper (`scraper/pakwheels.py`) follows this structure.

## Result list container

- Each listing is one **`li`** with class **`classified-listing`**.
- CSS: `li.classified-listing`

## Per-card fields

| Field | Primary selector | Fallback / notes |
|-------|------------------|------------------|
| **Title** | `a.car-name` | `a[class*='car-name']` |
| **Listing URL** | `href` on the title link | Normalize to absolute `https://www.pakwheels.com/...` |
| **Price** | `.price-details` | `[class*='price']`, then first `strong`, then regex `PKR …` on card text |
| **City / location** | `.search-vehicle-info-2 li`, `.city-name`, `[class*='location']` | Default text fallback if missing |
| **Year** | Regex `(19|20)\d{2}` on card text blob | — |
| **Mileage** | Regex `([\d,]+)\s*km` on card text | — |
| **Transmission** | Keywords `Automatic` / `Manual` in card text | — |
| **“Updated … ago”** | `.dated`, `.ad-updated`, `[class*='dated']`, `[class*='update']`, or text matching `Updated … ago` | Used for time-window filtering in the scraper |

## Detail page (optional second fetch)

When opening the listing URL:

- Specs: `ul.car-specifications li` with `.detail-sub-heading` + `.detail-sub-value`
- Description: `.seller-comments p` or `.seller-comments`
- Title meta: `meta[property="og:title"]`

## Price text normalization

- Display on the site may be **`PKR 4,500,000`**, **`45 lac`**, **`PKR 45 lacs`**, etc.
- For **storage / comparison as an integer**: convert to **PKR** (e.g. **1 lac = 100,000 PKR**), same rule as in `pakwheels_patterns.md` for `pr_less_` values.
- When presenting to users, format large amounts readably (e.g. with thousand separators or “lakh” wording, consistently).
