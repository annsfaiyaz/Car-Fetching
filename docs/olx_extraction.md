# OLX Data Extraction Guide

OLX Pakistan is a client-side React app. Listings are only visible after
JavaScript executes. Use a headless browser (Playwright/Chromium) to fetch
the fully-rendered HTML, then parse with BeautifulSoup.

## 1. Item Containers
Each listing card is an `<article>` element in the rendered DOM.

```python
articles = soup.find_all("article")
```

## 2. Field Extraction per Article

| Field | Method |
| :--- | :--- |
| **Title** | First `<h2>` or `<h3>` tag inside the article |
| **Price** | Text line starting with "Rs" — parse Lacs (e.g. "Rs 48.40 Lacs" → 4,840,000) |
| **Year** | Regex `\b(19|20)\d{2}\b` on full article text |
| **Mileage** | Regex `([\d,]+)\s*km` on full article text |
| **Transmission** | "automatic" / "manual" keyword in full article text |
| **URL** | `href` attribute of first `<a>` tag inside the article |

## 3. Fallback Strategy
If `<article>` count is 0 (OLX changed layout), fall back to:
```python
soup.select('a[href*="/item/"]')
```
Each `/item/` link and its parent container can be used to recover title, price, year, and km.

## 4. Pagination
Append `&page=N` to the search URL query string (not as a path segment).

## 5. Notes
- City/location is no longer included in listing cards — set `city = None`.
- CSS class names on OLX are hashed and change with every deployment — never rely on them.
- Always use tag names and regex patterns for robust extraction.
