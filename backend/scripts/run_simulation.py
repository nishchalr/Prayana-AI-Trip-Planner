"""
Prayana — Deterministic Benchmark Simulation Script
====================================================
Seed = 42.  Generates 4 synthetic cohorts across Indian micro-climates,
runs route_optimizer + budget_allocator for each, logs JSON/CSV metrics,
and prints Mean ± SD tables for the Phase-I report.

Usage:
    cd backend
    python scripts/run_simulation.py
"""

from __future__ import annotations

import csv
import json
import os
import random
import sys
import time
from pathlib import Path
from typing import List

import numpy as np

# Allow importing from backend/app/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

random.seed(42)
np.random.seed(42)

from app.models.schemas import (
    BudgetRebalanceRequest,
    ExpenseItem,
    MobilityLevel,
    POICandidate,
    RouteOptimizeRequest,
    StrainLevel,
    TravelerProfile,
)
from app.services.budget_allocator import rebalance_budget
from app.services.route_optimizer import optimize_route

# ---------------------------------------------------------------------------
# Synthetic Destinations (Phase-I Table 2.1)
# ---------------------------------------------------------------------------

DESTINATIONS = [
    {
        "name": "Hampi",
        "pois": [
            {"id": "hmp-1", "name": "Virupaksha Temple",    "lat": 15.335, "lon": 76.461, "distance_km": 0.4, "elev_m": 12,  "slope_deg": 1.2, "wbgt": 32.1, "indoor": False},
            {"id": "hmp-2", "name": "Stone Chariot",        "lat": 15.317, "lon": 76.462, "distance_km": 0.6, "elev_m": 8,   "slope_deg": 0.8, "wbgt": 32.1, "indoor": False},
            {"id": "hmp-3", "name": "Elephant Stables",     "lat": 15.317, "lon": 76.465, "distance_km": 0.3, "elev_m": 4,   "slope_deg": 0.3, "wbgt": 32.1, "indoor": False},
            {"id": "hmp-4", "name": "Archaeological Museum", "lat": 15.336, "lon": 76.461, "distance_km": 0.2, "elev_m": 0,   "slope_deg": 0.0, "wbgt": 28.5, "indoor": True},
            {"id": "hmp-5", "name": "Hemakuta Hill",         "lat": 15.332, "lon": 76.459, "distance_km": 0.9, "elev_m": 48,  "slope_deg": 6.2, "wbgt": 33.0, "indoor": False},
        ],
        "travelers": [
            {"id": "sim-h1", "name": "Aarav Chen",   "age": 28, "mob": MobilityLevel.high_fitness,   "c_card": 0.0,  "c_resp": 0.0,  "c_mob": 0.0,  "hr": 65,  "spo2": 99.0, "strain": StrainLevel.low},
            {"id": "sim-h2", "name": "Priya Sharma",  "age": 56, "mob": MobilityLevel.senior,         "c_card": 0.35, "c_resp": 0.1,  "c_mob": 0.2,  "hr": 88,  "spo2": 97.0, "strain": StrainLevel.moderate},
            {"id": "sim-h3", "name": "Rajan Iyer",    "age": 72, "mob": MobilityLevel.wheelchair,     "c_card": 0.5,  "c_resp": 0.3,  "c_mob": 0.8,  "hr": 94,  "spo2": 95.0, "strain": StrainLevel.moderate},
        ],
        "total_budget": 42000,
        "days": 3,
    },
    {
        "name": "Coorg",
        "pois": [
            {"id": "crg-1", "name": "Raja's Seat",         "lat": 12.421, "lon": 75.736, "distance_km": 0.3, "elev_m": 5,   "slope_deg": 1.0, "wbgt": 26.5, "indoor": False},
            {"id": "crg-2", "name": "Dubare Elephant Camp", "lat": 12.401, "lon": 75.737, "distance_km": 2.1, "elev_m": 65,  "slope_deg": 4.5, "wbgt": 27.0, "indoor": False},
            {"id": "crg-3", "name": "Abbey Falls",          "lat": 12.431, "lon": 75.728, "distance_km": 1.4, "elev_m": 42,  "slope_deg": 7.1, "wbgt": 25.8, "indoor": False},
            {"id": "crg-4", "name": "Omkareshwara Temple",  "lat": 12.423, "lon": 75.737, "distance_km": 0.4, "elev_m": 8,   "slope_deg": 0.5, "wbgt": 27.0, "indoor": False},
        ],
        "travelers": [
            {"id": "sim-c1", "name": "Meera Pillai", "age": 34, "mob": MobilityLevel.standard,    "c_card": 0.0,  "c_resp": 0.1, "c_mob": 0.0, "hr": 72,  "spo2": 98.5, "strain": StrainLevel.low},
            {"id": "sim-c2", "name": "Kabir Singh",   "age": 41, "mob": MobilityLevel.standard,    "c_card": 0.1,  "c_resp": 0.0, "c_mob": 0.0, "hr": 78,  "spo2": 98.0, "strain": StrainLevel.low},
            {"id": "sim-c3", "name": "Diya Reddy",    "age": 62, "mob": MobilityLevel.senior,      "c_card": 0.25, "c_resp": 0.2, "c_mob": 0.15,"hr": 86,  "spo2": 96.5, "strain": StrainLevel.moderate},
            {"id": "sim-c4", "name": "Veer Kumar",    "age": 19, "mob": MobilityLevel.high_fitness, "c_card": 0.0,  "c_resp": 0.0, "c_mob": 0.0, "hr": 58,  "spo2": 99.5, "strain": StrainLevel.low},
        ],
        "total_budget": 36000,
        "days": 2,
    },
    {
        "name": "Kyoto",
        "pois": [
            {"id": "kyo-1", "name": "Fushimi Inari",   "lat": 34.967, "lon": 135.773, "distance_km": 2.2, "elev_m": 233, "slope_deg": 8.5, "wbgt": 24.2, "indoor": False},
            {"id": "kyo-2", "name": "Kinkaku-ji",      "lat": 35.039, "lon": 135.728, "distance_km": 0.5, "elev_m": 10,  "slope_deg": 1.2, "wbgt": 24.2, "indoor": False},
            {"id": "kyo-3", "name": "Nishiki Market",  "lat": 35.005, "lon": 135.766, "distance_km": 0.3, "elev_m": 0,   "slope_deg": 0.0, "wbgt": 24.0, "indoor": True},
            {"id": "kyo-4", "name": "Arashiyama Grove","lat": 35.014, "lon": 135.671, "distance_km": 1.8, "elev_m": 28,  "slope_deg": 2.1, "wbgt": 24.5, "indoor": False},
        ],
        "travelers": [
            {"id": "sim-k1", "name": "Yuki Tanaka",  "age": 29, "mob": MobilityLevel.standard,    "c_card": 0.0, "c_resp": 0.0, "c_mob": 0.0, "hr": 68,  "spo2": 99.0, "strain": StrainLevel.low},
            {"id": "sim-k2", "name": "Haruto Sato",  "age": 68, "mob": MobilityLevel.senior,      "c_card": 0.3, "c_resp": 0.1, "c_mob": 0.1, "hr": 82,  "spo2": 97.5, "strain": StrainLevel.low},
            {"id": "sim-k3", "name": "Aiko Suzuki",  "age": 45, "mob": MobilityLevel.standard,    "c_card": 0.1, "c_resp": 0.0, "c_mob": 0.0, "hr": 74,  "spo2": 98.5, "strain": StrainLevel.low},
        ],
        "total_budget": 68000,
        "days": 4,
    },
    {
        "name": "Varanasi",
        "pois": [
            {"id": "vns-1", "name": "Dashashwamedh Ghat",   "lat": 25.307, "lon": 83.011, "distance_km": 0.8, "elev_m": 10,  "slope_deg": 0.5, "wbgt": 34.8, "indoor": False},
            {"id": "vns-2", "name": "Kashi Vishwanath",     "lat": 25.311, "lon": 83.010, "distance_km": 0.3, "elev_m": 5,   "slope_deg": 1.0, "wbgt": 34.8, "indoor": False},
            {"id": "vns-3", "name": "Sarnath Museum",       "lat": 25.381, "lon": 83.023, "distance_km": 0.4, "elev_m": 2,   "slope_deg": 0.2, "wbgt": 30.0, "indoor": True},
            {"id": "vns-4", "name": "Ramnagar Fort",        "lat": 25.267, "lon": 83.023, "distance_km": 1.2, "elev_m": 18,  "slope_deg": 2.3, "wbgt": 34.5, "indoor": False},
            {"id": "vns-5", "name": "Manikarnika Ghat",     "lat": 25.313, "lon": 83.010, "distance_km": 0.5, "elev_m": 8,   "slope_deg": 1.5, "wbgt": 35.2, "indoor": False},
        ],
        "travelers": [
            {"id": "sim-v1", "name": "Ramesh Gupta",  "age": 65, "mob": MobilityLevel.senior,         "c_card": 0.4,  "c_resp": 0.2, "c_mob": 0.1,  "hr": 91,  "spo2": 95.5, "strain": StrainLevel.moderate},
            {"id": "sim-v2", "name": "Sunita Devi",   "age": 61, "mob": MobilityLevel.senior,         "c_card": 0.2,  "c_resp": 0.3, "c_mob": 0.1,  "hr": 85,  "spo2": 96.0, "strain": StrainLevel.low},
            {"id": "sim-v3", "name": "Arjun Gupta",   "age": 38, "mob": MobilityLevel.standard,       "c_card": 0.0,  "c_resp": 0.0, "c_mob": 0.0,  "hr": 70,  "spo2": 98.5, "strain": StrainLevel.low},
            {"id": "sim-v4", "name": "Naina Gupta",   "age": 32, "mob": MobilityLevel.standard,       "c_card": 0.0,  "c_resp": 0.0, "c_mob": 0.0,  "hr": 73,  "spo2": 98.5, "strain": StrainLevel.low},
        ],
        "total_budget": 28000,
        "days": 2,
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _alpha_from_strain(strain: StrainLevel) -> float:
    return {StrainLevel.low: 1.0, StrainLevel.moderate: 1.3, StrainLevel.elevated: 1.6}[strain]


def _build_travelers(specs: list) -> List[TravelerProfile]:
    return [
        TravelerProfile(
            id=s["id"], name=s["name"], age=s["age"], mobility=s["mob"],
            cardiac_coeff=s["c_card"], respiratory_coeff=s["c_resp"],
            mobility_coeff=s["c_mob"],
            alpha_k=_alpha_from_strain(s["strain"]),
            beta_k=round(random.uniform(0.0, 0.1), 3),
            hr_bpm=s["hr"], spo2=s["spo2"], strain_level=s["strain"],
        )
        for s in specs
    ]


def _build_pois(raw: list) -> List[POICandidate]:
    return [
        POICandidate(
            id=p["id"], name=p["name"], lat=p["lat"], lon=p["lon"],
            distance_km=p["distance_km"], elevation_gain_m=p["elev_m"],
            slope_deg=p["slope_deg"], wbgt_celsius=p["wbgt"],
            is_indoor=p["indoor"], is_pinned=False,
        )
        for p in raw
    ]


def _build_expenses(total: float, days: int, days_remaining: int) -> List[ExpenseItem]:
    """
    Generate realistic mid-trip expenses with a calibrated shock of 10%–18%
    of total budget (e.g. ₹4,000–₹8,500) over planned spend up to the current day.
    """
    days_gone = max(1, days - days_remaining)
    planned_to_now = total * (days_gone / days)

    # Calibrated mid-trip shock: 10% to 18% of total trip budget (e.g. ₹4,000–₹8,500)
    shock_pct = random.uniform(0.10, 0.18)
    shock_amount = round(total * shock_pct, 0)

    # Total expenses incurred up to now: planned spend + calibrated mid-trip shock
    spent_to_now = planned_to_now + shock_amount

    # Distribute realistically across canonical categories
    # Stays absorbed 35% of planned + 20% of shock (e.g. room upgrade)
    # Food absorbed 25% of planned + 45% of shock (e.g. special heritage dinners)
    # Transit absorbed 20% of planned + 10% of shock
    # Activities absorbed remaining portion of shock
    stays_amt = round(0.35 * planned_to_now + 0.20 * shock_amount, 0)
    food_amt = round(0.25 * planned_to_now + 0.45 * shock_amount, 0)
    transit_amt = round(0.20 * planned_to_now + 0.10 * shock_amount, 0)
    activities_amt = round(spent_to_now - (stays_amt + food_amt + transit_amt), 0)

    return [
        ExpenseItem(id="e-stays",     category="stays",      amount=stays_amt,      label="Hotel & Heritage Homestay"),
        ExpenseItem(id="e-food",      category="food",       amount=food_amt,       label="Dining & Coastal Specials"),
        ExpenseItem(id="e-transit",   category="transit",    amount=transit_amt,    label="Local Auto & Hired Cab"),
        ExpenseItem(id="e-activities",category="activities", amount=activities_amt, label="Entry Tickets & Audio Guide"),
    ]


# ---------------------------------------------------------------------------
# Main Simulation Loop
# ---------------------------------------------------------------------------

def run_simulation() -> None:
    all_metrics = []

    print("=" * 72)
    print("PRAYANA DETERMINISTIC BENCHMARK SIMULATION  [seed=42]")
    print("=" * 72)

    # 1. Untimed warm-up solve: ensures CP-SAT libraries and JIT are pre-warmed
    print("\nExecuting untimed CP-SAT warm-up solve...")
    _warmup_travelers = _build_travelers(DESTINATIONS[0]["travelers"][:2])
    _warmup_pois = _build_pois(DESTINATIONS[0]["pois"][:3])
    _warmup_req = RouteOptimizeRequest(
        travelers=_warmup_travelers,
        poi_candidates=_warmup_pois,
        max_daily_effort=8.0,
    )
    _warmup_resp = optimize_route(_warmup_req)
    print(f"Warm-up complete (status: {_warmup_resp.solver_status}). Starting timed benchmark loop...\n")

    for dest in DESTINATIONS:
        print(f"── {dest['name'].upper()} ─────────────────────────────────────────")
        travelers = _build_travelers(dest["travelers"])
        pois      = _build_pois(dest["pois"])
        days_remaining = max(1, dest["days"] - 1)
        expenses  = _build_expenses(dest["total_budget"], dest["days"], days_remaining)

        # --- Route Optimizer ---
        opt_req = RouteOptimizeRequest(
            travelers=travelers,
            poi_candidates=pois,
            max_daily_effort=8.0,
            pinned_stop_ids=[pois[0].id],
        )
        opt_resp = optimize_route(opt_req)

        # --- Budget Rebalancer ---
        bud_req = BudgetRebalanceRequest(
            total_budget=float(dest["total_budget"]),
            expenses=expenses,
            days_remaining=days_remaining,
            days_total=dest["days"],
        )
        bud_resp = rebalance_budget(bud_req)

        # Compute recovery rate: fraction of stops with group_penalty < soft_per_leg
        soft = opt_req.max_daily_effort / max(len(opt_resp.ordered_stops), 1)
        recovery_rate = sum(1 for s in opt_resp.ordered_stops if s.group_penalty < soft) / max(len(opt_resp.ordered_stops), 1)
        budget_variance = abs(bud_resp.overspend_delta / float(dest["total_budget"]))

        metric = {
            "destination":      dest["name"],
            "n_travelers":      len(travelers),
            "n_stops":          len(pois),
            "solve_time_ms":    opt_resp.solve_time_ms,
            "solver_status":    opt_resp.solver_status,
            "exceedances":      opt_resp.exceedances,
            "recovery_rate":    round(recovery_rate, 4),
            "budget_variance":  round(budget_variance, 4),
            "overspend_inr":    bud_resp.overspend_delta,
            "group_max_strain": max(opt_resp.strain_scores.values(), default=0),
        }
        all_metrics.append(metric)

        print(f"  Solver:          {opt_resp.solver_status}  ({opt_resp.solve_time_ms:.1f} ms)")
        print(f"  Stops ordered:   {[s.name for s in opt_resp.ordered_stops]}")
        print(f"  Exceedances:     {opt_resp.exceedances} / {len(opt_resp.ordered_stops)}")
        print(f"  Recovery rate:   {recovery_rate:.1%}")
        print(f"  Budget overspend: ₹{bud_resp.overspend_delta:,.0f} ({budget_variance:.1%} variance)")
        print(f"  Rebalanced daily: Stays ₹{bud_resp.updated_targets.stays:,.0f}  Food ₹{bud_resp.updated_targets.food:,.0f}  Transit ₹{bud_resp.updated_targets.transit:,.0f}  Activities ₹{bud_resp.updated_targets.activities:,.0f}")

    # --- Summary Statistics ---
    print("\n" + "=" * 72)
    print("SUMMARY STATISTICS (Mean ± SD)")
    print("=" * 72)
    for key in ("solve_time_ms", "exceedances", "recovery_rate", "budget_variance"):
        vals = [m[key] for m in all_metrics]
        mean = float(np.mean(vals))
        sd   = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
        print(f"  {key:<22}:  {mean:.4f}  ±  {sd:.4f}")

    # --- Persist Results ---
    out_dir = Path(__file__).parent.parent / "outputs"
    out_dir.mkdir(exist_ok=True)

    json_path = out_dir / "simulation_results.json"
    csv_path  = out_dir / "simulation_metrics.csv"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_metrics[0].keys())
        writer.writeheader()
        writer.writerows(all_metrics)

    print(f"\n  Results → {json_path}")
    print(f"  Metrics  → {csv_path}")
    print("=" * 72)


if __name__ == "__main__":
    run_simulation()
