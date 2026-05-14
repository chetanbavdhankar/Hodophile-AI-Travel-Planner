# Hodophile — Real Flight Prices: Implementation Plan

## Context

The v1 frontend (index.html + js/) simulates flight prices using linear distance formulas in `engine.js`. A working scraper backend already exists in `v2/hodophile-server.js` (Node.js + Playwright, port 3747) with a `/search` endpoint that returns real prices from Google Flights (Kayak fallback). The goal is to wire these together without touching the UI.

---

## Phase 0: Documentation Discovery (COMPLETE)

### Verified Facts

**`js/engine.js` — fake price sources**
- `estimateFlightPrice(distance)` — lines 608–614: tiered linear formula (`35 + distance * 0.06`)
- `estimateTrainPrice(distance)` — lines 616–621: tiered linear formula (`20 + distance * 0.08`)
- `findRoutes()` — lines 193–334: calls both, adds `Math.random() * 40 - 20` variance. Fully **synchronous**.
- `scoutAgent()` — lines 116–190: calls `findRoutes()` synchronously. Returns routes per traveler.
- `optimize()` — lines 52–74: already `async`. Iterates windows + destinations, calls `scoutAgent()`.
- **No HTTP fetch calls exist anywhere in engine.js.**

**`v2/hodophile-server.js` — working scraper backend**
- Port: `3747` (line 26)
- CORS: `origin: '*'` (lines 32–36) — browser can call it directly
- Endpoint: `GET /search?origin=LHR&dest=LIS&windowStart=2026-06-01&windowEnd=2026-06-30&minNights=3&maxNights=5`
- Returns: `[{ price: 89, depart: "2026-06-01", return: "2026-06-05", nights: 4 }, ...]`
- Cache key: `"ORIGIN-DEST-DEPART-RETURN"` (15-min TTL, in-memory)
- Rate limit: 30 req/hour per IP (in-memory, resets on restart)
- No `/price` single-lookup endpoint exists — must use `/search` with a narrow window

**`js/data.js` — airport codes**
- 27 cities, each has `airports[]` array. `airports[0]` = primary airport (e.g., LHR, CDG, BER, BCN).
- `bookingLinks.flight(originCode, destCode, dateISO)` — already uses `airports[0]`

**Train prices: no scraper exists** — formula fallback is the only option for trains.

---

## Phase 1: Backend — Serve v1 Files from the Node.js Server

**Goal:** Host the v1 frontend from `hodophile-server.js` so that `http://localhost:3747/` serves `index.html`. This eliminates same-origin concerns and gives users a single `npm start` entry point.

**File to edit:** `v2/hodophile-server.js`

**What to add** (after the existing `cors()` middleware, before route definitions):
```js
const path = require('path');
// Serve v1 frontend from project root
app.use(express.static(path.join(__dirname, '..')));
```

**Verification checklist:**
- `node v2/hodophile-server.js` then open `http://localhost:3747/` → v1 index.html renders
- `http://localhost:3747/js/engine.js` returns the file
- `http://localhost:3747/health` still returns `{ status: 'ok', version: '0.2' }`

**Anti-pattern guards:**
- Do NOT move or copy the v1 files into v2/. Just serve them from `..` via static middleware.
- Do NOT change the `/search` route — it must stay at `/search`, not `/api/search`.

---

## Phase 2: Engine — Add Price Fetching Infrastructure to engine.js

**Goal:** Add a backend URL config, a client-side price cache, and an async `fetchFlightPrices()` method to `HodophileEngine`. No behaviour changes yet — just adding the capability.

**File to edit:** `js/engine.js`

### 2a. Constructor — add config and cache

Locate the `constructor()` of `HodophileEngine`. Add:
```js
this.backendUrl = options?.backendUrl ?? 'http://localhost:3747';
this.priceCache = new Map(); // key: "ORIGIN-DEST-DEPART-RETURN" → price (number)
```

The constructor currently takes `data` as first arg. Change signature to:
```js
constructor(data, options = {}) {
```

### 2b. New method — `fetchFlightPrices(originCode, destCode, windowStart, windowEnd, minNights, maxNights)`

Add this async method after `simulateDelay()`:

