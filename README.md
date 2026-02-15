# 🧭 Hodophile — Multi-Origin Travel Optimization Engine

> *Hodophile (n.)* — One who loves to travel. From Greek *hodos* (journey) + *philos* (loving).

**Hodophile** is the world's first travel optimizer that finds the **mathematical Global Minimum cost** for groups of travelers starting from different cities. It combines multi-modal transport (flights, trains, buses), time-window constraints, and neighborhood intelligence to answer one question:

> **"Where should our group meet, and how should each person get there, for the lowest total cost?"**

---

## ✨ Features

### 🧮 Global Minimum Optimization
- Calculates `TotalCost = Σ(Travel) + Accommodation` across all travelers and all candidate destinations
- Ranks destinations by a composite score combining cost, neighborhood quality, and constraint compliance

### 🔍 Multi-Agent Architecture
| Agent | Role | Tools |
|---|---|---|
| **Scout Agent** (1 per traveler) | Searches flights, trains, and gateway airports | Amadeus-style flight search, Navitia-style train search |
| **Matchmaker Agent** | Builds cost matrix across destinations | Overlap matrix, cost optimizer |
| **Neighborhood Scout** | Scores neighborhoods by vibe, walkability, safety | Places API data, OpenStreetMap data |
| **Route Optimizer** | Applies multi-modal rules and ranks results | Gateway airport logic, train preference rule |

### 🚄 Multi-Modal Transport
- **Direct flights** to destination
- **Trains** for distances under 500km (preferred if price difference ≤ €50)
- **Gateway airports** within 150km + ground transport link (bus/train to final destination)

### ⏰ Time Window Compliance
- "No travel before X AM/PM" per traveler
- "Arrive by Y AM/PM" per traveler
- Invalid routes are automatically filtered

### 📍 Neighborhood Intelligence
- Not just "City Center" — finds the **Perfect Spot** 
- Scores neighborhoods on: Vibe, Walkability, Safety, Nightlife, Food, Transit
- Rejects accommodations > 50 minutes from the "Perfect Spot" by public transit

