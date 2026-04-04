"""Hodophile Flight API Backend.

FastAPI server wrapping the `fli` library (Google Flights) to provide real
flight price data to the Hodophile frontend.

Run with:
    uvicorn backend.main:app --reload --port 8000
or:
    python backend/main.py
"""

from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from fli.models import (
    Airport,
    FlightSearchFilters,
    FlightSegment,
    MaxStops,
    PassengerInfo,
    SeatType,
    SortBy,
)
from fli.search import SearchFlights

app = FastAPI(
    title="Hodophile Flight API",
    description="Real flight price data via Google Flights (fli library)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["GET"],
    allow_headers=["*"],
)

_searcher = SearchFlights()


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "hodophile-flight-api", "version": "1.0.0"}


@app.get("/api/flights")
def search_flights(
    origin: str = Query(..., description="Origin IATA code, e.g. LHR"),
    dest: str = Query(..., description="Destination IATA code, e.g. CDG"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format"),
    max_stops: int = Query(2, description="Maximum number of stops (0=non-stop, 1, 2)"),
    top_n: int = Query(3, description="Number of results to return"),
):
    """Search for cheapest flights between two airports on a given date.

    Returns real prices from Google Flights via the fli library.
    Falls back gracefully: if the IATA code is unknown or search fails,
    returns found=False so the JS engine can use its simulation fallback.
    """
    # Validate date format
    try:
        flight_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now().date()
        if flight_date <= today:
            raise HTTPException(
                status_code=400,
                detail=f"Date must be in the future. Got: {date}",
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Validate and resolve IATA codes to Airport enum members
    origin_code = origin.upper().strip()
    dest_code = dest.upper().strip()

    try:
        origin_airport = Airport[origin_code]
    except KeyError:
        return {
            "found": False,
            "reason": f"Unknown origin airport code: {origin_code}",
            "fallback": True,
        }

    try:
        dest_airport = Airport[dest_code]
    except KeyError:
        return {
            "found": False,
            "reason": f"Unknown destination airport code: {dest_code}",
            "fallback": True,
        }

    # Map max_stops param to fli MaxStops enum
    stops_map = {0: MaxStops.NON_STOP, 1: MaxStops.ONE_STOP_OR_FEWER, 2: MaxStops.TWO_OR_FEWER_STOPS}
    stops_filter = stops_map.get(max_stops, MaxStops.ANY)

    try:
        filters = FlightSearchFilters(
            passenger_info=PassengerInfo(adults=1),
            flight_segments=[
                FlightSegment(
                    departure_airport=[[origin_airport, 0]],
                    arrival_airport=[[dest_airport, 0]],
                    travel_date=date,
                )
            ],
            seat_type=SeatType.ECONOMY,
            stops=stops_filter,
            sort_by=SortBy.CHEAPEST,
        )

        flights = _searcher.search(filters, top_n=top_n)

        if not flights:
            return {"found": False, "reason": "No flights found", "fallback": True}

        results = []
        for f in flights:
            first_leg = f.legs[0] if f.legs else None
            results.append(
                {
                    "price": f.price,
                    "duration_minutes": f.duration,
                    "stops": f.stops,
                    "airline": first_leg.airline.value if first_leg else "Unknown",
                    "flight_number": first_leg.flight_number if first_leg else None,
                    "departure_time": (
                        first_leg.departure_datetime.strftime("%H:%M") if first_leg else None
                    ),
                    "arrival_time": (
                        f.legs[-1].arrival_datetime.strftime("%H:%M") if f.legs else None
                    ),
                }
            )

        cheapest = results[0]
        return {
            "found": True,
            "origin": origin_code,
            "destination": dest_code,
            "date": date,
            "cheapest_price": cheapest["price"],
            "cheapest_duration_minutes": cheapest["duration_minutes"],
            "cheapest_stops": cheapest["stops"],
            "cheapest_airline": cheapest["airline"],
            "all_results": results,
            "source": "google_flights",
        }

    except Exception as exc:
        # Return fallback signal — never crash the frontend
        return {
            "found": False,
            "reason": str(exc),
            "fallback": True,
        }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
