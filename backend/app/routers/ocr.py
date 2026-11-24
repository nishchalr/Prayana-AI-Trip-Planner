"""OCR Allergen Screener Router — POST /api/v1/ocr/scan-menu"""
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from app.models.schemas import OCRScanResponse
from app.services.ocr_allergen import scan_menu

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