### 🔗 Booking Links
Since prices are dynamic and change frequently, Hodophile provides **direct links** to:
- **[Skyscanner](https://skyscanner.net)** for flight bookings
- **[Trainline](https://thetrainline.com)** for train bookings
- **[Booking.com](https://booking.com)** for accommodation

---

## 🏗️ Architecture

```
hodophile_travel_agent/
├── index.html              # Main SPA entry point
├── css/
│   ├── index.css           # Design system & global styles
│   ├── components.css      # UI component styles
│   └── animations.css      # Keyframes & micro-interactions
├── js/
│   ├── data.js             # Cities database (27 European cities)
│   ├── engine.js           # 4-agent optimization engine
│   ├── ui.js               # DOM rendering & interactions
│   └── app.js              # Application initialization
└── README.md               # This file
```

### Technology Stack
- **Pure HTML/CSS/JavaScript** — No frameworks, no build tools, just open `index.html`
- **CSS Custom properties** for a complete design token system
- **Glassmorphism UI** with dark theme
- **Google Fonts**: Inter, Space Grotesk, JetBrains Mono

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- No server or build tools required!

### Running Locally

**Option 1 — Direct Open:**
```bash
# Simply open the HTML file in your browser
start index.html          # Windows
open index.html           # macOS
xdg-open index.html       # Linux
```

**Option 2 — Local Server (recommended for best experience):**
```bash
# Using Python
python -m http.server 8000
# Then open http://localhost:8000

# Using Node.js
npx serve .
# Then open http://localhost:3000

# Using VS Code
# Install "Live Server" extension, right-click index.html → "Open with Live Server"
```

### Quick Demo
1. Open the app
2. Click **"Load Demo Data"** to pre-fill 3 travelers (London, Berlin, Madrid)
3. Click **"🚀 Find Global Minimum"**
4. Watch the 4-stage optimization pipeline run
5. Review the recommended destination, routes, and costs

---

## 📊 Data Output Format

The engine returns a structured JSON object for each recommendation:

```json
{
  "recommendation_score": 9.5,
  "destination": "Florence, Italy",
  "neighborhood": "Oltrarno",
  "travelers": [
    {
      "name": "Alice",
      "route": "London → Pisa (✈️) → Florence (🚄 Train)",
      "cost": 65,
      "arrival": "14:30",
      "booking_link": "https://www.skyscanner.net/..."
    },
    {
      "name": "Bob",
      "route": "Berlin → Florence (✈️ Flight)",
      "cost": 110,
      "arrival": "16:00",
      "booking_link": "https://www.skyscanner.net/..."
    }
  ],
  "accommodation": {
    "name": "Boutique Oltrarno Residence",
    "price_per_person": 45,
    "nights": 3,
    "location_rating": "Perfect Spot ✨",
    "booking_link": "https://www.booking.com/..."
  },
  "total_group_cost": 265,
  "per_person_cost": 133
}
```

---

## 🧠 Algorithm Details

### Optimization Pipeline

```
┌─────────────────────────────────────────────────────┐
│  STAGE 1: Scout Agents                              │
│  • 1 agent per traveler                             │
│  • Search: Direct flights, trains, gateway airports │
│  • Filter: Time window constraints                  │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 2: Matchmaker Agent                          │
│  • Build cost matrix (destinations × travelers)     │
│  • Calculate: Σ(Travel) + Accommodation per dest    │
│  • Filter: Budget compliance                        │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 3: Neighborhood Scout                        │
│  • Score neighborhoods by user preferences          │
│  • Weight: Vibe(1.5x), Walk(1.2x), Safety(1.0x)    │
│  • Reject: >50 min transit from "Perfect Spot"      │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 4: Route Optimizer                           │
│  • Composite score: Cost(35%) + Neighborhood(30%)   │
│    + Budget compliance(20%) + Perfect Spot bonus(15%)│
│  • Sort and return top recommendations              │
└─────────────────────────────────────────────────────┘
```

### Multi-Modal Rule
```
IF distance < 500km:
    IF train_price - flight_price ≤ €50:
        → PREFER TRAIN (marked as ⭐ Preferred)
    ELSE:
        → Use cheapest option
```

### Gateway Airport Logic
```
IF no cheap direct flight to destination:
    → SEARCH airports within 150km of destination
    → CALCULATE: Flight_to_Gateway + Ground_Transport_to_Destination
    → ADD ground link cost and time to total
```

### Error Handling
- If a traveler's time constraint makes a destination **impossible**, it's flagged immediately
- The engine suggests alternative "Meeting Point" cities automatically
- Infeasible destinations are excluded from the recommendation list

---

## 🌍 Supported Cities (27)

| Region | Cities |
|---|---|
| **Western Europe** | London, Paris, Amsterdam, Brussels, Dublin, Edinburgh |
| **Central Europe** | Berlin, Munich, Vienna, Zurich, Prague, Budapest, Warsaw, Kraków |
| **Southern Europe** | Barcelona, Madrid, Rome, Florence, Milan, Lisbon, Porto, Athens, Split, Nice |
| **Northern Europe** | Copenhagen, Stockholm |

Each city includes:
- Airport codes and gateway connections
- Train station data
- 2-4 scored neighborhoods with ratings for:
  - 🎭 Vibe
  - 🚶 Walkability
  - 🛡️ Safety
  - 🎵 Nightlife
  - 🍽️ Food Scene
  - 🚇 Transit Access

---

## 🎨 Design System

The UI uses a comprehensive CSS custom property system:

| Token | Purpose |
|---|---|
| `--color-primary` | Indigo (#6366f1) |
| `--color-secondary` | Cyan (#06b6d4) |
| `--color-accent` | Amber (#f59e0b) |
| `--font-sans` | Inter (body) |
| `--font-display` | Space Grotesk (headings) |
| `--font-mono` | JetBrains Mono (code/data) |
| `--radius-*` | Border radius scale |
| `--shadow-glow` | Glow shadow effect |

---

## 🔮 Future Enhancements

- [ ] **Live API Integration** — Connect to Amadeus, Kiwi, and Navitia APIs for real-time pricing
- [ ] **Map Visualization** — Interactive map showing routes from all origins converging on the meeting point
- [ ] **Date Flexibility** — "Flexible dates" mode that searches ±3 days for cheaper combinations
- [ ] **More Cities** — Expand beyond Europe to global destinations
- [ ] **Group Calendar** — Sync with Google Calendar to find overlapping free dates
- [ ] **Mobile App** — React Native or Flutter version for on-the-go planning

---

## 📝 Changelog

### v1.0.0 (2026-02-15)
- Initial release
- 4-agent optimization engine (Scout, Matchmaker, Neighborhood Scout, Route Optimizer)
- 27 European cities with neighborhood intelligence
- Multi-modal transport: flights, trains, gateway airports
- Time window constraints (depart after / arrive by)
- Booking links to Skyscanner, Trainline, Booking.com
- JSON output format per specification
- Dark glassmorphism UI with particle animation
- Demo data loader with 3-traveler scenario (London, Berlin, Madrid)
- Preference-based neighborhood scoring (Walkable, Nightlife, Food, Culture, etc.)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <strong>🧭 Hodophile</strong><br>
  <em>Finding the mathematical minimum for group travel.</em><br>
  Built with algorithmic love ❤️
</p>