```js
async fetchFlightPrices(originCode, destCode, windowStart, windowEnd, minNights, maxNights) {
    const url = `${this.backendUrl}/search?origin=${originCode}&dest=${destCode}`
              + `&windowStart=${windowStart}&windowEnd=${windowEnd}`
              + `&minNights=${minNights}&maxNights=${maxNights}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) return null;
        const combos = await res.json();
        // Populate priceCache for each returned combo
        for (const c of combos) {
            const key = `${originCode}-${destCode}-${c.depart}-${c.return}`;
            this.priceCache.set(key, c.price);
        }
        return combos; // [{ price, depart, return, nights }]
    } catch {
        return null; // backend offline or timed out — fallback to formula
    }
}
```

### 2c. New method — `lookupPrice(originCode, destCode, depart, returnDate)`

```js
lookupPrice(originCode, destCode, depart, returnDate) {
    const key = `${originCode}-${destCode}-${depart}-${returnDate}`;
    return this.priceCache.has(key) ? this.priceCache.get(key) : null;
}
```

**Verification checklist:**
- `HodophileEngine` instantiates without errors
- `fetchFlightPrices('LHR', 'LIS', '2026-07-01', '2026-07-31', 3, 5)` when server is running → returns array
- When server is offline → returns `null` (no uncaught errors)
- `lookupPrice('LHR', 'LIS', '2026-07-01', '2026-07-05')` returns number after fetchFlightPrices populates cache

**Anti-pattern guards:**
- Do NOT use XMLHttpRequest. Use `fetch()` — it's available in all modern browsers.
- Do NOT throw on fetch failure — return null so the caller can fall back to formula.
- `AbortSignal.timeout(30000)` requires Chrome 103+/Firefox 100+. Add a try/catch around it and fall back to a manual `AbortController` if needed.

---

## Phase 3: Engine — Pre-fetch Prices in Stage 1 (Scout)

**Goal:** Before the scout loop runs, collect all unique (origin_airport → dest_airport) pairs needed for the trip window and bulk-fetch prices. This batches scraping calls upfront rather than making one call per `findRoutes()` invocation.

**File to edit:** `js/engine.js` — `optimize()` method, Stage 1 section (lines 52–74)

### 3a. Collect unique route pairs

After validating inputs and building `candidates` and `windows`, add a pre-fetch block:

```js
// Pre-fetch real prices for all routes we'll need
const prefetchPromises = [];
const [winStart, winEnd] = [windows[0].start, windows[windows.length - 1].end];
const minNights = config.duration ?? 3;
const maxNights = (config.duration ?? 3) + 2;

