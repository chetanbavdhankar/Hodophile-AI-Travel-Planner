/* ═══════════════════════════════════════════════════════════════
   HODOPHILE — UI Layer
   DOM manipulation, rendering, and user interactions
   ═══════════════════════════════════════════════════════════════ */

class HodophileUI {
    constructor(engine) {
        this.engine = engine;
        this.travelers = [];
        this.selectedCities = [];
        this.activePreferences = ['walkable', 'nightlife', 'safe'];
        this.travelerIdCounter = 0;

        this.initElements();
        this.initListeners();
        this.renderCitySelector();
        this.addTraveler(); // Start with 2 travelers
        this.addTraveler();
        this.setDefaultDates();
    }

    // ─── Initialize DOM References ───
    initElements() {
        this.el = {
            travelersList: document.getElementById('travelers-list'),
            btnAddTraveler: document.getElementById('btn-add-traveler'),
            btnOptimize: document.getElementById('btn-optimize'),
            btnDemoData: document.getElementById('btn-demo-data'),
            tripDateStart: document.getElementById('trip-date-start'),
            tripDateEnd: document.getElementById('trip-date-end'),
            budgetMax: document.getElementById('budget-max'),
            accommodationType: document.getElementById('accommodation-type'),
            citySelector: document.getElementById('city-selector'),
            prefTags: document.getElementById('pref-tags'),
            resultsEmpty: document.getElementById('results-empty'),
            resultsLoading: document.getElementById('results-loading'),
            resultsContent: document.getElementById('results-content'),
            ctaStart: document.getElementById('cta-start'),
            ctaDemo: document.getElementById('cta-demo'),
            citySearchInput: document.getElementById('city-search-input'),
            btnAddCustomCity: document.getElementById('btn-add-custom-city'),
            tripDuration: document.getElementById('trip-duration'),
            reviewScore: document.getElementById('review-score'),
            priceLimit: document.getElementById('price-limit'),
        };
    }

