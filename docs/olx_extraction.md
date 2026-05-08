# OLX Data Extraction Guide for AI Agents

When the agent scrapes OLX, use these selectors to identify car listings.

## 1. Item Containers
Listing cards are typically found within:
`li[data-aut-id="itemBox"]`

## 2. Field Selectors
| Field | CSS Selector / Attribute |
| :--- | :--- |
| **Price** | `span[data-aut-id="itemPrice"]` |
| **Title** | `span[data-aut-id="itemTitle"]` |
| **Location** | `span[data-aut-id="itemLocation"]` |
| **Details (Year/KM)** | `span[data-aut-id="itemDetails"]` |
| **Link** | `article > a` (href attribute) |

## 3. Implementation Logic
1. **URL Builder:** Combine the location ID and filters using commas (`%2C`).
2. **Infinite Scroll:** OLX may require scrolling or "Load More" clicks to reveal more data.
3. **Regex:** Use Regex to extract the Year and Mileage from the `itemDetails` text string.
