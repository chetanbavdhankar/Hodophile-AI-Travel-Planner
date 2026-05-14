/**
 * HODOPHILE SCRAPER BACKEND
 * ─────────────────────────
 * Node.js + Playwright scraper for Google Flights
 * Endpoint: GET /search?origin=WAW&dest=LIS&windowStart=2026-04-01&windowEnd=2026-04-30&minNights=3&maxNights=5
 * Returns:  { price, depart, return, nights }
 *
 * Install:
 *   npm install playwright express cors playwright-extra puppeteer-extra-plugin-stealth
 *   npx playwright install chromium
 *
 * Run:
 *   node hodophile-server.js
 */

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const { chromium } = require('playwright-extra');
const stealth   = require('puppeteer-extra-plugin-stealth');

// Apply stealth plugin — suppresses navigator.webdriver, canvas fp, etc.
chromium.use(stealth());

const app  = express();
const PORT = 3747;

// ─────────────────────────────────────────
// CORS — explicit config so file:// and
// any origin can reach the API during dev.
// ─────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// ─────────────────────────────────────────
// Serve v1 frontend (project root) at /
// css/, js/, index.html all served from ..
// Open: http://localhost:3747
// ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));


// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ status: 'ok', version: '0.2' });
});

// ─────────────────────────────────────────
// Browser pool — reuse a single browser
// instance across requests for speed.
// ─────────────────────────────────────────
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('[browser] Launching Chromium…');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-infobars',
        '--window-size=1440,900',
      ],
    });
    console.log('[browser] Ready.');
  }
  return browser;
}

// ─────────────────────────────────────────
// Random delay helper
// ─────────────────────────────────────────
const sleep = (min, max = min) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

// ─────────────────────────────────────────
// User-Agent rotation pool
// (real recent Chrome UAs)
// ─────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ─────────────────────────────────────────
// Date combo generator
// ─────────────────────────────────────────
function generateDateCombos(windowStart, windowEnd, minNights, maxNights) {
  const combos = [];
  const start  = new Date(windowStart);
  const end    = new Date(windowEnd);
  const MS     = 86400000;
  for (let dep = new Date(start); dep < end; dep = new Date(dep.getTime() + MS)) {
    for (let n = Number(minNights); n <= Number(maxNights); n++) {
      const ret = new Date(dep.getTime() + n * MS);
      if (ret > end) break;
      combos.push({
        depart: dep.toISOString().split('T')[0],
        return: ret.toISOString().split('T')[0],
        nights: n,
      });
    }
  }
  return combos;
}

