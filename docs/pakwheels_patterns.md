# PakWheels used-car search URL patterns

Authoritative reference for **constructing** search URLs. Do **not** invent path segments or query keys that are not listed here.

## Base URL shape

```
https://www.pakwheels.com/used-cars/search/-/<segments>/[<query>]
```

- Path uses **`/-/`** after `search` before optional filters.
- Multiple filters are chained in the path as **`segment_value`** pairs separated by `/`.

## Documented path segments (only these)

| Segment prefix | Meaning | Example |
|----------------|---------|---------|
| `ct_` | City slug | `ct_lahore`, `ct_karachi`, `ct_gujranwala` |
| `mk_` | Make slug | `mk_toyota`, `mk_honda` |
| `md_` | Model slug | `md_corolla`, `md_civic` (must match PakWheels site slugs) |
| `pr_less_` | Maximum price in **PKR** (digits only—see **Lakh/lac → integer PKR** below) | `pr_less_2500000` |
| `yr_` | Minimum model year (four digits) | `yr_2018` |

**Important:** `pr_less_400000` is **₨400,000**, not 40 lakh. For “under 40 lakh” use **`pr_less_4000000`**, not `pr_less_400000`.

## Lakh / lac → integer PKR for `pr_less_` (required)

PakWheels expects **`pr_less_<N>`** where **N** is the **maximum price in whole PKR** (no commas). When the user gives **lakhs** or **lacs** (common in Pakistan), you **must** convert to PKR before building the segment.

| Unit | In PKR | How to convert |
|------|--------|----------------|
| **1 lac** (or **1 lakh**) | 100,000 | lac × 100,000 |
| **1 crore** | 10,000,000 | crore × 10,000,000 |

**Formula (lakhs):**

```text
pk_integer = round(lakhs × 100_000)
```

Use **`pr_less_<pk_integer>`** (digits only).

### Examples (memorize the pattern)

| User says | Lakhs (interpretation) | PKR integer | Path segment |
|-----------|------------------------|-------------|----------------|
| under **25 lac** | 25 | 2,500,000 | `pr_less_2500000` |
| under **25 lakh** | 25 | 2,500,000 | `pr_less_2500000` |
| under **40 lakh** | 40 | 4,000,000 | `pr_less_4000000` |
| **2.5 lac** | 2.5 | 250,000 | `pr_less_250000` |
| **1.5 crore** | — | 15,000,000 | `pr_less_15000000` |

**Do not** pass words like `lac` or `lakh` in the URL—**only** the integer after `pr_less_`.

If the user gives **absolute PKR** (“under 3 million”, “under 3000000”), use that number directly after checking it matches a sensible PKR amount.

## Documented query parameters (only these)

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `page` | Result page number | `page=2` |
| `sortby` | Sort order (see below) | `sortby=date_desc` |

Do **not** add other query keys (`fuel`, `body`, etc.) unless PakWheels documents them and they are added to this file.

## Sort (`sortby`) — allowed values

Only use values from this list:

| Value | When to use |
|-------|-------------|
| `date_desc` | **Default.** Newest / freshest listings first (use unless the user asks otherwise). |
| `bumped_at-desc` | Alternative “recent activity” ordering; used when aligning with “Updated … ago” on cards. |

If the user asks for **cheapest** or **lowest price**, prefer **`date_desc`** unless this file is updated with a confirmed PakWheels price-sort token—do **not** guess `price-asc` or similar.

If the user asks for **lowest mileage**, do **not** invent a mileage sort parameter; use **`date_desc`** until a documented sort exists here.

## Examples (path only; add `https://www.pakwheels.com` and query as needed)

- City only: `/used-cars/search/-/ct_lahore/`
- City + max price **25 lac** → `pr_less_2500000`: `/used-cars/search/-/ct_lahore/pr_less_2500000/`
- City + max price 4M PKR (40 lakh): `/used-cars/search/-/ct_lahore/pr_less_4000000/`
- Make + model + city: `/used-cars/search/-/ct_lahore/mk_honda/md_civic/` (slugs must match the site)

Always append a **`sortby`** in the query string when building a full URL (see Operating Instructions in the system prompt).
