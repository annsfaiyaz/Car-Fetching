# OLX Pakistan Car Search URL Guide for AI

This technical guide defines the structured URL patterns for the **Cars** category (`c84`) on [OLX Pakistan](https://www.olx.com.pk). These patterns allow AI agents to programmatically generate search queries with multiple active filters.

## 1. Global Car Search Base
To search for cars across all of Pakistan:
`https://www.olx.com.pk/cars_c84`

---

## 2. Location-Specific Car Paths
OLX uses unique ID tokens for geographical regions. These **must** be used exactly — do NOT use plain city names like `/lahore/cars_c84`.

| Location | URL Pattern |
| :--- | :--- |
| **Karachi** | `https://www.olx.com.pk/karachi_g4060669/cars_c84` |
| **Lahore** | `https://www.olx.com.pk/lahore_g4060673/cars_c84` |
| **Islamabad** | `https://www.olx.com.pk/islamabad_g4060671/cars_c84` |
| **Gujranwala** | `https://www.olx.com.pk/gujranwala_g4060662/cars_c84` |
| **Faisalabad** | `https://www.olx.com.pk/faisalabad_g4060667/cars_c84` |

---

## 3. Keyword (Make/Model) in URL Path
To search by car make or model, append `/q-[keyword]` directly to the path — **before** the `?filter=` query string. Do NOT use `make_eq_` filter for this.

| Example | URL segment |
| :--- | :--- |
| Honda Civic | `.../cars_c84/q-honda-civic` |
| Toyota Corolla | `.../cars_c84/q-toyota-corolla` |
| Suzuki Alto | `.../cars_c84/q-suzuki-alto` |

---

## 4. Car Filter Parameters
All filters are appended using `?filter=`. Multiple filters are separated by the URL-encoded comma: `%2C`.

### Supported Filters
| Attribute | Filter Segment | Example Value |
| :--- | :--- | :--- |
| **Price** | `price_between_[min]_to_[max]` | `price_between_1000000_to_4000000` |
| **Year** | `year_between_[min]_to_[max]` | `year_between_2018_to_2024` |
| **Condition** | `new_used_eq_[value]` | `new_used_eq_used` |
| **Transmission** | `transmission_eq_[value]` | `transmission_eq_automatic` |
| **Fuel Type** | `fuel_eq_[value]` | `fuel_eq_hybrid` or `fuel_eq_petrol` |

---

## 5. Example Filtered URLs (AI-Ready)

### Example 1: Budget Honda Civic in Gujranwala (Under 40 Lakhs, Used)
`https://www.olx.com.pk/gujranwala_g4060662/cars_c84/q-honda-civic?filter=price_between_500000_to_4000000%2Cnew_used_eq_used`

### Example 2: Modern Automatic Sedan in Lahore (2019+, Automatic, Used)
`https://www.olx.com.pk/lahore_g4060673/cars_c84?filter=year_between_2019_to_2026%2Ctransmission_eq_automatic%2Cnew_used_eq_used`

### Example 3: Hybrid Cars in Karachi (Sorted by Newest)
`https://www.olx.com.pk/karachi_g4060669/cars_c84?filter=fuel_eq_hybrid&sort=desc`

### Example 4: Used Toyota Corolla nationwide under 3 million
`https://www.olx.com.pk/cars_c84/q-toyota-corolla?filter=price_between_0_to_3000000%2Cnew_used_eq_used`

### Example 5: Honda Civic in Islamabad, 2020 or newer
`https://www.olx.com.pk/islamabad_g4060671/cars_c84/q-honda-civic?filter=year_between_2020_to_2026%2Cnew_used_eq_used`

---

## 6. Sorting and Pagination

* **Sort by Newest:** `&sort=desc` ← use this by default for freshest listings
* **Sort by Price (Low to High):** `&sort=price_asc`
* **Sort by Price (High to Low):** `&sort=price_desc`
* **Pagination:** `&page=2`, `&page=3`, etc.

---

## 7. Rules for AI URL Construction

1. Always use the correct location ID token (e.g. `lahore_g4060673`). Never use plain `/lahore/`.
2. Use `/q-[keyword]` in the path for make/model — do NOT use `make_eq_` as a filter.
3. Separate multiple `?filter=` values with `%2C` (URL-encoded comma).
4. Always append `&sort=desc` for freshest results unless user asks for price sort.
5. Output exactly one URL as plain text — no markdown, no quotes.
