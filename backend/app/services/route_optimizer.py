"""
Prayana — Effort-Aware CP-SAT Route Optimizer
=============================================
Implements the mathematical model from Phase-I Section 4:

  Individual segment effort penalty (Phase-I Eq. 4.1):
      ψ_ij(u_k) = α_k · (1 + β_k) · d_ij
                  · exp( γ₁·(1+c_mob)·max(0, tan θ_ij)
                        + γ₂·c_card·(Δh⁺_ij / 100)
                        + γ₃·c_resp·Φ(W_ij) )
      with exponent capped at 3.0

  Group penalty (Phase-I Eq. 4.2):
      Ψ_ij(U) = max_k ψ_ij(u_k) + λ · Σ_k ψ_ij(u_k),   λ = 0.05

  CP-SAT:  x_ij ∈ {0,1} routing vars, u_i MTZ ordering vars.
  Fixed-point scaling: costs × 1000 → int.
  Solver time limit: 1.0 s.  Falls back to greedy nearest-neighbour.
"""

from __future__ import annotations

import math
import time
from typing import List, Optional, Tuple

from app.models.schemas import (
    POICandidate,
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    StopResult,
    StrainLevel,
    TravelerProfile,
)

# Pre-import CP-SAT solver module at top level so first-call module loading
# does not inflate request solve times
try:
    from ortools.sat.python import cp_model  # type: ignore
    _ORTOOLS_AVAILABLE = True
except Exception:
    cp_model = None  # type: ignore
    _ORTOOLS_AVAILABLE = False

# Physical constants (Phase-I Table 4.1)
GAMMA_1 = 0.30   # slope exponent coefficient
GAMMA_2 = 0.40   # elevation gain coefficient
GAMMA_3 = 0.50   # heat stress coefficient
LAMBDA   = 0.05  # group-lag weight
FP_SCALE = 1000  # fixed-point integer scale
EXP_CAP  = 3.0   # maximum exponent before exp()


# ---------------------------------------------------------------------------
# Heat-Stress Transfer Function Φ(W) (Phase-I Eq. 4.3)
# ---------------------------------------------------------------------------

def phi_wbgt(wbgt: float) -> float:
    """
    Quadratic WBGT heat-stress function:
      Φ(W) = 0                       if W < 26
           = (W - 26)² / 81          if 26 ≤ W ≤ 35
           = 1                       if W > 35
    """
    if wbgt < 26.0:
        return 0.0
    if wbgt > 35.0:
        return 1.0
    return ((wbgt - 26.0) ** 2) / 81.0


# ---------------------------------------------------------------------------
# Individual Segment Effort Penalty ψ_ij(u_k)
# ---------------------------------------------------------------------------

def segment_effort(
    traveler: TravelerProfile,
    distance_km: float,
    elevation_gain_m: float,
    slope_deg: float,
    wbgt: float,
) -> float:
    """
    Computes ψ_ij(u_k) for a single traveler on a single route segment.
    """
    alpha_k = traveler.alpha_k
    beta_k  = traveler.beta_k
    c_mob   = traveler.mobility_coeff
    c_card  = traveler.cardiac_coeff
    c_resp  = traveler.respiratory_coeff

    tan_theta = math.tan(math.radians(max(0.0, slope_deg)))
    dh_norm   = max(0.0, elevation_gain_m) / 100.0
    phi       = phi_wbgt(wbgt)

    exponent = (
        GAMMA_1 * (1.0 + c_mob) * tan_theta
        + GAMMA_2 * c_card * dh_norm
        + GAMMA_3 * c_resp * phi
    )
    exponent = min(exponent, EXP_CAP)

    return alpha_k * (1.0 + beta_k) * distance_km * math.exp(exponent)


# ---------------------------------------------------------------------------
# Group Penalty Ψ_ij(U)
# ---------------------------------------------------------------------------

