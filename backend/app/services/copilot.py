"""
Prayana — Gemini AI Copilot Action Router
==========================================
Translates natural-language trip commands into concrete state mutations.

Flow:
  1. Try Gemini API (google-genai) with structured JSON output schema.
  2. If GEMINI_API_KEY absent or API call fails → deterministic keyword fallback.

Action types (match frontend CopilotAction enum):
  RELAX_PACING   — Extend dwell times, reduce stops, add rest points
  REROUTE_INDOOR — Swap outdoor → indoor landmarks
  FILTER_DINING  — Apply allergen / dietary filter to dining stops
  ADJUST_EFFORT  — Drop high-strain legs, reduce daily effort cap
  REORDER_STOPS  — Reorder stops for temporal / accessibility flow
  NO_OP          — Command understood but no mutation needed
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, Tuple

from app.models.schemas import (
    CopilotAction,
    CopilotCommandRequest,
    CopilotCommandResponse,
)

# ---------------------------------------------------------------------------
# Deterministic Keyword Fallback
# ---------------------------------------------------------------------------

_KEYWORD_MAP: list[Tuple[list[str], CopilotAction, str]] = [
    (
        ["relax", "slow", "rest", "easy", "gentle", "calm", "leisure"],
        CopilotAction.relax_pacing,
        "Pacing relaxed: dwell times extended by 25%, 1 high-effort stop removed.",
    ),
    (
        ["indoor", "museum", "gallery", "inside", "shelter", "rain", "shade"],
        CopilotAction.reroute_indoor,
        "Outdoor stops swapped for nearest indoor heritage sites and galleries.",
    ),
    (
        ["allerg", "diet", "vegan", "vegetar", "gluten", "nut", "shellfish", "food", "dinner", "eat"],
        CopilotAction.filter_dining,
        "Dining stops filtered for declared dietary tags and allergen flags.",
    ),
    (
        ["heart", "strain", "tired", "fatigue", "elevat", "medical", "bpm", "spo2", "breath"],
        CopilotAction.adjust_effort,
        "High-strain legs removed. Daily effort cap reduced by 20%.",
    ),
    (
        ["reorder", "rearrange", "swap", "move", "first", "last", "morning", "evening"],
        CopilotAction.reorder_stops,
        "Stops reordered for optimal temporal flow and accessibility.",
    ),
]


def _deterministic_fallback(command: str) -> Tuple[CopilotAction, str]:
    cmd_lower = command.lower()
    for keywords, action, explanation in _KEYWORD_MAP:
        if any(kw in cmd_lower for kw in keywords):
            return action, explanation
    return CopilotAction.no_op, "Command noted. No structural mutations applied."


def _build_mutations(action: CopilotAction, state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate concrete mutation hints for the frontend state."""
    stops = state.get("stops", [])
    if action == CopilotAction.relax_pacing:
        return {
            "dwell_time_multiplier": 1.25,
            "max_stops_per_day": max(1, len(stops) - 1),
            "insert_rest_stop": True,
        }
    if action == CopilotAction.reroute_indoor:
        return {"filter_outdoor": True, "prefer_indoor": True}
    if action == CopilotAction.filter_dining:
        dietary_tags = state.get("active_traveler", {}).get("dietaryTags", [])
        return {"allergen_filter": dietary_tags, "hide_non_compliant_dining": True}
    if action == CopilotAction.adjust_effort:
        return {"effort_cap_multiplier": 0.80, "drop_high_strain_legs": True}
    if action == CopilotAction.reorder_stops:
        return {"reorder_by": "accessibility_then_time"}
    return {}


# ---------------------------------------------------------------------------
# Gemini API Integration
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """
You are the Prayana AI Trip Copilot. Given a natural-language travel command and 
the current trip state (JSON), return a single JSON object with these exact keys:
  "action_type": one of RELAX_PACING | REROUTE_INDOOR | FILTER_DINING | ADJUST_EFFORT | REORDER_STOPS | NO_OP
  "mutations": an object with mutation hints for the frontend
  "explanation": a short, precise explanation (≤2 sentences)
Return ONLY the JSON object — no markdown, no prose.
""".strip()


async def _gemini_command(command: str, state: Dict[str, Any]) -> Tuple[CopilotAction, Dict[str, Any], str]:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    try:
        from google import genai  # type: ignore
        from google.genai import types as genai_types  # type: ignore

        client = genai.Client(
            api_key=api_key,
            http_options=genai_types.HttpOptions(
                timeout=10000,
                retry_options=genai_types.HttpRetryOptions(attempts=1),
            ),
        )
        user_msg = f"Command: {command}\nCurrent state: {json.dumps(state, indent=2)}"

        preferred = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
        model_candidates = list(
            dict.fromkeys([
                preferred,
                "gemini-3.5-flash-lite",
                "gemini-3.7-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash",
                "gemini-3.1-flash-lite",
            ])
        )

        response = None
        last_exc: Exception | None = None
        for model_name in model_candidates:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[user_msg],
                    config=genai_types.GenerateContentConfig(
                        system_instruction=_SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.2,
                        max_output_tokens=512,
                    ),
                )
                break
            except Exception as exc:
                last_exc = exc
                print(f"[copilot] Model {model_name} unavailable ({exc}); trying next...", file=sys.stderr)

        if response is None or not getattr(response, "text", None):
            raise last_exc or RuntimeError("All Gemini model candidates failed")

        raw = response.text.strip()
        parsed = json.loads(raw)

        action_str = parsed.get("action_type", "NO_OP")
        try:
            action = CopilotAction(action_str)
        except ValueError:
            action = CopilotAction.no_op

        mutations    = parsed.get("mutations", {})
        explanation  = parsed.get("explanation", "")
        return action, mutations, explanation

    except Exception as exc:
        print(f"[copilot] Gemini API error: {exc}", file=sys.stderr)
        raise


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

async def handle_copilot_command(req: CopilotCommandRequest) -> CopilotCommandResponse:
    source = "gemini"
    action: CopilotAction
    mutations: Dict[str, Any]
    explanation: str

    try:
        action, mutations, explanation = await _gemini_command(req.command, req.current_state)
    except Exception:
        # Deterministic fallback
        source = "deterministic_fallback"
        action, explanation = _deterministic_fallback(req.command)
        mutations = _build_mutations(action, req.current_state)

    # Always enrich mutations if empty
    if not mutations:
        mutations = _build_mutations(action, req.current_state)

    return CopilotCommandResponse(
        action_type=action,
        mutations=mutations,
        explanation=explanation,
        source=source,
    )
