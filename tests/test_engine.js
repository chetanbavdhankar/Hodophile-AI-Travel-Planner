/**
 * Hodophile Engine Unit Tests (Node.js)
 *
 * Tests the optimization engine logic without a browser.
 * Mocks window globals and runs specific group travel scenarios.
 *
 * Run with:  node tests/test_engine.js
 */

// ── Mock browser globals ──────────────────────────────────────────────────────
global.window = {};

// Load data and engine
const fs = require('fs');
const path = require('path');

eval(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../js/engine.js'), 'utf8'));

// Expose globals set via window.* during eval
const HodophileEngine = window.HodophileEngine;

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    } else {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    }
}

async function runTest(name, fn) {
    console.log(`\n▶  ${name}`);
    try {
        await fn();
    } catch (e) {
        console.error(`  ❌ ERROR: ${e.message}`);
        failed++;
    }
}

// ── Scenario 1: Classic 3-traveler group search ───────────────────────────────
// Alice (London), Bob (Berlin), Charlie (Madrid) → best European meeting point
async function testGroupSearch() {
    const engine = new HodophileEngine();
    engine.useRealFlights = false; // use simulation for deterministic tests

    const result = await engine.optimize({
        travelers: [
            { name: 'Alice', origin: 'London', departureTime: '08:00' },
            { name: 'Bob',   origin: 'Berlin', departureTime: '08:00' },
            { name: 'Charlie', origin: 'Madrid', departureTime: '08:00' }
        ],
        tripDate:   '2026-07-10',
        returnDate: '2026-07-14',
        duration: 3,
        budget: 400,
        accommodationType: 'mid',
        preferences: ['food', 'walkable'],
        targetCities: ['paris', 'amsterdam', 'rome', 'barcelona', 'prague'],
        reviewScore: null,
        priceLimit: null
    });

    assert(result.success === true, 'Optimization succeeded');
    assert(Array.isArray(result.recommendations), 'Returns recommendations array');
    assert(result.recommendations.length > 0, 'Has at least one recommendation');

    const top = result.recommendations[0];
    assert(typeof top.recommendation_score === 'number', 'Top rec has a score');
    assert(top.recommendation_score >= 0 && top.recommendation_score <= 10, 'Score is 0–10');
    assert(Array.isArray(top.travelers), 'Top rec has travelers array');
    assert(top.travelers.length === 3, 'All 3 travelers have routes');
    assert(top.travelers.every(t => typeof t.cost === 'number'), 'Each traveler has a cost');
    assert(typeof top.per_person_cost === 'number' && top.per_person_cost > 0, 'Per-person cost is positive');
    assert(typeof top.destination === 'string' && top.destination.length > 0, 'Destination name exists');

    console.log(`     Top destination: ${top.destination} (score: ${top.recommendation_score})`);
    console.log(`     Per person: €${top.per_person_cost}`);
    console.log(`     Neighborhood: ${top.neighborhood}`);
    result.recommendations.slice(0, 3).forEach((r, i) => {
        console.log(`     [${i+1}] ${r.destination} — €${r.per_person_cost}/person — score ${r.recommendation_score}`);
    });
}

// ── Scenario 2: Two-traveler weekend trip ──────────────────────────────────────
async function testTwoTravelerWeekend() {
    const engine = new HodophileEngine();
    engine.useRealFlights = false;

    const result = await engine.optimize({
        travelers: [
            { name: 'Alice', origin: 'Paris',     departureTime: '09:00' },
            { name: 'Bob',   origin: 'Amsterdam',  departureTime: '09:00' }
        ],
        tripDate:   '2026-08-01',
        returnDate: '2026-08-03',
        duration: 2,
        budget: 250,
        accommodationType: 'budget',
        preferences: ['nightlife'],
        targetCities: ['berlin', 'prague', 'brussels', 'london'],
        reviewScore: null,
        priceLimit: null
    });

    assert(result.success === true, 'Two-traveler search succeeded');
    assert(result.recommendations.length > 0, 'Has recommendations');
    const top = result.recommendations[0];
    assert(top.travelers.length === 2, 'Both travelers have routes');
    console.log(`     Top: ${top.destination} — €${top.per_person_cost}/person`);
}