def group_effort(
    travelers: List[TravelerProfile],
    distance_km: float,
    elevation_gain_m: float,
    slope_deg: float,
    wbgt: float,
) -> float:
    """Ψ_ij(U) = max_k ψ_ij(u_k) + λ · Σ_k ψ_ij(u_k)"""
    penalties = [
        segment_effort(t, distance_km, elevation_gain_m, slope_deg, wbgt)
        for t in travelers
    ]
    return max(penalties) + LAMBDA * sum(penalties)


# ---------------------------------------------------------------------------
# Wheelchair Slope Check
# ---------------------------------------------------------------------------

def _wheelchair_in_group(travelers: List[TravelerProfile]) -> bool:
    return any(t.mobility_coeff > 0.5 for t in travelers)


def _slope_ok(slope_deg: float, threshold: float, wheelchair: bool) -> bool:
    return not wheelchair or slope_deg <= threshold


# ---------------------------------------------------------------------------
# Greedy Nearest-Neighbour Fallback
# ---------------------------------------------------------------------------

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _greedy_route(
    pois: List[POICandidate],
    travelers: List[TravelerProfile],
    wheelchair: bool,
    slope_thresh: float,
) -> List[int]:
    """Nearest-neighbour greedy order (filtered by wheelchair constraint)."""
    eligible = [
        i for i, p in enumerate(pois)
        if _slope_ok(p.slope_deg, slope_thresh, wheelchair)
    ]
    if not eligible:
        eligible = list(range(len(pois)))

    pinned_first = [i for i in eligible if pois[i].is_pinned]
    free         = [i for i in eligible if not pois[i].is_pinned]

    route = [*pinned_first]
    if not route:
        route = [free.pop(0)] if free else []

    while free:
        last = pois[route[-1]]
        nearest = min(free, key=lambda i: _haversine(last.lat, last.lon, pois[i].lat, pois[i].lon))
        route.append(nearest)
        free.remove(nearest)

    return route


# ---------------------------------------------------------------------------
# CP-SAT Solver
# ---------------------------------------------------------------------------

def _build_cost_matrix(
    pois: List[POICandidate],
    travelers: List[TravelerProfile],
    wheelchair: bool,
    slope_thresh: float,
) -> List[List[int]]:
    """
    Returns NxN integer cost matrix (group_effort × FP_SCALE).
    Infeasible arcs get a large sentinel value.
    """
    n = len(pois)
    INFEASIBLE = 10 ** 9
    matrix: List[List[int]] = []

    for i, src in enumerate(pois):
        row: List[int] = []
        for j, dst in enumerate(pois):
            if i == j:
                row.append(INFEASIBLE)
                continue
            # Wheelchair slope feasibility check on destination leg
            if not _slope_ok(dst.slope_deg, slope_thresh, wheelchair):
                row.append(INFEASIBLE)
                continue
            dist = src.distance_km + dst.distance_km  # proxy: sum of radii
            g = group_effort(travelers, dist, dst.elevation_gain_m, dst.slope_deg, dst.wbgt_celsius)
            row.append(int(g * FP_SCALE))
        matrix.append(row)

    return matrix


