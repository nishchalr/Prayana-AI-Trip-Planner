"""OCR Allergen Screener Router — POST /api/v1/ocr/scan-menu & /api/v1/ocr/parse-menu"""
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from app.models.schemas import OCRParseMenuResponse, OCRScanResponse
from app.services.ocr_allergen import parse_menu_structured, scan_menu

router = APIRouter()

@router.post(
    "/scan-menu",
    response_model=OCRScanResponse,
    summary="Menu OCR + Levenshtein Allergen Screener",
)
async def ocr_scan_menu(
    image: Optional[UploadFile] = File(default=None, description="JPEG/PNG menu image"),
    raw_text: Optional[str] = Form(default=None, description="Raw menu text fallback"),
    declared_allergens: str = Form(
        default="",
        description="Comma-separated allergen names from traveler profiles",
    ),
) -> OCRScanResponse:
    """
    Runs OpenCV preprocessing + Tesseract OCR + normalised Levenshtein matching.
    Returns HAZARD_ALERT or NO_MATCH_DETECTED — NEVER 'SAFE'.
    """
    image_bytes: Optional[bytes] = None
    if image is not None:
        image_bytes = await image.read()

    allergens = [a.strip() for a in declared_allergens.split(",") if a.strip()]
    return scan_menu(image_bytes, raw_text, allergens)


@router.post(
    "/parse-menu",
    response_model=OCRParseMenuResponse,
    summary="Structured Menu OCR, Translation, Currency Detection & Allergen Screening",
)
async def ocr_parse_menu(
    image: Optional[UploadFile] = File(default=None, description="JPEG/PNG menu image"),
    raw_text: Optional[str] = Form(default=None, description="Raw menu text fallback"),
    declared_allergens: str = Form(
        default="",
        description="Comma-separated allergen names from traveler profiles",
    ),
    target_currency: str = Form(default="INR", description="Target display currency"),
) -> OCRParseMenuResponse:
    """
    Extracts menu text via Tesseract OCR, parses structured dishes via Gemini (with
    deterministic fallback), and screens every dish against declared cohort allergens.
    """
    image_bytes: Optional[bytes] = None
    if image is not None:
        image_bytes = await image.read()

    allergens = [a.strip() for a in declared_allergens.split(",") if a.strip()]
    return await parse_menu_structured(image_bytes, raw_text, allergens, target_currency)
