"""
Prayana — Live End-to-End API Smoke Test
=========================================
Tests all 7 FastAPI endpoints against the live server:
  1. GET  /api/health
  2. POST /api/v1/route/optimize (CP-SAT solver)
  3. POST /api/v1/budget/rebalance (4-bucket rebalancing)
  4. POST /api/v1/vitals/evaluate (Google Health telemetry + WBGT)
  5. POST /api/v1/disruption/reroute (Weather disruption + indoor swap)
  6. POST /api/v1/ocr/scan-menu (Real local OCR with generated PNG "Peanut Curry")
  7. POST /api/v1/copilot/command (Gemini AI Copilot action router)

Usage:
    python backend/scripts/test_live_endpoints.py
"""

from __future__ import annotations

import io
import os
import sys
import httpx
from PIL import Image, ImageDraw

BASE_URL = os.getenv("API_URL", "http://127.0.0.1:8000")


def generate_test_menu_png() -> bytes:
    """Creates a high-contrast in-memory PNG menu containing 'Peanut Curry'."""
    img = Image.new("RGB", (480, 180), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    lines = [
        "ROYAL HERITAGE CAFE",
        "1. STEAMED IDLI & SAMBAR",
        "2. SPICY PEANUT CURRY",
        "3. STEAMED BASMATI RICE",
    ]
    y = 20
    for line in lines:
        draw.text((25, y), line, fill=(0, 0, 0))
        y += 35

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run_smoke_tests():
    print("=" * 72)
    print("PRAYANA LIVE END-TO-END SMOKE TEST SUITE")
    print(f"Target: {BASE_URL}")
    print("=" * 72)

    passed = 0
    total = 7

    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        # -------------------------------------------------------------------
        # 1. Health Probe
        # -------------------------------------------------------------------
        print("\n[1/7] Testing GET /api/health ...")
        r = client.get("/api/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("status") == "PRAYANA_BACKEND_ONLINE", f"Unexpected: {data}"
        print(f"      PASS: {data['status']} (v{data['version']}, {len(data['modules'])} modules)")
        passed += 1

        # -------------------------------------------------------------------
        # 2. Route Optimizer (CP-SAT)
        # -------------------------------------------------------------------
        print("\n[2/7] Testing POST /api/v1/route/optimize (CP-SAT) ...")
        route_req = {
            "travelers": [
                {
                    "id": "t1",
                    "name": "Aarav Chen",
                    "age": 28,
                    "mobility": "Standard",
                    "cardiac_coeff": 0.0,
                    "respiratory_coeff": 0.0,
                    "mobility_coeff": 0.0,
                    "alpha_k": 1.0,
                    "beta_k": 0.05,
                },
                {
                    "id": "t2",
                    "name": "Rajan Iyer",
                    "age": 72,
                    "mobility": "Senior / Reduced Mobility",
                    "cardiac_coeff": 0.4,
                    "respiratory_coeff": 0.2,
                    "mobility_coeff": 0.2,
                    "alpha_k": 1.3,
                    "beta_k": 0.08,
                },
            ],
            "poi_candidates": [
                {
                    "id": "hmp-1",
                    "name": "Virupaksha Temple",
                    "lat": 15.335,
                    "lon": 76.461,
                    "distance_km": 0.4,
                    "elevation_gain_m": 12,
                    "slope_deg": 1.2,
                    "wbgt_celsius": 30.5,
                },
                {
                    "id": "hmp-2",
                    "name": "Elephant Stables",
                    "lat": 15.317,
                    "lon": 76.465,
                    "distance_km": 0.3,
                    "elevation_gain_m": 4,
                    "slope_deg": 0.3,
                    "wbgt_celsius": 30.5,
                },
                {
                    "id": "hmp-3",
                    "name": "Archaeological Museum",
                    "lat": 15.336,
                    "lon": 76.461,
                    "distance_km": 0.2,
                    "elevation_gain_m": 0,
                    "slope_deg": 0.0,
                    "wbgt_celsius": 26.0,
                    "is_indoor": True,
                },
            ],
            "max_daily_effort": 8.0,
            "pinned_stop_ids": ["hmp-1"],
        }
        r = client.post("/api/v1/route/optimize", json=route_req)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert len(data["ordered_stops"]) == 3
        assert data["solver_status"] in ("OPTIMAL", "FEASIBLE", "GREEDY_FALLBACK")
        print(f"      PASS: Solver status={data['solver_status']}, solve_time={data['solve_time_ms']}ms, order={[s['name'] for s in data['ordered_stops']]}")
        passed += 1

        # -------------------------------------------------------------------
        # 3. Budget Rebalancer (4-Bucket Dynamic Rebalance)
        # -------------------------------------------------------------------
        print("\n[3/7] Testing POST /api/v1/budget/rebalance ...")
        budget_req = {
            "total_budget": 42000.0,
            "expenses": [
                {"id": "e1", "category": "stays", "amount": 16500.0, "label": "Heritage Hotel"},
                {"id": "e2", "category": "food", "amount": 6200.0, "label": "Local Dining"},
            ],
            "days_remaining": 2,
            "days_total": 3,
        }
        r = client.post("/api/v1/budget/rebalance", json=budget_req)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        targets = data["updated_targets"]
        assert targets["stays"] > 0 and targets["food"] >= 0 and targets["transit"] > 0
        print(f"      PASS: Overspend=₹{data['overspend_delta']:,.0f}, Daily Targets=[Stays: ₹{targets['stays']:,.0f}, Food: ₹{targets['food']:,.0f}, Transit: ₹{targets['transit']:,.0f}, Activities: ₹{targets['activities']:,.0f}]")
        passed += 1

        # -------------------------------------------------------------------
        # 4. Google Health Vitals & WBGT Evaluator
        # -------------------------------------------------------------------
        print("\n[4/7] Testing POST /api/v1/vitals/evaluate (Google Health + WBGT) ...")
        vitals_req = {
            "travelers": [
                {
                    "id": "t1",
                    "name": "Rajan Iyer",
                    "age": 72,
                    "mobility": "Senior / Reduced Mobility",
                    "cardiac_coeff": 0.45,
                    "respiratory_coeff": 0.25,
                    "mobility_coeff": 0.2,
                    "hr_bpm": 114,
                    "spo2": 93.5,
                }
            ],
            "ambient_wbgt": 33.2,
            "destination_id": "hampi",
        }
        r = client.post("/api/v1/vitals/evaluate", json=vitals_req)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["results"][0]["strain_level"] in ("MODERATE", "ELEVATED")
        print(f"      PASS: Rajan Iyer Strain={data['results'][0]['strain_level']}, Alpha={data['results'][0]['alpha_k']}, Computed WBGT={data.get('computed_wbgt')}°C")
        passed += 1

        # -------------------------------------------------------------------
        # 5. Weather Disruption & Indoor Rerouter
        # -------------------------------------------------------------------
        print("\n[5/7] Testing POST /api/v1/disruption/reroute (Storm & Indoor Swap) ...")
        disrupt_req = {
            "travelers": route_req["travelers"],
            "stops": route_req["poi_candidates"],
            "disruption_type": "rain",
            "pinned_stop_ids": ["hmp-1"],
        }
        r = client.post("/api/v1/disruption/reroute", json=disrupt_req)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert len(data["rerouted_stops"]) == 3
        indoor_count = sum(1 for s in data["rerouted_stops"] if s["is_indoor"])
        assert indoor_count >= 2, f"Expected indoor swap, got {indoor_count}"
        print(f"      PASS: Disruption='{data['disruption_summary']}', Indoor Stops={indoor_count}/3")
        passed += 1

        # -------------------------------------------------------------------
        # 6. Real Local Menu OCR (Windows Tesseract on PNG "Peanut Curry")
        # -------------------------------------------------------------------
        print("\n[6/7] Testing POST /api/v1/ocr/scan-menu (Local Tesseract on Generated PNG) ...")
        png_bytes = generate_test_menu_png()
        files = {"image": ("test_menu.png", png_bytes, "image/png")}
        form_data = {"declared_allergens": "Nut Allergy,Shellfish Allergy"}

        r = client.post("/api/v1/ocr/scan-menu", files=files, data=form_data)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["result"] == "HAZARD_ALERT", f"Expected HAZARD_ALERT, got {data['result']}"
        assert "Nut Allergy" in data["matched_allergens"], f"Expected Nut Allergy, got {data['matched_allergens']}"
        assert data["ocr_available"] is True, "Expected ocr_available=True with local Tesseract auto-detection"
        assert "SAFE" not in data["result"], "Safety rule violation: returned SAFE"
        print(f"      PASS: Result={data['result']}, Matched Allergens={data['matched_allergens']}, Tokens={data['matched_tokens']}, OCR Active={data['ocr_available']}")
        passed += 1

        # -------------------------------------------------------------------
        # 7. Gemini Copilot Action Router
        # -------------------------------------------------------------------
        print("\n[7/7] Testing POST /api/v1/copilot/command (Gemini AI Action Router) ...")
        copilot_req = {
            "command": "Make Day 2 more relaxed and add rest intervals",
            "current_state": {
                "destination": "Hampi",
                "stops": route_req["poi_candidates"],
            },
        }
        r = client.post("/api/v1/copilot/command", json=copilot_req)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["action_type"] in ("RELAX_PACING", "ADJUST_EFFORT", "REORDER_STOPS")
        print(f"      PASS: Action={data['action_type']} (Source: {data['source']}), Explanation='{data['explanation']}'")
        passed += 1

    print("\n" + "=" * 72)
    print(f"ALL {passed}/{total} LIVE END-TO-END SMOKE TESTS PASSED CLEANLY! [100%]")
    print("=" * 72)


if __name__ == "__main__":
    try:
        run_smoke_tests()
    except Exception as exc:
        print(f"\n❌ SMOKE TEST FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
