/* ═══════════════════════════════════════════════════════════════
   HODOPHILE — Optimization Engine
   Multi-origin, multi-modal travel cost optimization
   
   Agent Architecture:
   1. Scout Agent (per traveler) — Finds routes to each destination
   2. Matchmaker Agent — Finds overlapping date/city/cost combos
   3. Neighborhood Scout — Scores neighborhoods by preferences
   4. Route Optimizer — Applies multi-modal rules and gateway logic
   ═══════════════════════════════════════════════════════════════ */

class HodophileEngine {
    constructor() {
        this.data = window.HODOPHILE_DATA;
        this.listeners = {};
        // Set to true when the Python backend is running on localhost:8000
        this.useRealFlights = false;
        this.backendUrl = 'http://localhost:8000';
    }

    // ─── Real Flight Price Fetch (fli / Google Flights backend) ───
    // Returns { price, duration_minutes, airline, stops } or null on failure.
    // On null the caller falls back to the built-in simulation model.
    async fetchRealFlightPrice(originCode, destCode, date) {
        if (!this.useRealFlights) return null;
        try {
            const url = `${this.backendUrl}/api/flights?origin=${originCode}&dest=${destCode}&date=${date}`;
            const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (!resp.ok) return null;
            const data = await resp.json();
            if (!data.found) return null;
            return {
                price: Math.round(data.cheapest_price),
                duration_minutes: data.cheapest_duration_minutes,
                airline: data.cheapest_airline,
                stops: data.cheapest_stops,
            };
        } catch {
            return null; // network error or timeout — use simulation
        }
    }

    // ─── Check backend connectivity ───
    async checkBackend() {
        try {
            const resp = await fetch(`${this.backendUrl}/health`, {
                signal: AbortSignal.timeout(2000),
            });
            const data = await resp.json();
            this.useRealFlights = data.status === 'ok';
            return this.useRealFlights;
        } catch {
            this.useRealFlights = false;
            return false;
        }
    }

