# OLX Pakistan Search Patterns for AI Agents

This document outlines the URL structures and filtering logic for OLX Pakistan (Car Category).

## 1. Base URL Structure
The core identifier for the car category is `c84`.
`https://www.olx.com.pk/[location]/cars_c84`

## 2. Dynamic URL Patterns
OLX uses a combination of path slugs and a `?filter=` query parameter. Multiple filters are comma-separated (encoded as `%2C`).

### A. Location & Make Slugs
| Type | URL Pattern |
| :--- | :--- |
| **Regional Search** | `/[province-or-city]_g[id]/cars_c84` |
| **Make Specific** | `/[location]/[make]-cars_c84?filter=make_eq_cars-[make]` |

### B. Filter Parameters (`?filter=`)
Use these keys inside the filter string to narrow results.

| Filter Category | Key | Example Value |
| :--- | :--- | :--- |
| **Condition** | `new_used_eq_` | `used`, `new` |
| **Fuel Type** | `petrol_eq_` | `petrol`, `diesel`, `hybrid` |
| **Transmission** | `transmission_eq_` | `manual`, `automatic` |
| **Price Range** | `price_between_` | `[min]_to_[max]` |
| **Model Year** | `year_between_` | `[min]_to_[max]` |

## 3. Pattern Construction (Examples)

**Pattern 1: Basic Used Cars in Punjab**
`https://www.olx.com.pk/punjab_g2003006/cars_c84?filter=new_used_eq_used`

**Pattern 2: Used Suzuki (Petrol) in Punjab**
`https://www.olx.com.pk/punjab_g2003006/suzuki-cars_c84?filter=make_eq_cars-suzuki%2Cnew_used_eq_used%2Cpetrol_eq_petrol`

**Pattern 3: Manual Transmission Filter**
`.../suzuki-cars_c84?filter=...%2Ctransmission_eq_manual`

---

## 4. Sorting and View
* **Sorting:** `?sort=relevance_desc`, `?sort=price_asc`, `?sort=price_desc`
