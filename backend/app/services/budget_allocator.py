"""
Prayana — 4-Bucket Dynamic Budget Rebalancer
============================================
Implements Phase-I Section 5 budget model:

  Canonical bucket split:
      Stays 35%  |  Food & Dining 25%  |  Local Transit 20%  |  Activities & Buffer 20%

  Rebalance weights ω (how aggressively each bucket absorbs overspend):
      ω = {stays: 0.15, food: 0.30, transit: 0.05, buffer: 0.50}

  For each bucket b:
      new_target_b = canonical_b - ω_b × max(0, Δ_t)
      then clipped to max(0, ...) and proportional spillover applied
      (Local Transit is never trimmed below 10% of remaining daily budget).
"""

from __future__ import annotations

from typing import List

from app.models.schemas import (
    BudgetRebalanceRequest,
    BudgetRebalanceResponse,
    BudgetTargets,
    ExpenseItem,
)

# Canonical bucket fractions
CANONICAL = {"stays": 0.35, "food": 0.25, "transit": 0.20, "activities": 0.20}

# Rebalance weights (how hard each bucket is trimmed under overspend)
OMEGA = {"stays": 0.15, "food": 0.30, "transit": 0.05, "activities": 0.50}

# Hard floor for transit as a fraction of remaining daily budget
TRANSIT_FLOOR_FRAC = 0.10


def _sum_by_category(expenses: List[ExpenseItem], category: str) -> float:
    return sum(e.amount for e in expenses if e.category == category)


def rebalance_budget(req: BudgetRebalanceRequest) -> BudgetRebalanceResponse:
    """
    Computes updated daily targets and recommended swaps.

    Returns BudgetRebalanceResponse.
    """
    total = req.total_budget
    days_gone = max(1, req.days_total - req.days_remaining)
    planned_to_now = total * (days_gone / req.days_total)

    total_spent = sum(e.amount for e in req.expenses)
    delta = max(0.0, total_spent - planned_to_now)   # net cumulative overspend Δ_t

    remaining_budget = max(0.0, total - total_spent)
    daily_remaining = remaining_budget / req.days_remaining if req.days_remaining > 0 else 0.0

    # Compute canonical daily targets for remaining days
    canonical_daily = {k: CANONICAL[k] * daily_remaining for k in CANONICAL}

    # Apply omega rebalance — trim from each bucket proportionally to ω
    daily_delta = delta / req.days_remaining if req.days_remaining > 0 else 0.0
    trimmed = {k: canonical_daily[k] - OMEGA[k] * daily_delta for k in canonical_daily}
    trimmed = {k: max(0.0, v) for k, v in trimmed.items()}

    # Transit floor protection
    transit_floor = TRANSIT_FLOOR_FRAC * daily_remaining
    if trimmed["transit"] < transit_floor:
        deficit = transit_floor - trimmed["transit"]
        trimmed["transit"] = transit_floor
        # Absorb the deficit proportionally from stays and food
        absorbers = ["stays", "food", "activities"]
        absorb_total = sum(trimmed[k] for k in absorbers)
        if absorb_total > 0:
            for k in absorbers:
                trimmed[k] -= deficit * (trimmed[k] / absorb_total)
                trimmed[k] = max(0.0, trimmed[k])

    # Proportional spillover — if any bucket is 0, redistribute its share
    zero_keys = [k for k, v in trimmed.items() if v <= 0 and k != "transit"]
    for zk in zero_keys:
        surplus_weight = OMEGA[zk]
        non_zero = [k for k in trimmed if k != zk and trimmed[k] > 0]
        if non_zero:
            total_weight = sum(OMEGA[k] for k in non_zero)
            for k in non_zero:
                trimmed[k] += (surplus_weight / total_weight) * daily_delta * OMEGA[k]

    # Recommended paid-to-free swaps
    swaps: List[str] = []
    spent_activities = _sum_by_category(req.expenses, "activities")
    spent_food       = _sum_by_category(req.expenses, "food")

    if delta > total * 0.05:
        swaps.append("Replace 1 paid heritage entry with adjacent free monument vantage point")
    if spent_food > CANONICAL["food"] * planned_to_now:
        swaps.append("Switch 1 restaurant dinner to local street food (saves ~₹400–800)")
    if delta > total * 0.10:
        swaps.append("Downgrade 1 night's stay to heritage guesthouse from boutique hotel")
    if spent_activities > CANONICAL["activities"] * planned_to_now:
        swaps.append("Skip optional guided tour — download self-guided audio walk instead")

    utilization = round(100.0 * total_spent / total, 1)

    return BudgetRebalanceResponse(
        updated_targets=BudgetTargets(
            stays=round(trimmed["stays"], 2),
            food=round(trimmed["food"], 2),
            transit=round(trimmed["transit"], 2),
            activities=round(trimmed["activities"], 2),
        ),
        overspend_delta=round(delta, 2),
        budget_utilization_pct=utilization,
        recommended_swaps=swaps,
        source="allocator",
    )
