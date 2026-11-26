"""
Prayana — Pydantic v2 Request / Response Schemas
================================================
All data contracts for the Prayana FastAPI backend.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared Enums
# ---------------------------------------------------------------------------

class MobilityLevel(str, Enum):
    standard = "Standard"
    senior = "Senior / Reduced Mobility"
    wheelchair = "Wheelchair-Accessible"
    high_fitness = "High Fitness"


class StrainLevel(str, Enum):
    low = "LOW"
    moderate = "MODERATE"
    elevated = "ELEVATED"


class OCRResult(str, Enum):
    hazard_alert = "HAZARD_ALERT"
    no_match = "NO_MATCH_DETECTED"
    text_only_mode = "TEXT_ONLY_MODE"


class CopilotAction(str, Enum):
    relax_pacing = "RELAX_PACING"
    reroute_indoor = "REROUTE_INDOOR"
    filter_dining = "FILTER_DINING"
    adjust_effort = "ADJUST_EFFORT"
    reorder_stops = "REORDER_STOPS"
    no_op = "NO_OP"


# ---------------------------------------------------------------------------
# Traveler Profile
# ---------------------------------------------------------------------------

class TravelerProfile(BaseModel):
    id: str
    name: str
    age: int = Field(ge=1, le=120)
    mobility: MobilityLevel = MobilityLevel.standard
    # Cardiorespiratory coefficients (from Phase-I report)
    cardiac_coeff: float = Field(default=0.0, ge=0.0, le=1.0,
        description="c_card — cardiac risk coefficient (0 = none, 1 = severe)")
    respiratory_coeff: float = Field(default=0.0, ge=0.0, le=1.0,
        description="c_resp — respiratory risk coefficient")
    mobility_coeff: float = Field(default=0.0, ge=0.0, le=1.0,
        description="c_mob — mobility impairment coefficient (>0.5 → wheelchair constraint)")
    alpha_k: float = Field(default=1.0, ge=0.5, le=3.0,
        description="α_k — base effort multiplier from wearable strain state")
    beta_k: float = Field(default=0.0, ge=0.0, le=1.0,
        description="β_k — group-lag penalty factor")
    # Live wearable vitals (optional — used for α_k adaptation)
    hr_bpm: Optional[int] = Field(default=72, ge=30, le=250)
    spo2: Optional[float] = Field(default=98.0, ge=50.0, le=100.0)
    strain_level: StrainLevel = StrainLevel.low


# ---------------------------------------------------------------------------
# Point of Interest Candidate
# ---------------------------------------------------------------------------

class POICandidate(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    distance_km: float = Field(ge=0.0)
    elevation_gain_m: float = Field(default=0.0)
    slope_deg: float = Field(default=0.0, ge=0.0)
    wbgt_celsius: float = Field(default=24.0)
    is_indoor: bool = False
    is_pinned: bool = False


# ---------------------------------------------------------------------------
# Route Optimizer
# ---------------------------------------------------------------------------

class RouteOptimizeRequest(BaseModel):
    travelers: List[TravelerProfile] = Field(min_length=1)
    poi_candidates: List[POICandidate] = Field(min_length=2)
    max_daily_effort: float = Field(default=8.0, ge=1.0,
        description="Ω_max — total group effort budget per day")
    pinned_stop_ids: List[str] = Field(default_factory=list)
    slope_threshold_deg: float = Field(default=5.0, ge=0.0,
        description="θ_thresh — max slope for wheelchair users (c_mob > 0.5)")


class StopResult(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    group_penalty: float
    is_indoor: bool
    is_pinned: bool


class RouteOptimizeResponse(BaseModel):
    ordered_stops: List[StopResult]
    transit_times_min: List[float]
    strain_scores: Dict[str, float]   # traveler_id → cumulative strain
    solve_time_ms: float
    exceedances: int                  # legs where effort > per-leg soft limit
    solver_status: str
    source: str = "cp_sat"


# ---------------------------------------------------------------------------
# Budget Rebalancer
# ---------------------------------------------------------------------------

class ExpenseItem(BaseModel):
    id: str
    category: str   # "stays" | "food" | "transit" | "activities"
    amount: float   # INR
    label: str = ""


class BudgetRebalanceRequest(BaseModel):
    total_budget: float = Field(gt=0)
    expenses: List[ExpenseItem]
    days_remaining: int = Field(ge=1)
    days_total: int = Field(ge=1)


class BudgetTargets(BaseModel):
    stays: float
    food: float
    transit: float
    activities: float


class BudgetRebalanceResponse(BaseModel):
    updated_targets: BudgetTargets
    overspend_delta: float
    budget_utilization_pct: float
    recommended_swaps: List[str]
    source: str = "allocator"


# ---------------------------------------------------------------------------
# OCR Allergen Screener
# ---------------------------------------------------------------------------

class OCRScanResponse(BaseModel):
    result: OCRResult
    matched_allergens: List[str] = Field(default_factory=list)
    matched_tokens: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    raw_text_preview: str = ""
    disclaimer: str
    ocr_available: bool = True


class ParsedMenuItem(BaseModel):
    id: str
    name_en: str
    name_original: str
    price: float = 0.0
    currency: str = "INR"
    category: str = "Mains"
    spiciness: int = Field(default=0, ge=0, le=3)
    possible_ingredients: List[str] = Field(default_factory=list)
    description: str = ""
    allergen_matches: List[str] = Field(default_factory=list)
    status: OCRResult = OCRResult.no_match


class ParsedMenuCategory(BaseModel):
    name: str
    items: List[ParsedMenuItem] = Field(default_factory=list)


class OCRParseMenuResponse(BaseModel):
    detected_language: str = "en"
    detected_currency: str = "INR"
    greeting_local: str = "Hello, I would like to place an order"
    greeting_en: str = "Hello, I would like to place an order"
    closing_local: str = "Thank you very much!"
    closing_en: str = "Thank you very much!"
    allergy_notice_local: str = ""
    allergy_notice_en: str = ""
    categories: List[ParsedMenuCategory] = Field(default_factory=list)
    raw_text_preview: str = ""
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    disclaimer: str
    source: str = "deterministic_fallback"


class TranslateTextRequest(BaseModel):
    text: str = Field(min_length=1)
    source_language: str = "auto"
    target_language: str = "en"


class TranslateTextResponse(BaseModel):
    detected_source_language: str = "en"
    target_language: str = "en"
    original_text: str
    translated_text: str
    source: str = "deterministic_fallback"


# ---------------------------------------------------------------------------
# Health & Telemetry
# ---------------------------------------------------------------------------

class VitalsEvaluateRequest(BaseModel):
    travelers: List[TravelerProfile]
    ambient_wbgt: float = Field(default=24.0)
    current_slope_deg: float = Field(default=0.0)
    destination_id: Optional[str] = Field(default=None, description="e.g. 'hampi', 'coorg', 'kyoto', 'varanasi'")


class TravelerVitalsResult(BaseModel):
    traveler_id: str
    traveler_name: str
    strain_level: StrainLevel
    alpha_k: float
    advisory: Optional[str] = None
    flag_pacing: bool = False


class VitalsEvaluateResponse(BaseModel):
    results: List[TravelerVitalsResult]
    group_max_strain: StrainLevel
    computed_wbgt: Optional[float] = None
    weather_summary: Optional[str] = None
    source: str = "telemetry"


class DisruptionRerouteRequest(BaseModel):
    travelers: List[TravelerProfile]
    stops: List[POICandidate]
    disruption_type: str = "rain"   # "rain" | "heat" | "crowd"
    pinned_stop_ids: List[str] = Field(default_factory=list)


class DisruptionRerouteResponse(BaseModel):
    rerouted_stops: List[StopResult]
    disruption_summary: str
    weather_data: Dict[str, Any] = Field(default_factory=dict)
    source: str = "disruption_rerouter"


# ---------------------------------------------------------------------------
# Gemini Copilot
# ---------------------------------------------------------------------------

class CopilotCommandRequest(BaseModel):
    command: str = Field(min_length=1)
    current_state: Dict[str, Any] = Field(default_factory=dict)


class CopilotCommandResponse(BaseModel):
    action_type: CopilotAction
    mutations: Dict[str, Any] = Field(default_factory=dict)
    explanation: str
    source: str  # "gemini" | "deterministic_fallback"
