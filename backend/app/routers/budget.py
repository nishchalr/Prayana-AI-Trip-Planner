"""Budget Rebalancer Router — POST /api/v1/budget/rebalance"""
from fastapi import APIRouter
from app.models.schemas import BudgetRebalanceRequest, BudgetRebalanceResponse
from app.services.budget_allocator import rebalance_budget

router = APIRouter()

@router.post("/rebalance", response_model=BudgetRebalanceResponse, summary="4-Bucket Dynamic Budget Rebalancer")
def budget_rebalance(req: BudgetRebalanceRequest) -> BudgetRebalanceResponse:
    """
    Computes updated daily bucket targets (Stays/Food/Transit/Activities)
    after cumulative overspend Δ_t, using Phase-I ω rebalance weights.
    """
    return rebalance_budget(req)