for (const destKey of candidates) {
    const dest = this.data.cities[destKey];
    if (!dest) continue;
    for (const traveler of travelers) {
        const originKey = this.findCityKey(traveler.origin);
        if (!originKey) continue;
        const origin = this.data.cities[originKey];
        const originCode = origin.airports[0];
        const destCode   = dest.airports[0];
        const cachePrefix = `${originCode}-${destCode}`;
        // Only fetch if we don't have any cached entry for this route
        const alreadyCached = [...this.priceCache.keys()].some(k => k.startsWith(cachePrefix));
        if (!alreadyCached) {
            prefetchPromises.push(
                this.fetchFlightPrices(originCode, destCode, winStart, winEnd, minNights, maxNights)
            );
        }
    }
}
await Promise.allSettled(prefetchPromises);
```

**Place this block immediately before:**
```js
this.emit('stage', { stage: 'scout', status: 'active' });
```

### 3b. Make simulateDelay stage-aware

The 800ms scout delay exists to make the staged UI animation feel natural. When real HTTP scraping occurs, the pre-fetch already fills that time. Adjust the scout stage delay:

```js
// Scout stage delay: only pad if pre-fetch was near-instant (backend offline/cached)
const scoutDelay = prefetchPromises.length > 0 ? 200 : 800;
await this.simulateDelay(scoutDelay);
```

**Verification checklist:**
- Open browser DevTools Network tab → observe fetch calls to `localhost:3747/search` before the stage animation starts
- `priceCache` has entries after prefetch (add `console.log(this.priceCache.size)` temporarily)
- With backend offline: `priceCache` stays empty, no unhandled errors, optimization completes with formula prices
- `Promise.allSettled` ensures a single scraper timeout doesn't block the whole optimization

**Anti-pattern guards:**
- Do NOT use `Promise.all` — a single rejected promise would abort everything.
- Do NOT call `fetchFlightPrices` inside the per-window scout loop — that would re-scrape on every window.
- minNights/maxNights for pre-fetch: use the user's `config.duration` as min, `duration + 2` as max to cover variability.

---

## Phase 4: Engine — Replace Fake Prices in findRoutes()

**Goal:** Replace `estimateFlightPrice()` calls with `lookupPrice()`, with formula as fallback. Keep `estimateFlightPrice()` intact — it's the fallback.

**File to edit:** `js/engine.js` — `findRoutes()` method (lines 193–334)

### 4a. Resolve dates for the lookup

`findRoutes()` currently receives `tripDate` (departure date, `YYYY-MM-DD`). It does NOT receive a return date. The `returnDate` comes from the window. Modify the function signature:

**Change:**
```js
findRoutes(origin, originKey, dest, destKey, distance, traveler, tripDate) {
```
**To:**
```js
findRoutes(origin, originKey, dest, destKey, distance, traveler, tripDate, returnDate) {
```

Update `scoutAgent()` call site to pass the return date:
```js
const routeOptions = this.findRoutes(origin, originKey, dest, destKey, distance, traveler, tripDate, window.returnDate);
```
(Note: `scoutAgent()` receives `tripDate` and `returnDate` as params — pass `returnDate` down to `findRoutes`.)

### 4b. Replace direct flight price lookup

**Current code (line ~198):**
```js
const baseFlightPrice = this.estimateFlightPrice(distance);
```

**Replace with:**
```js
const originCode = origin.airports[0];
const destCode   = dest.airports[0];
const realPrice  = returnDate ? this.lookupPrice(originCode, destCode, tripDate, returnDate) : null;
const baseFlightPrice = realPrice ?? this.estimateFlightPrice(distance);
const isEstimated = realPrice === null;
```

### 4c. Remove random variance when using real price

**Current code (line ~202):**
```js
const directFlightCost = baseFlightPrice + Math.floor(Math.random() * 40) - 20;
```

**Replace with:**
```js
const directFlightCost = isEstimated
    ? baseFlightPrice + Math.floor(Math.random() * 40) - 20
    : baseFlightPrice;
```

### 4d. Tag the segment as estimated or real

In the segment object pushed to `routes`, add a flag:
```js
segments: [{
    type: "flight",
    // ... existing fields ...
    priceSource: isEstimated ? 'estimated' : 'scraped',
}],
```
Also set it at the route level:
```js
priceSource: isEstimated ? 'estimated' : 'scraped',
```

### 4e. Gateway airport price lookup

The gateway airport logic constructs secondary routes (fly to Pisa, train to Florence). For the gateway flight leg, also attempt a real price lookup:

Locate the gateway section in `findRoutes()` (look for `HODOPHILE_DATA.gatewayAirports` or similar). Where gateway flight cost is calculated, add:
```js
const gwRealPrice = returnDate
    ? this.lookupPrice(origin.airports[0], gw.airport, tripDate, returnDate)
    : null;
const gwFlightCost = gwRealPrice ?? Math.round(baseFlightPrice * 0.65);
```

**Verification checklist:**
- With backend running: direct flight cost matches what `/search` returned (no ±20 variance)
- With backend offline: `isEstimated = true`, ±€20 variance still applies
- `priceSource` field present in route objects
- Gateway routes also use real prices when available

**Anti-pattern guards:**
- Do NOT make async fetch calls inside `findRoutes()`. It must stay synchronous — prices were pre-fetched in Phase 3.
- Do NOT remove `estimateFlightPrice()` — it's the offline fallback.
- Trains keep `estimateTrainPrice()` — no train scraper exists.

---

## Phase 5: UI — Show Real vs Estimated Price Indicator

**Goal:** When a price is estimated (formula-based), show `~€X est.` so users know it's approximate. Real scraped prices show as `€X`.

**File to edit:** `js/ui.js` — `renderRouteCard()` method

Locate where the per-traveler cost is rendered. Currently something like:
```js
<div class="route-cost">€${route.totalCost}</div>
```

Change to:
```js
const priceLabel = route.priceSource === 'estimated'
    ? `~€${route.totalCost} <span class="price-estimated" title="Price estimated from distance">est.</span>`
    : `€${route.totalCost}`;
// ... use priceLabel in the template
```

**File to edit:** `css/components.css` — add style for `.price-estimated`:
```css
.price-estimated {
    font-size: 0.7em;
    opacity: 0.6;
    font-weight: 400;
    vertical-align: super;
}
```

**Verification checklist:**
- With backend running: cost shows `€89` (no "est.")
- With backend offline: cost shows `~€140 est.`
- Tooltip "Price estimated from distance" appears on hover

**Anti-pattern guards:**
- Do NOT hide the price when estimated — show it with the `est.` marker.
- Do NOT add this indicator to train prices (train always uses formula, users don't need to know).

---

## Phase 6: Backend — Add a Startup Script

**Goal:** Single command to start the backend, with clear logging.

**File to create:** `v2/start.sh` (or `v2/start.bat` for Windows):

```bat
@echo off
echo Starting Hodophile server...
echo Open http://localhost:3747 in your browser
node hodophile-server.js
```

**File to edit:** `v2/package.json` — add start script:
```json
"scripts": {
    "start": "node hodophile-server.js"
}
```

**Also:** Add a comment at the top of `js/engine.js` explaining the backend dependency:
```js
// Requires hodophile-server running on localhost:3747 for real prices.
// Falls back to distance-based estimates when backend is unavailable.
```

**Verification checklist:**
- `cd v2 && npm start` → server starts, console shows `Hodophile server running on port 3747`
- `http://localhost:3747/` → serves v1 index.html

---

## Phase 7: End-to-End Integration Test

**Manual test checklist:**

1. Start backend: `cd v2 && npm start`
2. Open `http://localhost:3747/`
3. Click "Load Demo" (populates Alice/London, Bob/Berlin, Clara/Madrid)
4. Set target cities to Prague, Vienna, Budapest
5. Click "Find Our Meeting Point"
6. Verify Network tab shows `GET /search?origin=LHR&dest=PRG...` etc.
7. Verify results show `€89` style prices (not `~€140 est.`) for at least one route
8. Stop backend. Repeat optimization.
9. Verify results still show (with `est.` labels) — no crash or blank results

**Error scenarios to test:**
- Backend offline → formula fallback, `est.` labels, no console errors
- Unknown city (custom) → `synthesizeCity()` runs, airports[0] may be undefined → add null guard in `fetchFlightPrices` (`if (!originCode || !destCode) return null`)
- Rate limit hit (>30 requests) → backend returns 429 → `fetchFlightPrices` returns null → formula fallback

---

## Summary of File Changes

| File | Change |
|------|--------|
| `v2/hodophile-server.js` | Add `express.static(path.join(__dirname, '..'))` |
| `v2/package.json` | Add `"start": "node hodophile-server.js"` |
| `js/engine.js` | Add `backendUrl`, `priceCache`, `fetchFlightPrices()`, `lookupPrice()`, pre-fetch block in `optimize()`, update `findRoutes()` signature + price lookup |
| `js/ui.js` | Add `priceSource` check in `renderRouteCard()` |
| `css/components.css` | Add `.price-estimated` style |

**Files NOT changed:** `index.html`, `js/data.js`, `js/app.js`, `css/index.css`, `css/animations.css`

---

## Known Limitations After This Plan

- **Train prices** remain formula-based (no train price scraper exists)
- **Rate limiting** (30/hour) means optimizing for many cities in quick succession may exhaust the budget — the formula fallback handles this gracefully
- **Scraper fragility** — Google Flights and Kayak change their DOM. When selectors break, the backend returns null and formula fallback kicks in silently. The v2 README acknowledges this technical debt.
- **No persistent cache** — server restart resets the 15-minute cache. A future improvement would use Redis or SQLite.