    // ─── Event Emitter ───
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MAIN OPTIMIZATION PIPELINE
    // ═══════════════════════════════════════════════════════════
    async optimize(config) {
        const { travelers, tripDate, returnDate, duration, budget, accommodationType, preferences, targetCities, reviewScore, priceLimit } = config;

        // Validate inputs
        const errors = this.validateInputs(config);
        if (errors.length > 0) {
            return { success: false, errors };
        }

        // Probe backend — enables real prices if available, silently skips if not
        await this.checkBackend();

        // Determine candidate destinations
        const candidates = targetCities.length > 0
            ? targetCities
            : Object.keys(this.data.cities);

        // STAGE 0: Generate Windows
        const windows = this.generatePossibleWindows(tripDate, returnDate, duration);
        const nights = duration;

        // ── STAGE 1: Scout Agents ──
        this.emit('stage', { stage: 'scout', status: 'active' });
        await this.simulateDelay(800);

        const scoutResults = {};
        for (const destKey of candidates) {
            // Optimization: For each destination, we want to find the BEST window.
            // In a real app we'd search APIs for all windows, here we simulate finding the best one.
            let bestDestResult = null;
            let minDestCost = Infinity;

            for (const win of windows) {
                const res = await this.scoutAgent(travelers, destKey, win.start, win.end);
                if (res && res.allFeasible) {
                    const travelCost = res.routes.reduce((sum, r) => sum + r.totalCost, 0);
                    if (travelCost < minDestCost) {
                        minDestCost = travelCost;
                        bestDestResult = { ...res, window: win };
                    }
                }
            }
            scoutResults[destKey] = bestDestResult;
        }
        this.emit('stage', { stage: 'scout', status: 'complete' });

        // ── STAGE 2: Matchmaker Agent ──
        this.emit('stage', { stage: 'match', status: 'active' });
        await this.simulateDelay(600);

        const costMatrix = this.matchmakerAgent(scoutResults, accommodationType, nights, budget);
        this.emit('stage', { stage: 'match', status: 'complete' });

        // ── STAGE 3: Neighborhood Scout ──
        this.emit('stage', { stage: 'neighborhood', status: 'active' });
        await this.simulateDelay(500);

        const neighborhoodScores = this.neighborhoodScout(candidates, preferences);
        this.emit('stage', { stage: 'neighborhood', status: 'complete' });

        // ── STAGE 4: Route Optimizer ──
        this.emit('stage', { stage: 'optimize', status: 'active' });
        await this.simulateDelay(700);

        const recommendations = this.routeOptimizer(
            costMatrix, neighborhoodScores, travelers,
            tripDate, returnDate, nights, accommodationType, budget,
            { reviewScore, priceLimit }
        );
        this.emit('stage', { stage: 'optimize', status: 'complete' });

        return {
            success: true,
            recommendations,
            metadata: {
                searchedCities: candidates.length,
                searchedRoutes: candidates.length * travelers.length * windows.length,
                optimizedAt: new Date().toISOString()
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT 1: SCOUT AGENT
    // Searches routes for each traveler to each destination
    // ═══════════════════════════════════════════════════════════
    async scoutAgent(travelers, destKey, tripDate, returnDate) {
        const dest = this.data.cities[destKey];
        if (!dest) return null;

        const routes = await Promise.all(travelers.map(async traveler => {
            const originKey = this.findCityKey(traveler.origin);
            if (!originKey) {
                return {
                    traveler: traveler.name,
                    error: `City "${traveler.origin}" not found`,
                    feasible: false
                };
            }

            const origin = this.data.cities[originKey];
            const distance = haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);

            // Check same-city scenario
            if (originKey === destKey) {
                return {
                    traveler: traveler.name,
                    origin: origin.name,
                    destination: dest.name,
                    route: `${origin.name} (Local)`,
                    segments: [{ type: "local", from: origin.name, to: dest.name, cost: 0, duration: 0 }],
                    totalCost: 0,
                    totalDuration: 0,
                    arrivalTime: "N/A",
                    feasible: true,
                    bookingLink: null
                };
            }

            // Apply multi-modal rule (now async — may call real API)
            const routeOptions = await this.findRoutes(origin, originKey, dest, destKey, distance, traveler, tripDate);

            // Filter by time constraints, max transfers, max layover
            const feasibleRoutes = routeOptions.filter(r => {
                if (!r.feasible) return false;
                if (!this.checkTimeConstraints(r, traveler)) return false;
                // Max transfers filter
                if (traveler.maxTransfers !== undefined && traveler.maxTransfers !== null && traveler.maxTransfers !== '') {
                    if ((r.transfers || 0) > parseInt(traveler.maxTransfers)) return false;
                }
                // Max layover filter (in minutes)
                if (traveler.maxLayover !== undefined && traveler.maxLayover !== null && traveler.maxLayover !== '') {
                    const maxLayoverMins = parseInt(traveler.maxLayover) * 60;
                    if (r.totalDuration > maxLayoverMins) return false;
                }
                return true;
            });

            if (feasibleRoutes.length === 0) {
                return {
                    traveler: traveler.name,
                    origin: origin.name,
                    destination: dest.name,
                    error: `No feasible routes within time constraints`,
                    feasible: false,
                    timeConstraint: traveler.timeConstraint
                };
            }

            // Return cheapest feasible route
            feasibleRoutes.sort((a, b) => a.totalCost - b.totalCost);
            return feasibleRoutes[0];
        }));

        return {
            destination: destKey,
            window: { start: tripDate, end: returnDate },
            routes,
            allFeasible: routes.every(r => r.feasible)
        };
    }

    // ─── Find Routes (Multi-Modal) ───
    // Now async: attempts real Google Flights price via backend, falls back to simulation.
    async findRoutes(origin, originKey, dest, destKey, distance, traveler, tripDate) {
        const routes = [];
        const dateISO = tripDate; // Already YYYY-MM-DD format

        // Try real price from backend (fli / Google Flights); null = use simulation
        const realFlight = await this.fetchRealFlightPrice(
            origin.airports[0], dest.airports[0], dateISO
        );

        const baseFlightPrice = this.estimateFlightPrice(distance);
        const baseTrainPrice = this.estimateTrainPrice(distance);

        // Direct Flight — use real price when available, else simulated
        const directFlightCost = realFlight
            ? realFlight.price
            : baseFlightPrice + Math.floor(Math.random() * 40) - 20;
        const directFlightDuration = realFlight
            ? realFlight.duration_minutes
            : Math.round(distance / 700 * 60 + 45);
        const realAirlineLabel = realFlight ? ` (${realFlight.airline})` : '';
        const priceSource = realFlight ? '🟢 Live' : '⚪ Est.';
        const flightArrival = this.calculateArrival(traveler.departureTime || "08:00", directFlightDuration);

        routes.push({
            traveler: traveler.name,
            origin: origin.name,
            destination: dest.name,
            route: `${origin.name} → ${dest.name} (✈️ Flight${realAirlineLabel}) [${priceSource}]`,
            routeShort: `${origin.name} → ${dest.name}`,
            mode: "flight",
            transfers: realFlight ? realFlight.stops : 0,
            priceSource,
            segments: [{
                type: "flight",
                from: origin.name,
                to: dest.name,
                cost: directFlightCost,
                duration: directFlightDuration,
                airport: origin.airports[0],
                bookingLink: this.data.bookingLinks.flight(
                    origin.airports[0], dest.airports[0], dateISO
                )
            }],
            totalCost: directFlightCost,
            totalDuration: directFlightDuration,
            arrivalTime: flightArrival,
            feasible: true,
            bookingLink: this.data.bookingLinks.flight(
                origin.airports[0], dest.airports[0], dateISO
            )
        });

        // Train (if distance < 1000km)
        if (distance < 1000 && origin.trainStations && dest.trainStations) {
            const trainDuration = Math.round(distance / 180 * 60 + 20);
            const trainArrival = this.calculateArrival(traveler.departureTime || "08:00", trainDuration);

            routes.push({
                traveler: traveler.name,
                origin: origin.name,
                destination: dest.name,
                route: `${origin.name} → ${dest.name} (🚄 Train)`,
                routeShort: `${origin.name} → ${dest.name}`,
                mode: "train",
                transfers: 0,
                segments: [{
                    type: "train",
                    from: origin.name,
                    to: dest.name,
                    cost: baseTrainPrice,
                    duration: trainDuration,
                    bookingLink: this.data.bookingLinks.train(
                        origin.name, dest.name, dateISO
                    )
                }],
                totalCost: baseTrainPrice,
                totalDuration: trainDuration,
                arrivalTime: trainArrival,
                feasible: true,
                bookingLink: this.data.bookingLinks.train(
                    origin.name, dest.name, dateISO
                )
            });
        }

        // Gateway Airports (Secondary Search)
        const gateways = this.data.gatewayAirports[destKey] || [];
        for (const gw of gateways) {
            const gwFlightCost = Math.round(baseFlightPrice * 0.65) + Math.floor(Math.random() * 20);
            const gwFlightDuration = Math.round(distance / 700 * 60 + 30);
            const totalGWCost = gwFlightCost + gw.trainCost;
            const totalGWDuration = gwFlightDuration + gw.trainTime;
            const gwArrival = this.calculateArrival(traveler.departureTime || "08:00", totalGWDuration);

            routes.push({
                traveler: traveler.name,
                origin: origin.name,
                destination: dest.name,
                route: `${origin.name} → ${gw.city} (✈️) → ${dest.name} (🚄 Train)`,
                routeShort: `${origin.name} → ${gw.city} → ${dest.name}`,
                mode: "multi-modal",
                transfers: 1,
                segments: [
                    {
                        type: "flight",
                        from: origin.name,
                        to: gw.city,
                        cost: gwFlightCost,
                        duration: gwFlightDuration,
                        airport: gw.airport,
                        bookingLink: this.data.bookingLinks.flight(
                            origin.airports[0], gw.airport, dateISO
                        )
                    },
                    {
                        type: "train",
                        from: gw.city,
                        to: dest.name,
                        cost: gw.trainCost,
                        duration: gw.trainTime,
                        bookingLink: this.data.bookingLinks.train(
                            gw.city, dest.name, dateISO
                        )
                    }
                ],
                totalCost: totalGWCost,
                totalDuration: totalGWDuration,
                arrivalTime: gwArrival,
                feasible: true,
                bookingLink: this.data.bookingLinks.flight(
                    origin.airports[0], gw.airport, dateISO
                )
            });
        }

        // Apply Multi-Modal Rule:
        // Prefer train over flight for <500km if price diff < €50
        if (distance < 500) {
            const cheapestFlight = routes.filter(r => r.mode === "flight").sort((a, b) => a.totalCost - b.totalCost)[0];
            const cheapestTrain = routes.filter(r => r.mode === "train").sort((a, b) => a.totalCost - b.totalCost)[0];

            if (cheapestFlight && cheapestTrain) {
                const priceDiff = cheapestTrain.totalCost - cheapestFlight.totalCost;
                if (priceDiff <= 50) {
                    // Favor train: give it a small cost bonus
                    cheapestTrain.preferred = true;
                    cheapestTrain.preferReason = "🚄 Train preferred for <500km (price diff ≤€50)";
                }
            }
        }

        return routes;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT 2: MATCHMAKER AGENT
    // Builds cost matrix and finds optimal combinations
    // ═══════════════════════════════════════════════════════════
    matchmakerAgent(scoutResults, accommodationType, nights, maxBudget) {
        const matrix = {};

        for (const [destKey, result] of Object.entries(scoutResults)) {
            if (!result || !result.allFeasible) continue;

            const travelCost = result.routes.reduce((sum, r) => sum + r.totalCost, 0);
            const numTravelers = result.routes.length;

            // Calculate accommodation cost
            const accommBase = this.data.accommodationPricing[accommodationType];
            const multiplier = this.data.cityPriceMultiplier[destKey] || 1.0;
            const perPersonPerNight = Math.round(
                (accommBase.min + (accommBase.max - accommBase.min) * 0.5) * multiplier
            );
            const totalAccomm = perPersonPerNight * nights * numTravelers;

            const totalGroupCost = travelCost + totalAccomm;
            const perPersonTotal = Math.round(totalGroupCost / numTravelers);

            matrix[destKey] = {
                destination: this.data.cities[destKey].name,
                travelCost,
                accommodationCostTotal: totalAccomm,
                accommodationPerPersonPerNight: perPersonPerNight,
                totalGroupCost,
                perPersonTotal,
                nights,
                routes: result.routes,
                window: result.window,
                withinBudget: !maxBudget || perPersonTotal <= maxBudget
            };
        }

        return matrix;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT 3: NEIGHBORHOOD SCOUT
    // Scores neighborhoods based on user preferences
    // ═══════════════════════════════════════════════════════════
    neighborhoodScout(candidates, preferences) {
        const scores = {};

        for (const destKey of candidates) {
            const city = this.data.cities[destKey];
            if (!city || !city.neighborhoods) continue;

            const rankedNeighborhoods = city.neighborhoods.map(n => {
                let score = 0;
                let factors = 0;

                // Base scores (always considered)
                score += n.vibe * 1.5;
                score += n.walkability * 1.2;
                score += n.safety * 1.0;
                score += n.transit * 0.8;
                factors += 4.5;

                // Preference bonuses
                if (preferences.includes('walkable')) { score += n.walkability * 0.5; factors += 0.5; }
                if (preferences.includes('nightlife')) { score += n.nightlife * 0.5; factors += 0.5; }
                if (preferences.includes('food')) { score += n.food * 0.5; factors += 0.5; }
                if (preferences.includes('safe')) { score += n.safety * 0.5; factors += 0.5; }
                if (preferences.includes('culture')) { score += n.vibe * 0.3; factors += 0.3; }

                const normalizedScore = Math.round((score / factors) * 10) / 10;

                return {
                    ...n,
                    score: normalizedScore,
                    isPerfectSpot: normalizedScore >= 8.5,
                    transitMinutes: Math.round(30 + Math.random() * 20) // Simulated transit time
                };
            });

            // Sort by score, filter out those >50min transit
            rankedNeighborhoods.sort((a, b) => b.score - a.score);
            const filtered = rankedNeighborhoods.filter(n => n.transitMinutes <= 50);

            scores[destKey] = {
                bestNeighborhood: filtered[0] || rankedNeighborhoods[0],
                allNeighborhoods: rankedNeighborhoods,
                hasPerfectSpot: filtered.some(n => n.isPerfectSpot)
            };
        }

        return scores;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT 4: ROUTE OPTIMIZER
    // Combines all data and produces final ranked recommendations
    // ═══════════════════════════════════════════════════════════
    routeOptimizer(costMatrix, neighborhoodScores, travelers, tripDate, returnDate, nights, accommodationType, budget, extraOpts = {}) {
        const recommendations = [];

        for (const [destKey, costData] of Object.entries(costMatrix)) {
            const neighborhood = neighborhoodScores[destKey];
            if (!neighborhood) continue;

            const bestHood = neighborhood.bestNeighborhood;

            // Calculate recommendation score (0-10)
            const costScore = this.calculateCostScore(costData.perPersonTotal, budget);
            const neighborhoodScore = bestHood.score / 10;
            const perfectSpotBonus = neighborhood.hasPerfectSpot ? 0.5 : 0;
            const budgetCompliance = costData.withinBudget ? 1 : 0.7;

            const rawScore = (
                costScore * 0.35 +
                neighborhoodScore * 0.30 +
                budgetCompliance * 0.20 +
                perfectSpotBonus * 0.15
            ) * 10;

            const score = Math.round(Math.min(rawScore, 10) * 10) / 10;

            // Build booking links using the SPECIFIC window dates (not the flexible range)
            const windowStart = costData.window ? costData.window.start : tripDate;
            const windowEnd = costData.window ? costData.window.end : returnDate;
            const accommodationLink = this.data.bookingLinks.accommodation(
                this.data.cities[destKey].name,
                windowStart,
                windowEnd,
                { reviewScore: extraOpts.reviewScore, priceLimit: extraOpts.priceLimit }
            );

            recommendations.push({
                recommendation_score: score,
                destination: this.data.cities[destKey].name,
                destinationKey: destKey,
                country: this.data.cities[destKey].country,
                neighborhood: bestHood.name,
                neighborhoodType: bestHood.type,
                neighborhoodScore: bestHood.score,
                isPerfectSpot: bestHood.isPerfectSpot,
                window: costData.window,
                travelers: costData.routes.map(r => ({
                    name: r.traveler,
                    route: r.route,
                    routeShort: r.routeShort || r.route,
                    segments: r.segments,
                    cost: r.totalCost,
                    duration: r.totalDuration,
                    arrival: r.arrivalTime,
                    mode: r.mode,
                    preferred: r.preferred || false,
                    preferReason: r.preferReason || null,
                    bookingLink: r.bookingLink
                })),
                accommodation: {
                    name: this.generateAccommodationName(bestHood, accommodationType),
                    price_per_person_per_night: costData.accommodationPerPersonPerNight,
                    total: costData.accommodationCostTotal,
                    nights: nights,
                    location_rating: bestHood.isPerfectSpot ? "Perfect Spot ✨" : "Great Location",
                    neighborhood: bestHood.name,
                    bookingLink: accommodationLink
                },
                total_travel_cost: costData.travelCost,
                total_accommodation_cost: costData.accommodationCostTotal,
                total_group_cost: costData.totalGroupCost,
                per_person_cost: costData.perPersonTotal,
                within_budget: costData.withinBudget,
                errors: costData.routes.filter(r => !r.feasible).map(r => r.error)
            });
        }

        // Sort by recommendation score (descending)
        recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);

        return recommendations;
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════

    validateInputs(config) {
        const errors = [];
        if (!config.travelers || config.travelers.length < 2) {
            errors.push("At least 2 travelers are required for group optimization.");
        }
        if (!config.tripDate) {
            errors.push("Departure date is required.");
        }
        if (!config.returnDate) {
            errors.push("Return date is required.");
        }
        if (config.tripDate && config.returnDate && new Date(config.tripDate) >= new Date(config.returnDate)) {
            errors.push("Return date must be after departure date.");
        }
        if (!config.duration || config.duration < 1) {
            errors.push("Please specify a valid trip duration (at least 1 night).");
        }
        if (config.travelers) {
            config.travelers.forEach((t, i) => {
                if (!t.origin || t.origin.trim() === '') {
                    errors.push(`Traveler ${i + 1} needs an origin city.`);
                }
            });
        }
        return errors;
    }

    findCityKey(name) {
        if (!name) return null;
        const normalized = name.toLowerCase().trim();

        // Direct match
        if (this.data.cities[normalized]) return normalized;

        // Name match
        for (const [key, city] of Object.entries(this.data.cities)) {
            if (city.name.toLowerCase() === normalized) return key;
            if (city.code && city.code.toLowerCase() === normalized) return key;
        }

        // Fuzzy match (starts with)
        for (const [key, city] of Object.entries(this.data.cities)) {
            if (city.name.toLowerCase().startsWith(normalized) ||
                key.startsWith(normalized)) return key;
        }

        // DYNAMIC ADDITION FOR "ANY CITY" REQUEST
        // If we still haven't found it, synthesize it on the fly
        const virtualKey = normalized.replace(/\s+/g, '_');
        this.data.cities[virtualKey] = this.data.synthesizeCity(name);
        return virtualKey;
    }

    calculateNights(checkin, checkout) {
        const d1 = new Date(checkin);
        const d2 = new Date(checkout);
        return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    }

    generatePossibleWindows(startDate, endDate, durationNights) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const windows = [];

        // Duration in days is durationNights + 1
        const durationMs = durationNights * 24 * 60 * 60 * 1000;

        // Loop through each day as a potential start date
        let current = new Date(start);
        while (new Date(current.getTime() + durationMs) <= end) {
            const winEnd = new Date(current.getTime() + durationMs);
            windows.push({
                start: current.toISOString().split('T')[0],
                end: winEnd.toISOString().split('T')[0]
            });
            current.setDate(current.getDate() + 1);
        }

        // Fallback if range is shorter than duration
        if (windows.length === 0) {
            windows.push({
                start: startDate,
                end: new Date(new Date(startDate).getTime() + durationMs).toISOString().split('T')[0]
            });
        }

        return windows;
    }

    estimateFlightPrice(distance) {
        // Rough price model for European flights
        if (distance < 500) return Math.round(35 + distance * 0.06);
        if (distance < 1000) return Math.round(45 + distance * 0.055);
        if (distance < 2000) return Math.round(55 + distance * 0.05);
        return Math.round(70 + distance * 0.04);
    }

    estimateTrainPrice(distance) {
        // Rough price model for European trains
        if (distance < 300) return Math.round(20 + distance * 0.08);
        if (distance < 500) return Math.round(30 + distance * 0.1);
        return Math.round(40 + distance * 0.12);
    }

    calculateArrival(departureTime, durationMinutes) {
        const [hours, mins] = departureTime.split(':').map(Number);
        const totalMins = hours * 60 + mins + durationMinutes;
        const arrHours = Math.floor(totalMins / 60) % 24;
        const arrMins = totalMins % 60;
        return `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
    }

    checkTimeConstraints(route, traveler) {
        // Check "no travel before" constraint
        if (traveler.noTravelBefore) {
            const [bh, bm] = traveler.noTravelBefore.split(':').map(Number);
            const [dh, dm] = (traveler.departureTime || "08:00").split(':').map(Number);
            if (dh * 60 + dm < bh * 60 + bm) return false;
        }

        // Check "arrive by" constraint
        if (traveler.arriveBy) {
            const [ah, am] = traveler.arriveBy.split(':').map(Number);
            const [rh, rm] = route.arrivalTime.split(':').map(Number);
            if (rh * 60 + rm > ah * 60 + am) return false;
        }

        return true;
    }

    calculateCostScore(cost, budget) {
        if (!budget) {
            // No budget set — score based on absolute cost
            if (cost < 100) return 1.0;
            if (cost < 200) return 0.8;
            if (cost < 300) return 0.6;
            if (cost < 500) return 0.4;
            return 0.2;
        }
        // Budget-relative scoring
        const ratio = cost / budget;
        if (ratio < 0.5) return 1.0;
        if (ratio < 0.7) return 0.85;
        if (ratio < 0.9) return 0.7;
        if (ratio <= 1.0) return 0.5;
        return 0.2;
    }

    generateAccommodationName(neighborhood, type) {
        const prefixes = {
            budget: ["Cozy", "Central", "Urban"],
            mid: ["City", "Modern", "Comfort"],
            boutique: ["Boutique", "Design", "Artisan"],
            luxury: ["Grand", "Royal", "Premium"]
        };
        const suffixes = {
            budget: ["Hostel", "Stay", "Backpackers"],
            mid: ["Hotel", "Inn", "Suites"],
            boutique: ["Hotel", "Residence", "Maison"],
            luxury: ["Palace", "Grand Hotel", "Resort"]
        };
        const prefix = prefixes[type][Math.floor(Math.random() * prefixes[type].length)];
        const suffix = suffixes[type][Math.floor(Math.random() * suffixes[type].length)];
        return `${prefix} ${neighborhood.name} ${suffix}`;
    }

    formatDateForBooking(dateStr) {
        // Return ISO YYYY-MM-DD format for booking links
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ─── Generate JSON Output (as per spec) ───
    toJSON(recommendation) {
        return {
            recommendation_score: recommendation.recommendation_score,
            destination: `${recommendation.destination}, ${recommendation.country}`,
            neighborhood: recommendation.neighborhood,
            travelers: recommendation.travelers.map(t => ({
                name: t.name,
                route: t.route,
                cost: t.cost,
                arrival: t.arrival,
                booking_link: t.bookingLink
            })),
            accommodation: {
                name: recommendation.accommodation.name,
                price_per_person: recommendation.accommodation.price_per_person_per_night,
                nights: recommendation.accommodation.nights,
                location_rating: recommendation.accommodation.location_rating,
                booking_link: recommendation.accommodation.bookingLink
            },
            total_group_cost: recommendation.total_group_cost,
            per_person_cost: recommendation.per_person_cost
        };
    }
}

// Make engine globally available
window.HodophileEngine = HodophileEngine;