    // ─── Initialize Event Listeners ───
    initListeners() {
        this.el.btnAddTraveler.addEventListener('click', () => this.addTraveler());
        this.el.btnOptimize.addEventListener('click', () => this.runOptimization());
        this.el.btnDemoData.addEventListener('click', () => this.loadDemoData());
        this.el.ctaStart.addEventListener('click', () => {
            document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
        });
        this.el.ctaDemo.addEventListener('click', () => {
            this.loadDemoData();
            document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
        });

        // City search and add
        this.el.btnAddCustomCity.addEventListener('click', () => this.addCustomDestination());
        this.el.citySearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomDestination();
        });

        // Preference tags
        this.el.prefTags.addEventListener('click', (e) => {
            const tag = e.target.closest('.pref-tag');
            if (!tag) return;
            tag.classList.toggle('active');
            this.activePreferences = Array.from(
                this.el.prefTags.querySelectorAll('.pref-tag.active')
            ).map(t => t.dataset.pref);
        });

        // Engine events
        this.engine.on('stage', (data) => this.updateStage(data));
    }

    // ─── Set Default Dates ───
    setDefaultDates() {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 30);
        const end = new Date(start);
        end.setDate(start.getDate() + 3);

        this.el.tripDateStart.value = this.formatDate(start);
        this.el.tripDateEnd.value = this.formatDate(end);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // ═══════════════════════════════════════════════════════════
    // TRAVELER MANAGEMENT
    // ═══════════════════════════════════════════════════════════
    addTraveler(data = null) {
        const id = this.travelerIdCounter++;
        const colorIndex = id % HODOPHILE_DATA.avatarColors.length;
        const color = HODOPHILE_DATA.avatarColors[colorIndex];
        const name = data?.name || HODOPHILE_DATA.defaultNames[id % HODOPHILE_DATA.defaultNames.length];

        const traveler = {
            id,
            name: name,
            origin: data?.origin || '',
            departureTime: data?.departureTime || '08:00',
            noTravelBefore: data?.noTravelBefore || '',
            arriveBy: data?.arriveBy || '',
            maxTransfers: data?.maxTransfers ?? '',
            maxLayover: data?.maxLayover ?? '',
            color
        };
        this.travelers.push(traveler);
        this.renderTravelerCard(traveler);
    }

    removeTraveler(id) {
        if (this.travelers.length <= 2) {
            this.showToast('Minimum 2 travelers required', 'error');
            return;
        }
        this.travelers = this.travelers.filter(t => t.id !== id);
        const card = document.getElementById(`traveler-${id}`);
        if (card) {
            card.style.animation = 'fadeInUp 0.3s ease-out reverse forwards';
            setTimeout(() => card.remove(), 300);
        }
    }

    renderTravelerCard(traveler) {
        const card = document.createElement('div');
        card.className = 'traveler-card animate-scale-in';
        card.id = `traveler-${traveler.id}`;

        const cities = Object.values(HODOPHILE_DATA.cities).map(c => c.name);
        const cityOptions = cities.map(c => `<option value="${c}">${c}</option>`).join('');

        card.innerHTML = `
            <div class="traveler-card-header">
                <div class="traveler-card-header-left">
                    <div class="traveler-avatar" style="background: ${traveler.color}">
                        ${traveler.name.charAt(0).toUpperCase()}
                    </div>
                    <input type="text" 
                        class="traveler-name-input" 
                        value="${traveler.name}" 
                        data-id="${traveler.id}" 
                        data-field="name"
                        placeholder="Name"
                    >
                </div>
                <button class="btn-remove-traveler" data-id="${traveler.id}" title="Remove traveler">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="traveler-card-body">
                <div class="form-group" style="grid-column: 1 / -1">
                    <label>Origin City</label>
                    <input type="text" 
                        class="form-input form-input-sm" 
                        data-id="${traveler.id}" 
                        data-field="origin"
                        value="${traveler.origin}"
                        placeholder="Search for origin city..."
                        list="cities-list"
                    >
                </div>
                <div class="form-group">
                    <label>Depart After</label>
                    <input type="time" class="form-input form-input-sm" data-id="${traveler.id}" data-field="noTravelBefore" value="${traveler.noTravelBefore}">
                </div>
                <div class="form-group">
                    <label>Arrive By</label>
                    <input type="time" class="form-input form-input-sm" data-id="${traveler.id}" data-field="arriveBy" value="${traveler.arriveBy}">
                </div>
                <div class="form-group">
                    <label>Max Transfers</label>
                    <input type="number" class="form-input form-input-sm" data-id="${traveler.id}" data-field="maxTransfers" value="${traveler.maxTransfers}" placeholder="Any" min="0" max="3">
                </div>
                <div class="form-group">
                    <label>Max Travel (hrs)</label>
                    <input type="number" class="form-input form-input-sm" data-id="${traveler.id}" data-field="maxLayover" value="${traveler.maxLayover}" placeholder="Any" min="1" max="24">
                </div>
            </div>
            <datalist id="cities-list">
                ${Object.values(HODOPHILE_DATA.cities).map(c => `<option value="${c.name}">`).join('')}
            </datalist>
        `;

        // Set origin if provided
        if (traveler.origin) {
            const select = card.querySelector(`select[data-field="origin"]`);
            if (select) select.value = traveler.origin;
        }

        // Add event listeners
        card.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const field = e.target.dataset.field;
                const t = this.travelers.find(t => t.id === id);
                if (t) {
                    t[field] = e.target.value;
                    if (field === 'name') {
                        const avatar = card.querySelector('.traveler-avatar');
                        avatar.textContent = e.target.value.charAt(0).toUpperCase();
                    }
                }
            });
        });

        card.querySelector('.btn-remove-traveler').addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            this.removeTraveler(id);
        });

        this.el.travelersList.appendChild(card);
    }

    // ═══════════════════════════════════════════════════════════
    // CITY SELECTOR
    // ═══════════════════════════════════════════════════════════
    renderCitySelector() {
        const cities = Object.entries(HODOPHILE_DATA.cities).sort((a, b) => a[1].name.localeCompare(b[1].name));

        this.el.citySelector.innerHTML = cities.map(([key, city]) => `
            <button class="city-chip" data-city="${key}">${city.name}</button>
        `).join('');

        this.el.citySelector.addEventListener('click', (e) => {
            const chip = e.target.closest('.city-chip');
            if (!chip) return;
            const city = chip.dataset.city;
            chip.classList.toggle('selected');

            if (chip.classList.contains('selected')) {
                this.selectedCities.push(city);
            } else {
                this.selectedCities = this.selectedCities.filter(c => c !== city);
            }
        });
    }

    addCustomDestination() {
        const cityName = this.el.citySearchInput.value.trim();
        if (!cityName) return;

        // Check if already in our database
        let cityKey = null;
        for (const [key, city] of Object.entries(HODOPHILE_DATA.cities)) {
            if (city.name.toLowerCase() === cityName.toLowerCase()) {
                cityKey = key;
                break;
            }
        }

        // If not, synthesize a virtual city
        if (!cityKey) {
            const virtualCity = HODOPHILE_DATA.synthesizeCity(cityName);
            cityKey = cityName.toLowerCase().replace(/\s+/g, '_');
            HODOPHILE_DATA.cities[cityKey] = virtualCity;

            // Show toast for feedback
            this.showToast(`Added custom city: ${virtualCity.name}`, 'info');
        }

        // Add to selectedCities if not already there
        if (!this.selectedCities.includes(cityKey)) {
            this.selectedCities.push(cityKey);
        }

        // Re-render selector and clean up
        this.renderCitySelector();

        // Mark as selected in the UI
        const chip = this.el.citySelector.querySelector(`[data-city="${cityKey}"]`);
        if (chip) chip.classList.add('selected');

        this.el.citySearchInput.value = '';
    }

    // ═══════════════════════════════════════════════════════════
    // OPTIMIZATION
    // ═══════════════════════════════════════════════════════════
    async runOptimization() {
        const config = {
            travelers: this.travelers.map(t => ({
                name: t.name,
                origin: t.origin,
                departureTime: t.departureTime || '08:00',
                noTravelBefore: t.noTravelBefore || null,
                arriveBy: t.arriveBy || null,
                maxTransfers: t.maxTransfers !== '' ? t.maxTransfers : null,
                maxLayover: t.maxLayover !== '' ? t.maxLayover : null
            })),
            tripDate: this.el.tripDateStart.value,
            returnDate: this.el.tripDateEnd.value,
            duration: parseInt(this.el.tripDuration.value) || 3,
            budget: this.el.budgetMax.value ? parseInt(this.el.budgetMax.value) : null,
            accommodationType: this.el.accommodationType.value,
            preferences: this.activePreferences,
            targetCities: this.selectedCities,
            reviewScore: this.el.reviewScore && this.el.reviewScore.value ? parseFloat(this.el.reviewScore.value) : null,
            priceLimit: this.el.priceLimit && this.el.priceLimit.value ? parseInt(this.el.priceLimit.value) : null
        };

        // Show loading
        this.showLoading();

        try {
            const result = await this.engine.optimize(config);

            if (!result.success) {
                this.showErrors(result.errors);
                return;
            }

            this.renderResults(result);
        } catch (error) {
            console.error('Optimization failed:', error);
            this.showErrors([`Optimization failed: ${error.message}`]);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LOADING STATE
    // ═══════════════════════════════════════════════════════════
    showLoading() {
        this.el.resultsEmpty.style.display = 'none';
        this.el.resultsContent.style.display = 'none';
        this.el.resultsLoading.style.display = 'block';

        // Reset stages
        document.querySelectorAll('.stage').forEach(s => {
            s.classList.remove('active', 'complete');
        });

        // Disable optimize button
        const btn = this.el.btnOptimize;
        btn.querySelector('.btn-loader').style.display = 'inline-block';
        btn.querySelector('.btn-text').textContent = 'Optimizing...';
        btn.disabled = true;
    }

    hideLoading() {
        this.el.resultsLoading.style.display = 'none';

        const btn = this.el.btnOptimize;
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.querySelector('.btn-text').textContent = '🚀 Find Global Minimum';
        btn.disabled = false;
    }

    updateStage(data) {
        const stageMap = {
            'scout': 'stage-scout',
            'match': 'stage-match',
            'neighborhood': 'stage-neighborhood',
            'optimize': 'stage-optimize'
        };

        const el = document.getElementById(stageMap[data.stage]);
        if (!el) return;

        if (data.status === 'active') {
            el.classList.add('active');
            el.classList.remove('complete');
        } else if (data.status === 'complete') {
            el.classList.remove('active');
            el.classList.add('complete');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // RESULTS RENDERING
    // ═══════════════════════════════════════════════════════════
    renderResults(result) {
        this.hideLoading();

        if (result.recommendations.length === 0) {
            this.showErrors(["No feasible destinations found. Try relaxing time constraints or adding more cities."]);
            return;
        }

        const top = result.recommendations[0];
        const alternatives = result.recommendations.slice(1, 5);

        this.el.resultsContent.style.display = 'flex';
        this.el.resultsEmpty.style.display = 'none';

        this.el.resultsContent.innerHTML = `
            <!-- Result Header -->
            <div class="result-header animate-scale-in">
                <div class="result-score">
                    <div class="score-ring">
                        <span class="score-value">${top.recommendation_score}</span>
                    </div>
                    <div class="result-destination">${top.destination}</div>
                    <div class="result-neighborhood">
                        <span class="pin">📍</span>
                        ${top.neighborhood}
                        <span style="font-size: var(--text-xs); opacity: 0.7; margin-left: 4px;">(${top.neighborhoodType})</span>
                    </div>
                    ${top.isPerfectSpot ? '<div class="accommodation-badge" style="margin-top: 8px; display: inline-block;">✨ Perfect Spot</div>' : ''}
                </div>
                <!-- Selected Window Info -->
                <div class="result-window-info animate-fade-in-up">
                    <div class="window-dates">
                        <span>🗓️ Recommended Window:</span>
                        <strong>${top.window.start}</strong> — <strong>${top.window.end}</strong>
                    </div>
                </div>
            </div>

            <!-- Traveler Routes -->
            <div class="result-routes animate-fade-in-up delay-1">
                <h3 style="font-family: var(--font-display); font-size: var(--text-base); font-weight: 700; margin-bottom: var(--space-4); color: var(--color-text-secondary);">
                    👥 Traveler Routes
                </h3>
                ${top.travelers.map((t, i) => this.renderRouteCard(t, i)).join('')}
            </div>

            <!-- Accommodation -->
            <div class="result-accommodation animate-fade-in-up delay-2">
                <div class="accommodation-header">
                    <h3>🏨 ${top.accommodation.name}</h3>
                    <span class="accommodation-badge">${top.accommodation.location_rating}</span>
                </div>
                <div class="accommodation-details">
                    <div class="accommodation-detail">
                        <div class="accommodation-detail-value">€${top.accommodation.price_per_person_per_night}</div>
                        <div class="accommodation-detail-label">Per Person / Night</div>
                    </div>
                    <div class="accommodation-detail">
                        <div class="accommodation-detail-value">${top.accommodation.nights}</div>
                        <div class="accommodation-detail-label">Nights</div>
                    </div>
                    <div class="accommodation-detail">
                        <div class="accommodation-detail-value">€${top.accommodation.total}</div>
                        <div class="accommodation-detail-label">Total Accommodation</div>
                    </div>
                </div>
                <div class="accommodation-book">
                    <a href="${top.accommodation.bookingLink}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                        🔗 Search on Booking.com
                    </a>
                </div>
            </div>

            <!-- Total Cost -->
            <div class="result-total animate-fade-in-up delay-3">
                <div class="total-label">Total Group Cost</div>
                <div class="total-value">€${top.total_group_cost}</div>
                <div class="total-breakdown">
                    Travel: €${top.total_travel_cost} + Accommodation: €${top.total_accommodation_cost}
                    &nbsp;|&nbsp; €${top.per_person_cost} per person
                </div>
            </div>

            ${top.errors && top.errors.length > 0 ? `
                <div class="result-error">
                    <span class="result-error-icon">⚠️</span>
                    <div class="result-error-text">
                        <strong>Constraint Warnings:</strong><br>
                        ${top.errors.join('<br>')}
                    </div>
                </div>
            ` : ''}

            <!-- Alternatives -->
            ${alternatives.length > 0 ? `
                <div class="result-alternatives animate-fade-in-up delay-4">
                    <h3>🔄 Alternative Meeting Points</h3>
                    <div class="alt-list">
                        ${alternatives.map(alt => `
                            <div class="alt-item" data-city="${alt.destinationKey}">
                                <div>
                                    <span class="alt-city">${alt.destination}, ${alt.country}</span>
                                    <span class="alt-neighborhood"> — ${alt.neighborhood}</span>
                                </div>
                                <div style="text-align: right;">
                                    <span class="alt-cost">€${alt.total_group_cost}</span>
                                    <span style="display: block; font-size: 10px; color: var(--color-text-muted);">Score: ${alt.recommendation_score}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- JSON Output Toggle -->
            <div class="result-json-toggle animate-fade-in-up delay-5">
                <button class="btn btn-ghost btn-sm" id="btn-toggle-json">{ } View JSON Output</button>
                <div class="json-output" id="json-output">${JSON.stringify(this.engine.toJSON(top), null, 2)}</div>
            </div>
        `;

        // JSON toggle listener
        const jsonBtn = document.getElementById('btn-toggle-json');
        const jsonOutput = document.getElementById('json-output');
        if (jsonBtn && jsonOutput) {
            jsonBtn.addEventListener('click', () => {
                jsonOutput.classList.toggle('visible');
                jsonBtn.textContent = jsonOutput.classList.contains('visible')
                    ? '{ } Hide JSON'
                    : '{ } View JSON Output';
            });
        }

        // Alternative click handler
        document.querySelectorAll('.alt-item').forEach(item => {
            item.addEventListener('click', () => {
                const cityKey = item.dataset.city;
                const alt = result.recommendations.find(r => r.destinationKey === cityKey);
                if (alt) {
                    this.renderResults({ ...result, recommendations: [alt, ...result.recommendations.filter(r => r.destinationKey !== cityKey)] });
                }
            });
        });

        // Scroll to results
        this.el.resultsContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderRouteCard(traveler, index) {
        const color = HODOPHILE_DATA.avatarColors[index % HODOPHILE_DATA.avatarColors.length];
        const modeEmoji = { flight: '✈️', train: '🚄', 'multi-modal': '✈️🚄', local: '📍' };
        const durationHours = Math.floor(traveler.duration / 60);
        const durationMins = traveler.duration % 60;
        const durationStr = traveler.duration === 0 ? 'Local' : `${durationHours}h ${durationMins}m`;

        // Build multi-modal price breakdown
        const isEstimated = traveler.priceSource === 'estimated';
        const costDisplay = isEstimated
            ? `~€${traveler.cost} <span class="price-estimated" title="Price estimated from distance — start backend for real prices">est.</span>`
            : `€${traveler.cost}`;
        let segmentBreakdown = '';
        if (traveler.mode === 'multi-modal' && traveler.segments && traveler.segments.length > 1) {
            const parts = traveler.segments.map(seg => {
                const icon = seg.type === 'flight' ? '✈️' : '🚄';
                const estTag = seg.priceSource === 'estimated' ? '<span class="price-estimated">~</span>' : '';
                return `${icon} ${estTag}€${seg.cost}`;
            });
            segmentBreakdown = `<div class="route-segment-breakdown">${parts.join(' + ')} = ${isEstimated ? '~' : ''}€${traveler.cost}</div>`;
        }

        return `
            <div class="route-card">
                <div class="route-header">
                    <div class="route-traveler">
                        <div class="route-avatar" style="background: ${color}">${traveler.name.charAt(0)}</div>
                        <span class="route-name">${traveler.name}</span>
                    </div>
                    <span class="route-cost">${costDisplay}</span>
                </div>
                <div class="route-path">
                    ${this.formatRoutePath(traveler)}
                </div>
                ${segmentBreakdown}
                <div class="route-meta">
                    <span class="route-meta-item">${modeEmoji[traveler.mode] || '🚀'} ${traveler.mode}</span>
                    <span class="route-meta-item">⏱️ ${durationStr}</span>
                    <span class="route-meta-item">🕐 Arrival: ${traveler.arrival}</span>
                    ${traveler.preferred ? `<span class="route-meta-item" style="color: var(--color-success);" title="${traveler.preferReason}">⭐ Preferred</span>` : ''}
                </div>
                <div class="route-segments-booking">
                    ${traveler.segments && traveler.segments.length > 1 ? `
                        <div class="segment-buttons">
                            ${traveler.segments.map((seg, idx) => `
                                <a href="${seg.bookingLink || '#'}" target="_blank" rel="noopener" class="btn btn-ghost btn-xs segment-book-btn">
                                    ${seg.type === 'flight' ? '✈️' : '🚄'} Book ${seg.type}: ${seg.from}→${seg.to} (€${seg.cost})
                                </a>
                            `).join('')}
                        </div>
                    ` : (traveler.bookingLink ? `
                        <div style="margin-top: var(--space-3);">
                            <a href="${traveler.bookingLink}" target="_blank" rel="noopener" class="route-book-link">
                                🔗 Search & Book
                            </a>
                        </div>
                    ` : '')}
                </div>
            </div>
        `;
    }

    formatRoutePath(traveler) {
        if (!traveler.segments || traveler.segments.length === 0) return traveler.route;

        return traveler.segments.map((seg, i) => {
            const modeIcon = seg.type === 'flight' ? '✈️' : seg.type === 'train' ? '🚄' : '📍';
            if (i === 0) {
                return `${seg.from} <span class="arrow">→</span> <span style="opacity: 0.6; font-size: 10px;">${modeIcon}</span> ${seg.to}`;
            }
            return `<span class="arrow">→</span> <span style="opacity: 0.6; font-size: 10px;">${modeIcon}</span> ${seg.to}`;
        }).join(' ');
    }

    // ═══════════════════════════════════════════════════════════
    // ERROR DISPLAY
    // ═══════════════════════════════════════════════════════════
    showErrors(errors) {
        this.hideLoading();
        this.el.resultsContent.style.display = 'flex';
        this.el.resultsEmpty.style.display = 'none';

        this.el.resultsContent.innerHTML = `
            <div class="result-error animate-scale-in">
                <span class="result-error-icon">⚠️</span>
                <div class="result-error-text">
                    <strong>Optimization Issues:</strong><br>
                    ${errors.map(e => `• ${e}`).join('<br>')}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════
    // DEMO DATA
    // ═══════════════════════════════════════════════════════════
    loadDemoData() {
        // Clear existing travelers
        this.travelers = [];
        this.travelerIdCounter = 0;
        this.el.travelersList.innerHTML = '';

        // Add demo travelers
        const demoTravelers = [
            { name: "Alice", origin: "London", noTravelBefore: "07:00", arriveBy: "18:00" },
            { name: "Bob", origin: "Berlin", noTravelBefore: "08:00", arriveBy: "20:00" },
            { name: "Clara", origin: "Madrid", noTravelBefore: "06:00", arriveBy: "19:00" }
        ];

        demoTravelers.forEach(t => this.addTraveler(t));

        // Set demo dates
        const start = new Date();
        start.setDate(start.getDate() + 21);
        const end = new Date(start);
        end.setDate(start.getDate() + 4);
        this.el.tripDateStart.value = this.formatDate(start);
        this.el.tripDateEnd.value = this.formatDate(end);

        // Set budget
        this.el.budgetMax.value = 300;
        this.el.accommodationType.value = 'mid';
        this.el.tripDuration.value = 4;

        this.showToast('Demo data loaded! Testing flexible 4-day window.', 'success');
    }

    // ═══════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════
    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s ease-out reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Make UI globally available
window.HodophileUI = HodophileUI;
