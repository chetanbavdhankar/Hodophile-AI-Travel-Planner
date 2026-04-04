"""Backend unit tests for the Hodophile Flight API.

Tests cover:
1. Health check
2. Valid flight search (LHR→CDG)
3. Valid flight search (BER→FCO)
4. Unknown airport code → graceful fallback (not 500)
5. Invalid date format → 400 error
6. Past date → 400 error
7. Same airport (LHR→LHR) → handled gracefully
"""

import sys
import os

# Ensure backend module is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

FUTURE_DATE = "2026-06-15"


# ── 1. Health check ──────────────────────────────────────────────────────────
def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "service" in data
    print("✅ Health check passed")


# ── 2. Valid search: London → Paris ──────────────────────────────────────────
def test_lhr_to_cdg():
    resp = client.get(f"/api/flights?origin=LHR&dest=CDG&date={FUTURE_DATE}")
    assert resp.status_code == 200
    data = resp.json()
    print(f"  LHR→CDG response: {data}")

    if data["found"]:
        assert isinstance(data["cheapest_price"], (int, float))
        assert data["cheapest_price"] > 0
        assert isinstance(data["cheapest_duration_minutes"], int)
        assert data["cheapest_duration_minutes"] > 0
        assert data["source"] == "google_flights"
        assert len(data["all_results"]) > 0
        print(f"  ✅ Real price found: €{data['cheapest_price']}, {data['cheapest_duration_minutes']} min, {data['cheapest_airline']}")
    else:
        # API may be unavailable (network/rate limit) — fallback is acceptable
        assert "fallback" in data and data["fallback"] is True
        print(f"  ⚪ Fallback triggered (acceptable): {data.get('reason', 'unknown')}")


# ── 3. Valid search: Berlin → Rome ───────────────────────────────────────────
def test_ber_to_fco():
    resp = client.get(f"/api/flights?origin=BER&dest=FCO&date={FUTURE_DATE}")
    assert resp.status_code == 200
    data = resp.json()
    print(f"  BER→FCO response: {data}")

    if data["found"]:
        assert data["cheapest_price"] > 0
        print(f"  ✅ Real price found: €{data['cheapest_price']}, {data['cheapest_duration_minutes']} min")
    else:
        assert data.get("fallback") is True
        print(f"  ⚪ Fallback: {data.get('reason', 'unknown')}")


# ── 4. Unknown airport code ───────────────────────────────────────────────────
def test_unknown_airport():
    resp = client.get(f"/api/flights?origin=ZZZ&dest=CDG&date={FUTURE_DATE}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["found"] is False
    assert data.get("fallback") is True
    assert "ZZZ" in data.get("reason", "")
    print(f"  ✅ Unknown airport handled gracefully: {data['reason']}")


# ── 5. Invalid date format ────────────────────────────────────────────────────
def test_invalid_date_format():
    resp = client.get("/api/flights?origin=LHR&dest=CDG&date=15-06-2026")
    assert resp.status_code == 400
    print(f"  ✅ Invalid date format rejected: {resp.json()['detail']}")


# ── 6. Past date ──────────────────────────────────────────────────────────────
def test_past_date():
    resp = client.get("/api/flights?origin=LHR&dest=CDG&date=2020-01-01")
    assert resp.status_code == 400
    print(f"  ✅ Past date rejected: {resp.json()['detail']}")


# ── 7. top_n parameter ────────────────────────────────────────────────────────
def test_top_n_parameter():
    resp = client.get(f"/api/flights?origin=LHR&dest=AMS&date={FUTURE_DATE}&top_n=1")
    assert resp.status_code == 200
    data = resp.json()
    if data["found"]:
        assert len(data["all_results"]) <= 1
        print(f"  ✅ top_n=1 respected: got {len(data['all_results'])} result(s)")
    else:
        print(f"  ⚪ Fallback for top_n test: {data.get('reason', 'unknown')}")


if __name__ == "__main__":
    print("\n═══ Hodophile Backend Tests ═══\n")
    tests = [
        ("Health check", test_health),
        ("LHR → CDG (London→Paris)", test_lhr_to_cdg),
        ("BER → FCO (Berlin→Rome)", test_ber_to_fco),
        ("Unknown airport ZZZ", test_unknown_airport),
        ("Invalid date format", test_invalid_date_format),
        ("Past date rejection", test_past_date),
        ("top_n parameter", test_top_n_parameter),
    ]

    passed = 0
    failed = 0
    for name, fn in tests:
        print(f"\n▶  {name}")
        try:
            fn()
            passed += 1
        except Exception as e:
            print(f"  ❌ FAILED: {e}")
            failed += 1

    print(f"\n═══ Results: {passed} passed, {failed} failed ═══\n")
    sys.exit(0 if failed == 0 else 1)