// ── Scenario 3: Same-city traveler (edge case) ────────────────────────────────
async function testSameCityTraveler() {
    const engine = new HodophileEngine();
    engine.useRealFlights = false;

    const result = await engine.optimize({
        travelers: [
            { name: 'Alice', origin: 'Rome', departureTime: '08:00' },
            { name: 'Bob',   origin: 'London', departureTime: '08:00' }
        ],
        tripDate:   '2026-09-05',
        returnDate: '2026-09-08',
        duration: 3,
        budget: null,
        accommodationType: 'boutique',
        preferences: [],
        targetCities: ['rome'], // Alice is local
        reviewScore: null,
        priceLimit: null
    });

    assert(result.success === true, 'Same-city scenario handled');
    if (result.recommendations.length > 0) {
        const top = result.recommendations[0];
        const alice = top.travelers.find(t => t.name === 'Alice');
        assert(alice !== undefined, 'Alice appears in results');
        assert(alice.cost === 0 || alice.route.includes('Local'), 'Alice has zero travel cost (local)');
        console.log(`     Alice's route: ${alice.route} — €${alice.cost}`);
    }
}

// ── Scenario 4: Budget constraint filtering ───────────────────────────────────
async function testBudgetFiltering() {
    const engine = new HodophileEngine();
    engine.useRealFlights = false;

    const result = await engine.optimize({
        travelers: [
            { name: 'Alice', origin: 'London', departureTime: '08:00' },
            { name: 'Bob',   origin: 'Berlin', departureTime: '08:00' }
        ],
        tripDate:   '2026-07-20',
        returnDate: '2026-07-23',
        duration: 3,
        budget: 150, // very tight
        accommodationType: 'budget',
        preferences: [],
        targetCities: ['prague', 'budapest', 'krakow', 'warsaw'],
        reviewScore: null,
        priceLimit: null
    });

    assert(result.success === true, 'Budget filtering search succeeded');
    if (result.recommendations.length > 0) {
        const withinBudget = result.recommendations.filter(r => r.within_budget);
        console.log(`     ${withinBudget.length}/${result.recommendations.length} destinations within €150 budget`);
        // Best recommendation should ideally be within budget if any exist
        if (withinBudget.length > 0) {
            assert(result.recommendations[0].within_budget, 'Top recommendation is within budget when budget options exist');
        }
    }
}

// ── Scenario 5: Time constraint enforcement ───────────────────────────────────
async function testTimeConstraints() {
    const engine = new HodophileEngine();
    engine.useRealFlights = false;

    const result = await engine.optimize({
        travelers: [
            { name: 'Alice', origin: 'London', departureTime: '14:00', arriveBy: '20:00' },
            { name: 'Bob',   origin: 'Berlin', departureTime: '14:00', arriveBy: '20:00' }
        ],
        tripDate:   '2026-10-01',
        returnDate: '2026-10-04',
        duration: 3,
        budget: null,
        accommodationType: 'mid',
        preferences: [],
        targetCities: ['paris', 'amsterdam', 'munich', 'prague'],
        reviewScore: null,
        priceLimit: null
    });

    assert(result.success === true, 'Time-constrained search ran');
    if (result.recommendations.length > 0) {
        result.recommendations[0].travelers.forEach(t => {
            if (t.arrival && t.arrival !== 'N/A') {
                const [h] = t.arrival.split(':').map(Number);
                assert(h <= 20, `${t.name} arrives by 20:00 (arrived ${t.arrival})`);
            }
        });
    }
}

