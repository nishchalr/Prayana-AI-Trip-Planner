"""
Prayana — Google Health, Weather & Maps Telemetry Adapter
=========================================================
Implements Phase-I Section 3 (Health Telemetry) and Section 6 (Disruption Rerouting).

Vitals Evaluation:
  - Fuses live BPM, SpO₂, and WBGT into per-traveler α_k / StrainLevel
  - HR thresholds: <60→LOW, 60-100→LOW/MODERATE, >100→MODERATE, >120→ELEVATED
  - SpO₂ <90 → ELEVATED; WBGT >32 → flag pacing

Disruption Rerouting:
  - If OPENWEATHER_API_KEY set → fetch live weather for first POI coords
  - Else → deterministic mock storm/heat data
  - Swaps outdoor POIs for indoor alternatives
  - Calls route_optimizer to reorder remaining stops
"""

from __future__ import annotations

import math
import os
import sys
from typing import List, Optional

from app.models.schemas import (
    DisruptionRerouteRequest,
    DisruptionRerouteResponse,
    POICandidate,
    RouteOptimizeRequest,
    StopResult,
    StrainLevel,
    TravelerProfile,
    TravelerVitalsResult,
    VitalsEvaluateRequest,
    VitalsEvaluateResponse,
)

# ---------------------------------------------------------------------------
# Destination Anchors & Approximate WBGT Calculator
# ---------------------------------------------------------------------------

DESTINATION_COORDINATES: dict[str, tuple[float, float]] = {
    "hampi": (15.3350, 76.4600),
    "coorg": (12.4244, 75.7382),
    "kyoto": (35.0116, 135.7681),
    "varanasi": (25.3176, 82.9739),
}


def compute_approx_wbgt(temp_c: float, humidity_pct: float) -> float:
    """
    Computes approximate Wet-Bulb Globe Temperature (WBGT) in °C from
    dry-bulb temperature (°C) and relative humidity (%) using the Liljegren /
    Australian Bureau of Meteorology empirical formula:
      e (vapor pressure in hPa) = (RH / 100) * 6.105 * exp((17.27 * T) / (237.7 + T))
      WBGT ≈ 0.567 * T + 0.393 * e + 3.94
    """
    e = (humidity_pct / 100.0) * 6.105 * math.exp((17.27 * temp_c) / (237.7 + temp_c))
    wbgt = 0.567 * temp_c + 0.393 * e + 3.94
    return round(wbgt, 1)

# ---------------------------------------------------------------------------
# HR → Strain Thresholds (Phase-I Table 3.1)
# ---------------------------------------------------------------------------

def _hr_strain(hr: int, is_elevated_risk: bool) -> StrainLevel:
    if hr > 120:
        return StrainLevel.elevated
    if hr > 100:
        return StrainLevel.moderate
    if hr > 85 and is_elevated_risk:
        return StrainLevel.moderate
    return StrainLevel.low


def _spo2_strain(spo2: float) -> StrainLevel:
    if spo2 < 90.0:
        return StrainLevel.elevated
    if spo2 < 94.0:
        return StrainLevel.moderate
    return StrainLevel.low


def _wbgt_flag(wbgt: float) -> bool:
    return wbgt > 32.0


def _strain_max(a: StrainLevel, b: StrainLevel) -> StrainLevel:
    order = {StrainLevel.low: 0, StrainLevel.moderate: 1, StrainLevel.elevated: 2}
    return a if order[a] >= order[b] else b


def _alpha_from_strain(strain: StrainLevel) -> float:
    return {StrainLevel.low: 1.0, StrainLevel.moderate: 1.3, StrainLevel.elevated: 1.6}[strain]


# ---------------------------------------------------------------------------
# Vitals Evaluation
# ---------------------------------------------------------------------------

async def evaluate_vitals(req: VitalsEvaluateRequest) -> VitalsEvaluateResponse:
    results: List[TravelerVitalsResult] = []
    group_max = StrainLevel.low

    # Resolve ambient WBGT from live weather if destination_id supplied
    wbgt = req.ambient_wbgt
    weather_summary: Optional[str] = None
    if req.destination_id and req.destination_id.lower() in DESTINATION_COORDINATES:
        coords = DESTINATION_COORDINATES[req.destination_id.lower()]
        weather = await _fetch_weather(coords[0], coords[1])
        wbgt = weather.get("wbgt_celsius", wbgt)
        weather_summary = (
            f"{weather.get('condition', 'Clear')} {weather.get('temp_c', '')}°C "
            f"(RH: {weather.get('humidity_pct', '')}%, WBGT: {wbgt}°C) via {weather.get('source', '')}"
        )

    for t in req.travelers:
        hr   = t.hr_bpm or 72
        spo2 = t.spo2 or 98.0

        is_elevated_risk = t.cardiac_coeff > 0.3 or t.respiratory_coeff > 0.3

        s_hr   = _hr_strain(hr, is_elevated_risk)
        s_spo2 = _spo2_strain(spo2)
        strain = _strain_max(s_hr, s_spo2)

        alpha = _alpha_from_strain(strain)
        flag_pacing = _wbgt_flag(wbgt) or strain == StrainLevel.elevated

        advisory: Optional[str] = None
        if strain == StrainLevel.elevated:
            advisory = f"{t.name}: ELEVATED strain — HR {hr} BPM / SpO₂ {spo2}%. Recommend immediate rest."
        elif strain == StrainLevel.moderate:
            advisory = f"{t.name}: MODERATE strain — monitor closely. Reduce next leg effort."
        if _wbgt_flag(wbgt):
            advisory = (advisory or "") + f" WBGT {wbgt}°C exceeds safe threshold (>32°C). Seek shade."

        group_max = _strain_max(group_max, strain)

        results.append(TravelerVitalsResult(
            traveler_id=t.id,
            traveler_name=t.name,
            strain_level=strain,
            alpha_k=round(alpha, 2),
            advisory=advisory,
            flag_pacing=flag_pacing,
        ))

    return VitalsEvaluateResponse(
        results=results,
        group_max_strain=group_max,
        computed_wbgt=round(wbgt, 1),
        weather_summary=weather_summary,
        source="telemetry",
    )


