# Hodophile Travel Optimizer v2

Hodophile v2 is a multi-origin travel optimizer that finds the cheapest meeting point for a group of travelers departing from different cities. It uses Scrapling's StealthyFetcher (Camoufox-based) for resilient Google Flights scraping with Kayak fallback, calculates total group costs across destinations within a travel window, and generates direct booking links with correct dates.

## Architecture

The system provides dual standalone backend implementations: a Node.js Express server (`hodophile-server.js`) and a Python HTTP server (`server.py`). The Python backend uses Scrapling's StealthyFetcher — built on Camoufox with real Firefox fingerprints and automatic anti-bot bypass — replacing the previous fragile Playwright approach.
The frontend evaluates scraped flight data using a two-agent algorithmic system:
1. **The Matchmaker Agent:** Minimizes group costs by computing the absolute lowest flight prices and factors in base properties and living cost multipliers per city, calculating a true multi-variable "minimal setup".
2. **The Route Optimizer Agent:** Evaluates destinations via a weighted fitness function converting the cost minima to an objective score out of 10. The score combines Cost Effectiveness (40%), Neighborhood/Vibe Alignment (35%), and strict Budget Compliance (25%).

## Setup Instructions

Choose either the Python or Node.js environment depending on your preference.

**Python Backend (Recommended)**
```bash
pip install "scrapling[fetchers]"
scrapling install
```

**Node.js Backend**
```bash
npm install
npx playwright install chromium
```

## Usage Examples

1. **Start the backend:** Run `python server.py` or `node hodophile-server.js`.
2. **Access the application:** Open `http://localhost:3747` in your browser.
3. **Configure the trip:** 
   - Add at least two travelers and their origin cities/IATA codes.
   - Set the earliest departure date, latest return date, and acceptable trip length (min/max nights).
   - (Optional) Pin specific destination interests to prioritize them in the search.
4. **Search and Book:** Click the search button to initiate the live scraping protocol. Review the computed group minima and click the generated links to book the cheapest flights directly via Google Flights, Kayak, or Skyscanner.

## Recent Changes

### v0.4 — Scrapling Migration & URL Fix
*   **Why:** The Playwright-based scraper was broken — Google Flights changes its DOM selectors frequently, and Playwright's basic automation signals were being detected. Google Flights deep links were also using incorrect URL parameters (`departure_date`/`return_date`) that Google ignores.
*   **How:** Replaced the entire Playwright scraper engine with Scrapling's `StealthyFetcher`, which uses Camoufox (real Firefox fingerprints) with built-in anti-bot bypass. Added a multi-strategy price extraction pipeline (aria-label → text search → class patterns → JSON-LD). Fixed Google Flights URLs to use the correct `q=Flights+from+ORIG+to+DEST+on+YYYY-MM-DD+through+YYYY-MM-DD` format. Simplified the async pipeline to synchronous with ThreadPoolExecutor.
*   **Impact:** Scraper is significantly more resilient to DOM changes and anti-bot detection. Google Flights links now correctly pre-fill departure and return dates. Server startup is faster (no Chromium pre-warm needed). Graceful fallback to simulation mode if Scrapling isn't installed.

### v0.3 — Algorithmic Optimizer
*   **Why:** To transition the app from a simple cost aggregator to a true algorithmic travel planner that respects user budgets and preferences.
*   **How:** Engineered the Matchmaker and Route Optimizer agents directly into the logic loop. Handled constrained optimization variables via a fitness function: total flight costs + mapped accommodation multipliers + budget thresholds + vibe alignment.
*   **Impact:** Surfaces higher quality trips rather than purely cheap but potentially unappealing routes, converting a simple cost minima problem into a holistic 10-point recommendation system.

## Technical Debt Log

*   **Scraper Fragility (mitigated):** Scrapling's adaptive selectors and multi-strategy extraction significantly reduce maintenance overhead vs raw Playwright. However, Google may still change their page structure enough to break all strategies. Moving to an official API (e.g., SerpApi) would eliminate this entirely.
*   **Duplicated Stacks:** Maintaining feature parity between Node.js and Python backends doubles the engineering effort. The project should standardize on one primary stack.
*   **Rate Limits and Concurrency:** Massive combinatorial date searches can trigger IP bans. Proxy rotation (Scrapling supports this natively) and an asynchronous job queue are necessary for production scale.
*   **Ephemeral Caching:** Both backends use basic in-memory caching. Integrating a persistent store like SQLite or Redis would drastically speed up repeated searches and prevent data loss on server restarts.