// ─────────────────────────────────────────
// GOOGLE FLIGHTS SCRAPER
//
// Strategy: Use Google Flights' URL scheme
//  /travel/flights?q=flights+from+{O}+to+{D}&departure_date=YYYY-MM-DD&return_date=YYYY-MM-DD
// Wait for price elements to appear, extract cheapest.
//
// Anti-bot measures used:
//  1. playwright-extra stealth plugin
//  2. Randomised User-Agent per context
//  3. Randomised viewport
//  4. Random sleep between navigations
//  5. Simulate mouse movement before extraction
// ─────────────────────────────────────────
async function scrapeGoogleFlights(origin, dest, depart, returnDate) {
  const br   = await getBrowser();
  const ua   = randomUA();
  const vw   = 1280 + Math.floor(Math.random() * 320);
  const vh   = 800  + Math.floor(Math.random() * 200);

  const ctx  = await br.newContext({
    userAgent: ua,
    viewport:  { width: vw, height: vh },
    locale:    'en-US',
    timezoneId: 'Europe/London',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const page = await ctx.newPage();

  // Block images/fonts/media to speed up loading
  await page.route('**/*', route => {
    const type = route.request().resourceType();
    if (['image','font','media','stylesheet'].includes(type)) return route.abort();
    route.continue();
  });

  let price = null;

  try {
    const url = `https://www.google.com/travel/flights?q=flights+from+${origin}+to+${dest}`
              + `&departure_date=${depart}&return_date=${returnDate}&hl=en&curr=EUR`;

    console.log(`[scrape] ${origin}→${dest} ${depart}–${returnDate}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Random pause to look human
    await sleep(1500, 3500);

    // Simulate slight mouse movement
    await page.mouse.move(vw * 0.3 + Math.random() * 100, vh * 0.4 + Math.random() * 80);
    await sleep(300, 700);

    // Wait for price data — Google Flights renders prices in spans with aria-label containing "€"
    // or in elements with data-gs attribute. We try multiple selectors.
    const priceSelectors = [
      '[data-gs] span[aria-label*="€"]',      // structured price
      'span[aria-label*="euros"]',              // aria variant
      '.YMlIz span',                            // common class (may change)
      'div[role="listitem"] span.TpnT8b',      // result item price
    ];

    let priceText = null;

    for (const sel of priceSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 6000 });
        const els  = await page.$$(sel);
        const texts = await Promise.all(els.map(el => el.textContent()));
        // Extract numeric values from price strings like "€89", "EUR 89", etc.
        const nums = texts
          .map(t => t?.replace(/[^\d]/g, '').trim())
          .filter(t => t && t.length > 0 && t.length < 6)
          .map(Number)
          .filter(n => n > 10 && n < 10000);
        if (nums.length) {
          price = Math.min(...nums);
          console.log(`[scrape] ✓ ${origin}→${dest} ${depart}: €${price} (selector: ${sel})`);
          break;
        }
      } catch { /* selector not found, try next */ }
    }

    // Fallback: try meta/JSON-LD price
    if (!price) {
      const bodyText = await page.content();
      const match = bodyText.match(/"price"\s*:\s*"?(\d{2,5})"?/);
      if (match) { price = Number(match[1]); console.log(`[scrape] ✓ JSON-LD price: €${price}`); }
    }

    if (!price) {
      console.warn(`[scrape] ✗ No price found for ${origin}→${dest} ${depart}`);
    }

  } catch(e) {
    console.error(`[scrape] Error ${origin}→${dest}: ${e.message}`);
  } finally {
    await ctx.close();
  }

  return price;
}

// ─────────────────────────────────────────
// KAYAK FALLBACK SCRAPER
// Used when Google Flights returns no price
// ─────────────────────────────────────────
async function scrapeKayak(origin, dest, depart, returnDate) {
  const br  = await getBrowser();
  const ctx = await br.newContext({
    userAgent: randomUA(),
    viewport:  { width: 1366, height: 768 },
    locale:    'en-US',
  });
  const page = await ctx.newPage();

  await page.route('**/*', route => {
    if (['image','font','media'].includes(route.request().resourceType())) return route.abort();
    route.continue();
  });

  let price = null;

  try {
    const depK = depart.replace(/-/g,'');
    const retK = returnDate.replace(/-/g,'');
    const url  = `https://www.kayak.com/flights/${origin}-${dest}/${depK}/${retK}?sort=price_a&fs=stops=0`;

    console.log(`[kayak] ${origin}→${dest} ${depart}–${returnDate}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000, 4000);

    // Kayak price selectors
    const selectors = [
      '.price-text', '.Base-Results-HorizonResult .price-text',
      '[class*="price"] .actual', 'span[data-testid="price-value"]',
    ];

    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        const els   = await page.$$(sel);
        const texts = await Promise.all(els.map(e => e.textContent()));
        const nums  = texts.map(t => Number(t?.replace(/[^\d]/g,''))).filter(n => n > 10 && n < 10000);
        if (nums.length) { price = Math.min(...nums); break; }
      } catch {}
    }
  } catch(e) {
    console.error(`[kayak] ${e.message}`);
  } finally {
    await ctx.close();
  }
  return price;
}

// ─────────────────────────────────────────
// RATE LIMITER — simple in-memory
// ─────────────────────────────────────────
const requestLog = new Map();   // ip → timestamps[]
const RATE_LIMIT = 30;          // max requests per hour per IP
const RATE_WINDOW = 3600000;    // 1 hour in ms

function isRateLimited(ip) {
  const now    = Date.now();
  const times  = (requestLog.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  requestLog.set(ip, [...times, now]);
  return times.length >= RATE_LIMIT;
}

// ─────────────────────────────────────────
// In-memory cache: key → { result, ts }
// ─────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;   // 15 minutes

function cacheKey(origin, dest, depart, returnDate) {
  return `${origin}-${dest}-${depart}-${returnDate}`;
}
function fromCache(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.result;
  return null;
}
function toCache(key, result) {
  cache.set(key, { result, ts: Date.now() });
  // Evict old entries every 1000 items
  if (cache.size > 1000) {
    const cutoff = Date.now() - CACHE_TTL;
    for (const [k, v] of cache) { if (v.ts < cutoff) cache.delete(k); }
  }
}

// ─────────────────────────────────────────
// MAIN SEARCH ENDPOINT
//
// For each valid (depart, return) combo in
// the window, fetch/cache the price.
// Return the cheapest combo found.
// ─────────────────────────────────────────
app.get('/search', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 searches/hour.' });
  }

  const { origin, dest, windowStart, windowEnd, minNights = 3, maxNights = 5 } = req.query;

  if (!origin || !dest || !windowStart || !windowEnd) {
    return res.status(400).json({ error: 'origin, dest, windowStart, windowEnd are required' });
  }
  if (origin === dest) {
    return res.status(400).json({ error: 'origin and dest must differ' });
  }

  const combos = generateDateCombos(windowStart, windowEnd, minNights, maxNights);
  if (!combos.length) {
    return res.status(400).json({ error: 'No valid date combos in window. Widen dates or nights.' });
  }

  console.log(`\n[search] ${origin}→${dest} | ${windowStart}–${windowEnd} | ${minNights}–${maxNights}n | ${combos.length} combos`);

  let found_combos = [];

  for (const combo of combos) {
    const key    = cacheKey(origin, dest, combo.depart, combo.return);
    let   cached = fromCache(key);

    if (!cached) {
      // Try Google Flights first, then Kayak as fallback
      let price = await scrapeGoogleFlights(origin, dest, combo.depart, combo.return);

      if (!price) {
        console.log(`[search] Falling back to Kayak for ${combo.depart}`);
        price = await scrapeKayak(origin, dest, combo.depart, combo.return);
      }

      if (!price) {
        // Both scrapers failed — skip this combo
        await sleep(500, 1200);
        continue;
      }

      cached = { price, depart: combo.depart, return: combo.return, nights: combo.nights };
      toCache(key, cached);

      // Polite delay between scrapes
      await sleep(800, 2000);
    } else {
      console.log(`[cache] hit ${key}: €${cached.price}`);
    }

    found_combos.push(cached);
  }

  if (!found_combos.length) {
    return res.status(404).json({ error: 'No prices found for this route/window combination.' });
  }

  res.json(found_combos);
});

// ─────────────────────────────────────────
// Cache stats (debug endpoint)
// ─────────────────────────────────────────
app.get('/cache-stats', (_, res) => {
  res.json({ entries: cache.size, maxTTL: `${CACHE_TTL/60000} min` });
});

// ─────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[shutdown] Closing browser…');
  if (browser) await browser.close();
  process.exit(0);
});

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   Hodophile Scraper Backend v0.2         ║`);
  console.log(`║                                          ║`);
  console.log(`║   Open in browser:                       ║`);
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log(`║                                          ║`);
  console.log(`║   ⚠  Do NOT open hodophile.html directly ║`);
  console.log(`║      as a file — use the URL above.      ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
  // Pre-warm browser
  await getBrowser();
  console.log('[ready] Waiting for search requests…\n');
});