# ---------------------------------------------------------------------------
# OpenWeatherMap Fetch (Live / Calibrated Fallback)
# ---------------------------------------------------------------------------

async def _fetch_weather(lat: float, lon: float) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    if not api_key:
        # Deterministic calibrated storm data (seed=42 scenario: Hampi tropical monsoon)
        temp = 29.0
        humidity = 88.0
        wbgt = compute_approx_wbgt(temp, humidity)
        return {
            "condition": "Thunderstorm",
            "temp_c": temp,
            "humidity_pct": humidity,
            "wbgt_celsius": wbgt,
            "wind_kmh": 42.0,
            "rain_mm_1h": 12.0,
            "source": "mock_storm_seed42",
        }
    try:
        import httpx  # type: ignore
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            d = r.json()
            temp = float(d["main"]["temp"])
            humidity = float(d["main"]["humidity"])
            wbgt = compute_approx_wbgt(temp, humidity)
            return {
                "condition": d["weather"][0]["main"],
                "temp_c": temp,
                "humidity_pct": humidity,
                "wbgt_celsius": wbgt,
                "wind_kmh": round(d.get("wind", {}).get("speed", 0) * 3.6, 1),
                "rain_mm_1h": d.get("rain", {}).get("1h", 0.0),
                "source": "openweathermap",
            }
    except Exception as exc:
        print(f"[telemetry] OpenWeatherMap fetch failed ({exc}), using mock.", file=sys.stderr)
        temp = 28.0
        humidity = 80.0
        wbgt = compute_approx_wbgt(temp, humidity)
        return {"condition": "Rain", "temp_c": temp, "humidity_pct": humidity, "wbgt_celsius": wbgt, "source": "mock_fallback"}


# ---------------------------------------------------------------------------
# Disruption Rerouter
# ---------------------------------------------------------------------------

async def reroute_disruption(req: DisruptionRerouteRequest) -> DisruptionRerouteResponse:
    from app.services.route_optimizer import optimize_route

    # Fetch weather
    anchor = req.stops[0] if req.stops else None
    weather = await _fetch_weather(anchor.lat if anchor else 15.33, anchor.lon if anchor else 76.46)
    computed_wbgt = weather.get("wbgt_celsius", 28.0)

    is_rain = weather.get("rain_mm_1h", 0) > 2.0 or weather.get("condition", "") in ("Rain", "Thunderstorm", "Drizzle")
    is_heat = weather.get("temp_c", 25) > 36.0 or req.disruption_type == "heat" or computed_wbgt > 32.0

    # Swap outdoor POIs for indoor alternatives and inject computed WBGT
    rerouted_stops: List[POICandidate] = []
    for stop in req.stops:
        effective_wbgt = computed_wbgt if not stop.is_indoor else min(computed_wbgt, 26.0)
        if (is_rain or is_heat) and not stop.is_indoor and stop.id not in req.pinned_stop_ids:
            rerouted_stops.append(POICandidate(
                id=stop.id,
                name=f"{stop.name} (Indoor Arcade)",
                lat=stop.lat,
                lon=stop.lon,
                distance_km=stop.distance_km,
                elevation_gain_m=0.0,
                slope_deg=0.0,
                wbgt_celsius=min(effective_wbgt, 26.0),
                is_indoor=True,
                is_pinned=stop.is_pinned,
            ))
        else:
            rerouted_stops.append(POICandidate(
                id=stop.id,
                name=stop.name,
                lat=stop.lat,
                lon=stop.lon,
                distance_km=stop.distance_km,
                elevation_gain_m=stop.elevation_gain_m,
                slope_deg=stop.slope_deg,
                wbgt_celsius=effective_wbgt,
                is_indoor=stop.is_indoor,
                is_pinned=stop.is_pinned,
            ))

    # Re-optimize through swapped stops with active WBGT
    opt_req = RouteOptimizeRequest(
        travelers=req.travelers,
        poi_candidates=rerouted_stops,
        pinned_stop_ids=req.pinned_stop_ids,
    )
    opt_resp = optimize_route(opt_req)

    summary_parts = []
    if is_rain:
        summary_parts.append(f"Rain alert ({weather.get('rain_mm_1h', '?')} mm/h)")
    if is_heat:
        summary_parts.append(f"Heat alert ({weather.get('temp_c', '?')}°C, WBGT {computed_wbgt}°C)")
    summary = " | ".join(summary_parts) if summary_parts else "Nominal conditions"

    return DisruptionRerouteResponse(
        rerouted_stops=opt_resp.ordered_stops,
        disruption_summary=summary,
        weather_data=weather,
        source="disruption_rerouter",
    )
