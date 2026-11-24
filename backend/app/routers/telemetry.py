"""Telemetry & Disruption Routers — /api/v1/vitals/evaluate + /api/v1/disruption/reroute"""
from fastapi import APIRouter
from app.models.schemas import (
    DisruptionRerouteRequest,
    DisruptionRerouteResponse,
    VitalsEvaluateRequest,
    VitalsEvaluateResponse,
)
from app.services.telemetry import evaluate_vitals, reroute_disruption

router = APIRouter()


@router.post(
    "/vitals/evaluate",
    response_model=VitalsEvaluateResponse,
    summary="Google Health Vitals → Strain Level & α_k Adapter",
)
def vitals_evaluate(req: VitalsEvaluateRequest) -> VitalsEvaluateResponse:
    """
    Fuses BPM, SpO₂, and WBGT into per-traveler α_k / strain level.
    Flags legs requiring pacing adjustments.
    """
    return evaluate_vitals(req)


@router.post(
    "/disruption/reroute",
    response_model=DisruptionRerouteResponse,
    summary="Weather / Traffic Disruption Rerouter",
)
async def disruption_reroute(req: DisruptionRerouteRequest) -> DisruptionRerouteResponse:
    """
    Fetches live OpenWeatherMap data (falls back to mock if key absent),
    swaps outdoor stops for indoor alternatives, and re-optimizes route.
    """
    return await reroute_disruption(req)
