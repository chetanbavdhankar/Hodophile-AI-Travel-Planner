/* ═══════════════════════════════════════════════════════════════
   HODOPHILE — Data Layer
   Cities, airports, neighborhoods, transport data
   ═══════════════════════════════════════════════════════════════ */

const HODOPHILE_DATA = {
    // ─── European Cities Database ───
    cities: {
        "london": {
            name: "London", country: "UK", code: "LON",
            airports: ["LHR", "LGW", "STN", "LTN"],
            trainStations: ["St Pancras", "King's Cross", "Victoria"],
            neighborhoods: [
                { name: "Shoreditch", vibe: 9.2, walkability: 9.5, safety: 7.8, nightlife: 9.5, food: 9.0, transit: 9.0, type: "creative" },
                { name: "South Bank", vibe: 8.8, walkability: 9.0, safety: 8.5, nightlife: 7.0, food: 8.0, transit: 9.5, type: "cultural" },
                { name: "Camden", vibe: 9.0, walkability: 8.5, safety: 7.0, nightlife: 9.0, food: 8.5, transit: 8.5, type: "bohemian" },
                { name: "Covent Garden", vibe: 8.5, walkability: 9.5, safety: 8.5, nightlife: 8.0, food: 8.5, transit: 9.5, type: "tourist" }
            ],
            lat: 51.5074, lng: -0.1278
        },
        "paris": {
            name: "Paris", country: "France", code: "PAR",
            airports: ["CDG", "ORY", "BVA"],
            trainStations: ["Gare du Nord", "Gare de Lyon", "Gare de l'Est"],
            neighborhoods: [
                { name: "Le Marais", vibe: 9.5, walkability: 9.5, safety: 8.0, nightlife: 8.5, food: 9.5, transit: 9.0, type: "historic" },
                { name: "Montmartre", vibe: 9.0, walkability: 8.0, safety: 7.5, nightlife: 8.0, food: 8.5, transit: 8.0, type: "bohemian" },
                { name: "Saint-Germain", vibe: 9.2, walkability: 9.0, safety: 8.5, nightlife: 7.5, food: 9.0, transit: 9.0, type: "literary" },
                { name: "Belleville", vibe: 8.5, walkability: 8.0, safety: 7.0, nightlife: 8.5, food: 9.0, transit: 8.5, type: "multicultural" }
            ],
            lat: 48.8566, lng: 2.3522
        },
        "berlin": {
            name: "Berlin", country: "Germany", code: "BER",
            airports: ["BER"],
            trainStations: ["Hauptbahnhof", "Ostbahnhof"],
            neighborhoods: [
                { name: "Kreuzberg", vibe: 9.5, walkability: 9.0, safety: 7.5, nightlife: 9.5, food: 9.0, transit: 9.0, type: "alternative" },
                { name: "Friedrichshain", vibe: 9.2, walkability: 8.5, safety: 7.5, nightlife: 9.5, food: 8.5, transit: 9.0, type: "nightlife" },
                { name: "Prenzlauer Berg", vibe: 8.8, walkability: 9.0, safety: 8.5, nightlife: 7.0, food: 8.5, transit: 8.5, type: "family" },
                { name: "Neukölln", vibe: 8.5, walkability: 8.0, safety: 7.0, nightlife: 8.5, food: 8.5, transit: 8.0, type: "trendy" }
            ],
            lat: 52.5200, lng: 13.4050
        },
        "barcelona": {
            name: "Barcelona", country: "Spain", code: "BCN",
            airports: ["BCN", "GRO"],
            trainStations: ["Sants", "Passeig de Gràcia"],
            neighborhoods: [
                { name: "El Born", vibe: 9.5, walkability: 9.5, safety: 7.5, nightlife: 8.5, food: 9.5, transit: 9.0, type: "historic" },
                { name: "Gràcia", vibe: 9.0, walkability: 9.0, safety: 8.5, nightlife: 8.0, food: 9.0, transit: 8.5, type: "local" },
                { name: "Eixample", vibe: 8.5, walkability: 9.0, safety: 8.0, nightlife: 8.0, food: 8.5, transit: 9.0, type: "modernist" },
                { name: "Barceloneta", vibe: 8.5, walkability: 9.0, safety: 7.0, nightlife: 8.5, food: 8.0, transit: 8.0, type: "beach" }
            ],
            lat: 41.3851, lng: 2.1734
        },
        "amsterdam": {
            name: "Amsterdam", country: "Netherlands", code: "AMS",
            airports: ["AMS"],
            trainStations: ["Centraal"],
            neighborhoods: [
                { name: "Jordaan", vibe: 9.5, walkability: 9.5, safety: 8.5, nightlife: 7.5, food: 9.0, transit: 9.0, type: "canal" },
                { name: "De Pijp", vibe: 9.0, walkability: 9.0, safety: 8.0, nightlife: 8.0, food: 9.5, transit: 8.5, type: "foodie" },
                { name: "Oud-West", vibe: 8.5, walkability: 8.5, safety: 8.5, nightlife: 7.5, food: 8.5, transit: 8.5, type: "residential" },
                { name: "NDSM", vibe: 8.0, walkability: 7.0, safety: 7.5, nightlife: 8.5, food: 7.5, transit: 7.0, type: "industrial" }
            ],
            lat: 52.3676, lng: 4.9041
        },
        "rome": {
            name: "Rome", country: "Italy", code: "ROM",
            airports: ["FCO", "CIA"],
            trainStations: ["Termini", "Tiburtina"],
            neighborhoods: [
                { name: "Trastevere", vibe: 9.5, walkability: 9.0, safety: 8.0, nightlife: 9.0, food: 9.5, transit: 8.0, type: "bohemian" },
                { name: "Monti", vibe: 9.0, walkability: 9.0, safety: 8.0, nightlife: 8.0, food: 8.5, transit: 9.0, type: "trendy" },
                { name: "Testaccio", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 8.5, food: 9.5, transit: 7.5, type: "foodie" },
                { name: "San Lorenzo", vibe: 8.0, walkability: 8.0, safety: 7.0, nightlife: 9.0, food: 8.0, transit: 7.5, type: "student" }
            ],
            lat: 41.9028, lng: 12.4964
        },
        "florence": {
            name: "Florence", country: "Italy", code: "FLR",
            airports: ["FLR", "PSA"],
            trainStations: ["Santa Maria Novella"],
            neighborhoods: [
                { name: "Oltrarno", vibe: 9.5, walkability: 9.5, safety: 8.5, nightlife: 8.0, food: 9.5, transit: 8.0, type: "artisan" },
                { name: "Santa Croce", vibe: 9.0, walkability: 9.0, safety: 8.0, nightlife: 8.5, food: 9.0, transit: 8.5, type: "historic" },
                { name: "San Frediano", vibe: 8.8, walkability: 8.5, safety: 8.0, nightlife: 8.5, food: 9.0, transit: 7.5, type: "local" }
            ],
            lat: 43.7696, lng: 11.2558
        },
        "prague": {
            name: "Prague", country: "Czech Republic", code: "PRG",
            airports: ["PRG"],
            trainStations: ["Hlavní nádraží"],
            neighborhoods: [
                { name: "Vinohrady", vibe: 9.0, walkability: 9.0, safety: 9.0, nightlife: 8.0, food: 8.5, transit: 9.0, type: "residential" },
                { name: "Žižkov", vibe: 8.5, walkability: 8.0, safety: 7.5, nightlife: 9.0, food: 8.0, transit: 8.5, type: "alternative" },
                { name: "Karlín", vibe: 8.5, walkability: 8.5, safety: 8.5, nightlife: 7.5, food: 8.5, transit: 8.5, type: "hipster" }
            ],
            lat: 50.0755, lng: 14.4378
        },
        "lisbon": {
            name: "Lisbon", country: "Portugal", code: "LIS",
            airports: ["LIS"],
            trainStations: ["Oriente", "Santa Apolónia"],
            neighborhoods: [
                { name: "Alfama", vibe: 9.5, walkability: 8.0, safety: 7.5, nightlife: 8.0, food: 9.0, transit: 8.0, type: "historic" },
                { name: "Bairro Alto", vibe: 9.0, walkability: 8.0, safety: 7.0, nightlife: 9.5, food: 8.5, transit: 8.0, type: "nightlife" },
                { name: "Príncipe Real", vibe: 9.0, walkability: 8.5, safety: 8.5, nightlife: 7.5, food: 8.5, transit: 8.0, type: "trendy" },
                { name: "Mouraria", vibe: 8.5, walkability: 7.5, safety: 7.0, nightlife: 7.5, food: 9.0, transit: 8.5, type: "multicultural" }
            ],
            lat: 38.7223, lng: -9.1393
        },
        "vienna": {
            name: "Vienna", country: "Austria", code: "VIE",
            airports: ["VIE"],
            trainStations: ["Wien Hauptbahnhof"],
            neighborhoods: [
                { name: "Neubau (7th)", vibe: 9.0, walkability: 9.0, safety: 9.0, nightlife: 8.0, food: 8.5, transit: 9.0, type: "creative" },
                { name: "Mariahilf (6th)", vibe: 8.5, walkability: 9.0, safety: 8.5, nightlife: 7.5, food: 8.0, transit: 9.0, type: "shopping" },
                { name: "Leopoldstadt (2nd)", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 8.0, food: 8.5, transit: 8.5, type: "multicultural" }
            ],
            lat: 48.2082, lng: 16.3738
        },
        "budapest": {
            name: "Budapest", country: "Hungary", code: "BUD",
            airports: ["BUD"],
            trainStations: ["Keleti", "Déli"],
            neighborhoods: [
                { name: "VII District (Jewish Quarter)", vibe: 9.5, walkability: 9.0, safety: 7.5, nightlife: 9.5, food: 9.0, transit: 9.0, type: "ruin bar" },
                { name: "V District (Inner City)", vibe: 8.5, walkability: 9.5, safety: 8.0, nightlife: 7.5, food: 8.0, transit: 9.5, type: "central" },
                { name: "IX District (Ferencváros)", vibe: 8.0, walkability: 8.0, safety: 7.5, nightlife: 8.0, food: 8.5, transit: 8.0, type: "emerging" }
            ],
            lat: 47.4979, lng: 19.0402
        },
        "copenhagen": {
            name: "Copenhagen", country: "Denmark", code: "CPH",
            airports: ["CPH"],
            trainStations: ["København H"],
            neighborhoods: [
                { name: "Nørrebro", vibe: 9.0, walkability: 9.0, safety: 8.0, nightlife: 8.5, food: 9.0, transit: 9.0, type: "diverse" },
                { name: "Vesterbro", vibe: 9.0, walkability: 9.0, safety: 8.0, nightlife: 8.5, food: 9.0, transit: 9.0, type: "hipster" },
                { name: "Christianshavn", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 7.5, food: 8.0, transit: 8.0, type: "canal" }
            ],
            lat: 55.6761, lng: 12.5683
        },
        "milan": {
            name: "Milan", country: "Italy", code: "MIL",
            airports: ["MXP", "LIN", "BGY"],
            trainStations: ["Centrale", "Garibaldi"],
            neighborhoods: [
                { name: "Navigli", vibe: 9.0, walkability: 9.0, safety: 7.5, nightlife: 9.0, food: 9.0, transit: 8.5, type: "canal" },
                { name: "Brera", vibe: 9.0, walkability: 9.0, safety: 8.5, nightlife: 7.5, food: 8.5, transit: 9.0, type: "artsy" },
                { name: "Isola", vibe: 8.5, walkability: 8.0, safety: 8.0, nightlife: 8.0, food: 8.5, transit: 8.0, type: "trendy" }
            ],
            lat: 45.4642, lng: 9.1900
        },
        "munich": {
            name: "Munich", country: "Germany", code: "MUC",
            airports: ["MUC"],
            trainStations: ["Hauptbahnhof"],
            neighborhoods: [
                { name: "Schwabing", vibe: 8.5, walkability: 9.0, safety: 9.0, nightlife: 7.5, food: 8.5, transit: 9.0, type: "university" },
                { name: "Glockenbachviertel", vibe: 9.0, walkability: 9.0, safety: 8.5, nightlife: 9.0, food: 9.0, transit: 9.0, type: "nightlife" },
                { name: "Haidhausen", vibe: 8.5, walkability: 8.5, safety: 9.0, nightlife: 7.5, food: 8.5, transit: 8.5, type: "charming" }
            ],
            lat: 48.1351, lng: 11.5820
        },
        "madrid": {
            name: "Madrid", country: "Spain", code: "MAD",
            airports: ["MAD"],
            trainStations: ["Atocha", "Chamartín"],
            neighborhoods: [
                { name: "Malasaña", vibe: 9.5, walkability: 9.0, safety: 7.5, nightlife: 9.5, food: 9.0, transit: 9.0, type: "alternative" },
                { name: "La Latina", vibe: 9.0, walkability: 9.0, safety: 7.5, nightlife: 8.5, food: 9.5, transit: 8.5, type: "tapas" },
                { name: "Chueca", vibe: 9.0, walkability: 9.0, safety: 8.0, nightlife: 9.0, food: 8.5, transit: 9.0, type: "lively" },
                { name: "Lavapiés", vibe: 8.5, walkability: 8.5, safety: 7.0, nightlife: 8.0, food: 9.0, transit: 9.0, type: "multicultural" }
            ],
            lat: 40.4168, lng: -3.7038
        },
        "dublin": {
            name: "Dublin", country: "Ireland", code: "DUB",
            airports: ["DUB"],
            trainStations: ["Heuston", "Connolly"],
            neighborhoods: [
                { name: "Temple Bar", vibe: 8.5, walkability: 9.5, safety: 7.0, nightlife: 9.5, food: 8.0, transit: 9.0, type: "tourist" },
                { name: "Portobello", vibe: 8.5, walkability: 8.5, safety: 8.5, nightlife: 7.5, food: 8.5, transit: 8.0, type: "local" },
                { name: "Smithfield", vibe: 8.0, walkability: 8.0, safety: 7.5, nightlife: 8.0, food: 8.0, transit: 8.0, type: "emerging" }
            ],
            lat: 53.3498, lng: -6.2603
        },
        "stockholm": {
            name: "Stockholm", country: "Sweden", code: "STO",
            airports: ["ARN", "NYO"],
            trainStations: ["Stockholm Centralstation"],
            neighborhoods: [
                { name: "Södermalm", vibe: 9.0, walkability: 8.5, safety: 8.5, nightlife: 8.5, food: 9.0, transit: 9.0, type: "hipster" },
                { name: "Gamla Stan", vibe: 8.5, walkability: 9.0, safety: 8.5, nightlife: 7.0, food: 7.5, transit: 9.0, type: "historic" },
                { name: "Norrmalm", vibe: 8.0, walkability: 9.0, safety: 9.0, nightlife: 7.5, food: 8.0, transit: 9.5, type: "central" }
            ],
            lat: 59.3293, lng: 18.0686
        },
        "zurich": {
            name: "Zurich", country: "Switzerland", code: "ZRH",
            airports: ["ZRH"],
            trainStations: ["Zürich HB"],
            neighborhoods: [
                { name: "Zürich West", vibe: 8.5, walkability: 8.0, safety: 9.0, nightlife: 8.5, food: 8.5, transit: 8.5, type: "industrial" },
                { name: "Niederdorf", vibe: 8.0, walkability: 9.0, safety: 9.0, nightlife: 8.0, food: 8.0, transit: 9.0, type: "old town" }
            ],
            lat: 47.3769, lng: 8.5417
        },
        "athens": {
            name: "Athens", country: "Greece", code: "ATH",
            airports: ["ATH"],
            trainStations: ["Larissa Station"],
            neighborhoods: [
                { name: "Psyrri", vibe: 9.0, walkability: 9.0, safety: 7.0, nightlife: 9.0, food: 9.0, transit: 8.5, type: "artistic" },
                { name: "Koukaki", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 7.5, food: 8.5, transit: 8.5, type: "local" },
                { name: "Exarcheia", vibe: 8.5, walkability: 8.0, safety: 6.5, nightlife: 8.5, food: 8.0, transit: 8.0, type: "counter-culture" }
            ],
            lat: 37.9838, lng: 23.7275
        },
        "krakow": {
            name: "Kraków", country: "Poland", code: "KRK",
            airports: ["KRK"],
            trainStations: ["Kraków Główny"],
            neighborhoods: [
                { name: "Kazimierz", vibe: 9.5, walkability: 9.5, safety: 8.5, nightlife: 9.0, food: 9.0, transit: 8.5, type: "historic" },
                { name: "Podgórze", vibe: 8.5, walkability: 8.0, safety: 8.0, nightlife: 7.5, food: 8.0, transit: 8.0, type: "emerging" }
            ],
            lat: 50.0647, lng: 19.9450
        },
        "porto": {
            name: "Porto", country: "Portugal", code: "OPO",
            airports: ["OPO"],
            trainStations: ["São Bento", "Campanhã"],
            neighborhoods: [
                { name: "Ribeira", vibe: 9.5, walkability: 8.0, safety: 8.0, nightlife: 8.0, food: 9.5, transit: 8.0, type: "historic" },
                { name: "Cedofeita", vibe: 8.5, walkability: 9.0, safety: 8.5, nightlife: 8.5, food: 8.5, transit: 8.5, type: "creative" }
            ],
            lat: 41.1579, lng: -8.6291
        },
        "brussels": {
            name: "Brussels", country: "Belgium", code: "BRU",
            airports: ["BRU", "CRL"],
            trainStations: ["Bruxelles-Midi", "Bruxelles-Central"],
            neighborhoods: [
                { name: "Saint-Gilles", vibe: 8.5, walkability: 8.5, safety: 7.5, nightlife: 8.0, food: 8.5, transit: 8.5, type: "multicultural" },
                { name: "Ixelles", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 8.5, food: 8.0, transit: 8.5, type: "university" }
            ],
            lat: 50.8503, lng: 4.3517
        },
        "edinburgh": {
            name: "Edinburgh", country: "UK", code: "EDI",
            airports: ["EDI"],
            trainStations: ["Edinburgh Waverley"],
            neighborhoods: [
                { name: "Stockbridge", vibe: 9.0, walkability: 9.0, safety: 9.0, nightlife: 7.0, food: 9.0, transit: 8.0, type: "village" },
                { name: "Grassmarket", vibe: 8.5, walkability: 9.0, safety: 8.0, nightlife: 8.5, food: 8.0, transit: 9.0, type: "historic" }
            ],
            lat: 55.9533, lng: -3.1883
        },
        "nice": {
            name: "Nice", country: "France", code: "NCE",
            airports: ["NCE"],
            trainStations: ["Nice-Ville"],
            neighborhoods: [
                { name: "Vieux Nice", vibe: 9.0, walkability: 9.0, safety: 7.5, nightlife: 8.0, food: 9.0, transit: 8.5, type: "old town" },
                { name: "Port", vibe: 8.0, walkability: 8.5, safety: 8.0, nightlife: 8.0, food: 8.5, transit: 8.0, type: "harbor" }
            ],
            lat: 43.7102, lng: 7.2620
        },
        "split": {
            name: "Split", country: "Croatia", code: "SPU",
            airports: ["SPU"],
            trainStations: ["Split Station"],
            neighborhoods: [
                { name: "Diocletian District", vibe: 9.0, walkability: 9.5, safety: 8.5, nightlife: 8.0, food: 8.5, transit: 7.5, type: "ancient" },
                { name: "Bačvice", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 8.5, food: 8.0, transit: 7.5, type: "beach" }
            ],
            lat: 43.5081, lng: 16.4402
        },
        "warsaw": {
            name: "Warsaw", country: "Poland", code: "WAW",
            airports: ["WAW", "WMI"],
            trainStations: ["Warszawa Centralna"],
            neighborhoods: [
                { name: "Praga Północ", vibe: 8.5, walkability: 8.0, safety: 7.0, nightlife: 8.5, food: 8.0, transit: 8.5, type: "alternative" },
                { name: "Powiśle", vibe: 8.5, walkability: 8.5, safety: 8.0, nightlife: 8.0, food: 8.0, transit: 8.5, type: "riverside" }
            ],
            lat: 52.2297, lng: 21.0122
        }
    },

    // ─── Virtual City Synthesizer ───
    // Generates plausible data for any city name entered by the user
    synthesizeCity: function (cityName) {
        const name = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();

        // Generate a deterministic but random-looking set of coords for demo purposes
        // in a real app, this would call a Geocoding API (OpenStreetMap/Google)
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const lat = 40 + (hash % 15) - (hash % 7);
        const lng = 10 + (hash % 20) - (hash % 10);

        return {
            name: name,
            country: "Global",
            code: name.slice(0, 3).toUpperCase(),
            airports: [name.slice(0, 3).toUpperCase()],
            trainStations: [`${name} Central`],
            neighborhoods: [
                { name: `${name} Arts District`, vibe: 8.5, walkability: 8.0, safety: 8.0, nightlife: 8.5, food: 8.5, transit: 8.0, type: "creative" },
                { name: "City Center", vibe: 8.0, walkability: 9.0, safety: 8.5, nightlife: 7.5, food: 8.0, transit: 9.0, type: "central" }
            ],
            lat: lat,
            lng: lng,
            isVirtual: true
        };
    },

    // ─── Traveler Avatar Colors ───
    avatarColors: [
        "#6366f1", "#06b6d4", "#f59e0b", "#10b981",
        "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"
    ],

    // ─── Default Traveler Names ───
    defaultNames: ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank"],

    // ─── Accommodation Prices (per person per night, approximate) ───
    accommodationPricing: {
        budget: { min: 15, max: 40, label: "Budget (Hostels)" },
        mid: { min: 35, max: 80, label: "Mid-Range (3★)" },
        boutique: { min: 60, max: 150, label: "Boutique (4★+)" },
        luxury: { min: 120, max: 350, label: "Luxury (5★)" }
    },

    // ─── City-specific accommodation multipliers (relative to base) ───
    cityPriceMultiplier: {
        "london": 1.5, "paris": 1.4, "zurich": 1.8, "copenhagen": 1.5,
        "stockholm": 1.4, "amsterdam": 1.3, "munich": 1.2, "dublin": 1.3,
        "vienna": 1.1, "milan": 1.2, "nice": 1.3, "edinburgh": 1.2,
        "barcelona": 1.1, "rome": 1.1, "berlin": 0.9, "prague": 0.7,
        "budapest": 0.6, "lisbon": 0.9, "krakow": 0.6, "porto": 0.8,
        "brussels": 1.0, "madrid": 1.0, "florence": 1.1, "athens": 0.8,
        "split": 0.7, "warsaw": 0.7
    },

    // ─── Gateway Airport Connections ───
    // Maps main city airports to gateway airports within 150km
    gatewayAirports: {
        "florence": [
            { airport: "PSA", city: "Pisa", distance: 85, trainTime: 60, trainCost: 9 },
            { airport: "BLQ", city: "Bologna", distance: 110, trainTime: 35, trainCost: 12 }
        ],
        "nice": [
            { airport: "MRS", city: "Marseille", distance: 200, trainTime: 150, trainCost: 25 }
        ],
        "milan": [
            { airport: "BGY", city: "Bergamo (Orio al Serio)", distance: 50, trainTime: 50, trainCost: 7 }
        ],
        "brussels": [
            { airport: "CRL", city: "Charleroi", distance: 60, trainTime: 55, trainCost: 8 }
        ],
        "london": [
            { airport: "STN", city: "Stansted", distance: 60, trainTime: 47, trainCost: 12 },
            { airport: "LTN", city: "Luton", distance: 55, trainTime: 35, trainCost: 10 }
        ],
        "paris": [
            { airport: "BVA", city: "Beauvais", distance: 85, trainTime: 75, trainCost: 15 }
        ],
        "stockholm": [
            { airport: "NYO", city: "Nyköping (Skavsta)", distance: 100, trainTime: 75, trainCost: 15 }
        ]
    },

    // ─── Booking Link Templates ───
    bookingLinks: {
        flight: (origin, dest, date) =>
            `https://www.skyscanner.net/transport/flights/${origin}/${dest}/${date}/`,
        train: (origin, dest, date) =>
            `https://www.thetrainline.com/book/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&outwardDate=${date}`,
        accommodation: (city, checkin, checkout) =>
            `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}`
    }
};

// ─── Distance Calculator (Haversine) ───
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Make data globally available
window.HODOPHILE_DATA = HODOPHILE_DATA;
window.haversineDistance = haversineDistance;