// ── Scenario 6: Validate scoring range and sorting ───────────────────────────
async function testScoringAndSorting() {
    const engine = new HodophileEngine();
    engine.useRealFlights = false;

    const result = await engine.optimize({
        travelers: [
            { name: 'Alice', origin: 'London', departureTime: '08:00' },
            { name: 'Bob',   origin: 'Madrid', departureTime: '08:00' },
            { name: 'Charlie', origin: 'Berlin', departureTime: '08:00' }
        ],
        tripDate:   '2026-07-01',
        returnDate: '2026-07-05',
        duration: 4,
        budget: 500,
        accommodationType: 'mid',
        preferences: ['walkable', 'food', 'culture'],
        targetCities: [], // search all 27 cities
        reviewScore: null,
        priceLimit: null
    });

    assert(result.success === true, 'Full city search succeeded');
    assert(result.recommendations.length > 0, 'Has recommendations');
    assert(result.metadata.searchedCities >= 20, `Searched enough cities (got ${result.metadata.searchedCities})`);

    // Check scores are sorted descending
    for (let i = 1; i < result.recommendations.length; i++) {
        const prev = result.recommendations[i - 1].recommendation_score;
        const curr = result.recommendations[i].recommendation_score;
        assert(prev >= curr, `Recommendations sorted by score (${prev} >= ${curr})`);
        if (prev < curr) break; // stop after first failure to avoid noise
    }

    // All scores in valid range
    const allValid = result.recommendations.every(r =>
        r.recommendation_score >= 0 && r.recommendation_score <= 10
    );
    assert(allValid, 'All recommendation scores in 0–10 range');

    console.log(`     Searched ${result.metadata.searchedCities} cities`);
    console.log(`     Top 5 destinations:`);
    result.recommendations.slice(0, 5).forEach((r, i) => {
        console.log(`       [${i+1}] ${r.destination} — €${r.per_person_cost}/person — score ${r.recommendation_score}`);
    });
}

// ── Scenario 7: Input validation errors ───────────────────────────────────────
async function testInputValidation() {
    const engine = new HodophileEngine();

    // Only 1 traveler
    const r1 = await engine.optimize({
        travelers: [{ name: 'Solo', origin: 'London' }],
        tripDate: '2026-07-01', returnDate: '2026-07-04',
        duration: 3, budget: null, accommodationType: 'mid',
        preferences: [], targetCities: [], reviewScore: null, priceLimit: null
    });
    assert(r1.success === false, 'Rejects < 2 travelers');
    assert(Array.isArray(r1.errors) && r1.errors.length > 0, 'Returns error messages');

    // Missing tripDate
    const r2 = await engine.optimize({
        travelers: [
            { name: 'A', origin: 'London' },
            { name: 'B', origin: 'Berlin' }
        ],
        tripDate: null, returnDate: '2026-07-04',
        duration: 3, budget: null, accommodationType: 'mid',
        preferences: [], targetCities: [], reviewScore: null, priceLimit: null
    });
    assert(r2.success === false, 'Rejects missing tripDate');
}

// ── Main runner ───────────────────────────────────────────────────────────────
(async () => {
    console.log('\n═══ Hodophile Engine Tests ═══\n');

    await runTest('Scenario 1: Group of 3 (London/Berlin/Madrid)', testGroupSearch);
    await runTest('Scenario 2: Two-traveler weekend (Paris/Amsterdam)', testTwoTravelerWeekend);
    await runTest('Scenario 3: Same-city edge case (Rome local)', testSameCityTraveler);
    await runTest('Scenario 4: Tight budget filtering (€150)', testBudgetFiltering);
    await runTest('Scenario 5: Time constraint enforcement (arrive by 20:00)', testTimeConstraints);
    await runTest('Scenario 6: Scoring range & sort order (all 27 cities)', testScoringAndSorting);
    await runTest('Scenario 7: Input validation errors', testInputValidation);

    console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
    process.exit(failed === 0 ? 0 : 1);
})();
