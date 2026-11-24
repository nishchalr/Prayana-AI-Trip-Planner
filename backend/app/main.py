"""
Prayana Backend — FastAPI Application Entry Point
=================================================
Starts a modular REST API for the Prayana AI Trip Planner.
All heavy computation (CP-SAT routing, budget rebalancing, OCR, telemetry,
Gemini AI copilot) lives in /app/services/ and is exposed through thin
/app/routers/ modules.

Run:
    uvicorn app.main:app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env from parent directory (backend/.env)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.routers import route, budget, ocr, telemetry, copilot

# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Prayana Backend API",
    description=(
        "AI-Powered Architectural Travel Operating System — "
        "CP-SAT route optimizer, 4-bucket budget rebalancer, "
        "menu OCR allergen screener, Google Health telemetry adapter, "
        "and Gemini AI copilot."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — allow localhost dev, Firebase Hosting origins, and any extra origins
# listed in ALLOWED_ORIGINS env var (comma-separated).
# ---------------------------------------------------------------------------
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_required_origins = [
    "http://localhost:5173",
    "https://prayana-ai-planner.web.app",
    "https://prayana-ai-planner.firebaseapp.com",
]
allowed_origins = list(
    dict.fromkeys([o.strip() for o in _raw_origins.split(",") if o.strip()] + _required_origins)
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(route.router,     prefix="/api/v1/route",      tags=["Route Optimizer"])
app.include_router(budget.router,    prefix="/api/v1/budget",     tags=["Budget Rebalancer"])
app.include_router(ocr.router,       prefix="/api/v1/ocr",        tags=["OCR Allergen Screener"])
app.include_router(telemetry.router, prefix="/api/v1",            tags=["Health & Telemetry"])
app.include_router(copilot.router,   prefix="/api/v1/copilot",    tags=["Gemini Copilot"])


# ---------------------------------------------------------------------------
# Health Endpoint
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["System"])
def health_check():
    """Quick liveness probe — frontend polls this to show [ API: LIVE ]."""
    return {
        "status": "PRAYANA_BACKEND_ONLINE",
        "version": "1.0.0",
        "modules": [
            "route_optimizer (CP-SAT)",
            "budget_allocator (4-bucket)",
            "ocr_allergen (Tesseract + Levenshtein)",
            "telemetry (Google Health + OpenWeather)",
            "copilot (Gemini AI)",
        ],
    }