def optimize_route(req: RouteOptimizeRequest) -> RouteOptimizeResponse:
    """
    Main entry point.  Attempts CP-SAT within 1.0 s;
    falls back to greedy nearest-neighbour on timeout.
    """
    t_start = time.monotonic()
    pois      = req.poi_candidates
    travelers = req.travelers
    n         = len(pois)
    wheelchair = _wheelchair_in_group(travelers)
    slope_thresh = req.slope_threshold_deg

    # --- Attempt CP-SAT ------------------------------------------------
    solver_status = "GREEDY_FALLBACK"
    ordered_indices: Optional[List[int]] = None

    if _ORTOOLS_AVAILABLE and cp_model is not None:
        try:
            cost_matrix = _build_cost_matrix(pois, travelers, wheelchair, slope_thresh)
            INFEASIBLE  = 10 ** 9

            model = cp_model.CpModel()

            # x[i][j] = 1 iff we travel directly from POI i to POI j
            x = [[model.NewBoolVar(f"x_{i}_{j}") for j in range(n)] for i in range(n)]
            # u[i] = MTZ ordering variable (1 … n-1 for non-depot nodes)
            u = [model.NewIntVar(1, n, f"u_{i}") for i in range(n)]

            # Each node visited exactly once (in-degree = 1, out-degree = 1)
            for i in range(n):
                model.Add(sum(x[i][j] for j in range(n) if j != i) == 1)
                model.Add(sum(x[j][i] for j in range(n) if j != i) == 1)

            # MTZ subtour elimination
            for i in range(1, n):
                for j in range(1, n):
                    if i != j:
                        model.Add(u[i] - u[j] + n * x[i][j] <= n - 1)

            # Hard-pin first stop if requested
            pinned_ids = set(req.pinned_stop_ids)
            pinned_indices = [k for k, p in enumerate(pois) if p.id in pinned_ids]
            if pinned_indices:
                # Force depot → first pinned as first arc
                first_pin = pinned_indices[0]
                model.Add(u[first_pin] == 1)

            # Objective: minimise total group effort
            model.Minimize(
                sum(cost_matrix[i][j] * x[i][j] for i in range(n) for j in range(n) if i != j)
            )

            solver = cp_model.CpSolver()
            # Enforce 1.0 second solver ceiling
            solver.parameters.max_time_in_seconds = 1.0
            status = solver.Solve(model)

            if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                # Reconstruct tour starting from node 0
                current = 0
                tour = [0]
                visited = {0}
                for _ in range(n - 1):
                    nxt = next(
                        (j for j in range(n) if j not in visited and solver.Value(x[current][j]) == 1),
                        None,
                    )
                    if nxt is None:
                        break
                    tour.append(nxt)
                    visited.add(nxt)
                    current = nxt
                ordered_indices = tour
                solver_status = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"

        except Exception as exc:
            import sys
            print(f"[route_optimizer] CP-SAT execution failed ({exc}), using greedy.", file=sys.stderr)

    if ordered_indices is None:
        ordered_indices = _greedy_route(pois, travelers, wheelchair, slope_thresh)
        solver_status = "GREEDY_FALLBACK"

    # --- Build response -----------------------------------------------
    solve_ms = (time.monotonic() - t_start) * 1000.0
    ordered_stops: List[StopResult] = []
    transit_times: List[float] = []
    strain_scores: dict[str, float] = {t.id: 0.0 for t in travelers}
    exceedances = 0
    soft_per_leg = req.max_daily_effort / max(len(ordered_indices), 1)

    for rank, idx in enumerate(ordered_indices):
        p = pois[idx]
        # Compute transit from previous stop
        if rank > 0:
            prev = pois[ordered_indices[rank - 1]]
            dist_km = _haversine(prev.lat, prev.lon, p.lat, p.lon)
            speed_kmh = 20.0 if p.is_indoor else 15.0
            transit_times.append(round(dist_km / speed_kmh * 60, 1))
        else:
            transit_times.append(0.0)

        g = group_effort(travelers, p.distance_km, p.elevation_gain_m, p.slope_deg, p.wbgt_celsius)
        if g > soft_per_leg:
            exceedances += 1

        for t in travelers:
            strain_scores[t.id] += segment_effort(t, p.distance_km, p.elevation_gain_m, p.slope_deg, p.wbgt_celsius)

        ordered_stops.append(StopResult(
            id=p.id, name=p.name, lat=p.lat, lon=p.lon,
            group_penalty=round(g, 4),
            is_indoor=p.is_indoor,
            is_pinned=p.is_pinned,
        ))

    return RouteOptimizeResponse(
        ordered_stops=ordered_stops,
        transit_times_min=transit_times,
        strain_scores={k: round(v, 4) for k, v in strain_scores.items()},
        solve_time_ms=round(solve_ms, 2),
        exceedances=exceedances,
        solver_status=solver_status,
        source="cp_sat" if solver_status != "GREEDY_FALLBACK" else "greedy_fallback",
    )
