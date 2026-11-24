"""Route Optimizer Router — POST /api/v1/route/optimize"""
from fastapi import APIRouter
from app.models.schemas import RouteOptimizeRequest, RouteOptimizeResponse
from app.services.route_optimizer import optimize_route

router = APIRouter()

@router.post("/optimize", response_model=RouteOptimizeResponse, summary="CP-SAT Effort-Aware Route Optimizer")
def route_optimize(req: RouteOptimizeRequest) -> RouteOptimizeResponse:
    """
    Accepts cohort profiles + POI candidates, runs CP-SAT (1 s limit),
    returns effort-ordered stops with per-traveler strain scores.
    Falls back to greedy nearest-neighbour on timeout.
    """
    return optimize_route(req)
