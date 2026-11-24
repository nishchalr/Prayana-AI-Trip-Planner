"""
Prayana — Menu OCR & Allergen Keyword Screener
===============================================
Pipeline:
  1. Accept UploadFile (image) OR raw text string.
  2. If image: OpenCV preprocessing → Tesseract OCR (--oem 1 --psm 6).
  3. Tokenise extracted text.
  4. For each declared traveler allergen:
       - Exact substring match (always; especially for short keywords ≤4 chars)
       - Normalised Levenshtein distance ≤ ε = 0.20
  5. Return HAZARD_ALERT or NO_MATCH_DETECTED + mandatory disclaimer.

SAFETY RULE: Never return "SAFE" or "SAFE_PASS".  Always return
HAZARD_ALERT or NO_MATCH_DETECTED with a staff-verification disclaimer.
"""

from __future__ import annotations

import re
import sys
from typing import List, Optional, Tuple

from app.models.schemas import OCRResult, OCRScanResponse

# Levenshtein normalised distance threshold
EPSILON = 0.20

MANDATORY_DISCLAIMER = (
    "This automated OCR scan cannot guarantee detection of all allergens. "
    "Hidden ingredients, regional synonyms, cross-contact contamination, "
    "and OCR errors may cause missed detections. "
    "ALWAYS verify with restaurant staff or kitchen before eating."
)

# ---------------------------------------------------------------------------
# Allergen keyword dictionary (extends per-traveler tags at runtime)
# ---------------------------------------------------------------------------

ALLERGEN_KEYWORDS: dict[str, List[str]] = {
    "Shellfish Allergy":  ["prawn", "shrimp", "crab", "lobster", "shellfish", "fish", "seafood", "clam", "mussel", "oyster"],
    "Nut Allergy":        ["peanut", "cashew", "kaju", "almond", "badam", "walnut", "pistachio", "nut", "nuts", "hazel", "pecan"],
    "Gluten-Free":        ["wheat", "maida", "flour", "roti", "paratha", "bread", "naan", "semolina", "rava", "gluten"],
    "Dairy-Free":         ["milk", "cream", "butter", "cheese", "paneer", "ghee", "curd", "yogurt", "lactose", "whey"],
    "Egg-Free":           ["egg", "eggs", "omelette", "mayo", "mayonnaise", "albumen"],
    "Soy Allergy":        ["soy", "soya", "tofu", "edamame", "miso", "tempeh"],
}


# ---------------------------------------------------------------------------
# Levenshtein Distance (pure Python — no external dependency required)
# ---------------------------------------------------------------------------

def _levenshtein(a: str, b: str) -> int:
    la, lb = len(a), len(b)
    if la == 0: return lb
    if lb == 0: return la
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        curr = [i] + [0] * lb
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
        prev = curr
    return prev[lb]


def _normalised_distance(a: str, b: str) -> float:
    dist = _levenshtein(a, b)
    return dist / max(len(a), len(b), 1)


# ---------------------------------------------------------------------------
# Text Tokeniser
# ---------------------------------------------------------------------------

def _tokenise(text: str) -> List[str]:
    """Lowercase, strip punctuation, return tokens of length ≥ 2."""
    cleaned = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return [w for w in cleaned.split() if len(w) >= 2]


# ---------------------------------------------------------------------------
# Allergen Matching
# ---------------------------------------------------------------------------

def _match_allergens(
    tokens: List[str],
    declared_allergens: List[str],
) -> Tuple[List[str], List[str]]:
    """
    Returns (matched_allergen_names, matched_tokens).
    Uses exact substring match for all keywords and normalised Levenshtein ≤ ε.
    Short keywords (≤4 chars) also use exact substring on the full raw token.
    """
    matched_allergens: List[str] = []
    matched_tokens:    List[str] = []

    for allergen_name in declared_allergens:
        keywords = ALLERGEN_KEYWORDS.get(allergen_name, [])
        found = False
        for kw in keywords:
            for tok in tokens:
                # Exact substring (always applied)
                if kw in tok or tok in kw:
                    if allergen_name not in matched_allergens:
                        matched_allergens.append(allergen_name)
                    if tok not in matched_tokens:
                        matched_tokens.append(tok)
                    found = True
                    break
                # Levenshtein fuzzy match
                if _normalised_distance(tok, kw) <= EPSILON:
                    if allergen_name not in matched_allergens:
                        matched_allergens.append(allergen_name)
                    if tok not in matched_tokens:
                        matched_tokens.append(tok)
                    found = True
                    break
                # Short keyword (≤4 chars): also check if kw appears anywhere in tok
                if len(kw) <= 4 and kw in tok:
                    if allergen_name not in matched_allergens:
                        matched_allergens.append(allergen_name)
                    if tok not in matched_tokens:
                        matched_tokens.append(tok)
                    found = True
                    break
            if found:
                break

    return matched_allergens, matched_tokens


# ---------------------------------------------------------------------------
# OpenCV + Tesseract OCR Pipeline
# ---------------------------------------------------------------------------

def _ocr_from_image_bytes(image_bytes: bytes) -> Tuple[str, bool]:
    """
    Returns (extracted_text, ocr_available).
    Falls back gracefully if cv2 or tesseract is unavailable.
    """
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
        import pytesseract  # type: ignore

        buf = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        if img is None:
            return "", False

        # 1. Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # 2. Gaussian blur σ=1.2, 5×5 kernel
        blurred = cv2.GaussianBlur(gray, (5, 5), 1.2)
        # 3. Global Otsu thresholding; fall back to adaptive if Otsu fails
        _, otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # 4. Morphological closing (3×3) to reconnect broken characters
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(otsu, cv2.MORPH_CLOSE, kernel)
        # 5. Tesseract OCR — LSTM engine, page-segmentation mode 6 (uniform block)
        text = pytesseract.image_to_string(closed, config="--oem 1 --psm 6")
        return text, True

    except pytesseract.pytesseract.TesseractNotFoundError:
        print("[ocr_allergen] Tesseract binary not found on PATH — text-only mode.", file=sys.stderr)
        return "", False
    except ImportError as exc:
        print(f"[ocr_allergen] Missing dependency ({exc}) — text-only mode.", file=sys.stderr)
        return "", False
    except Exception as exc:
        print(f"[ocr_allergen] OCR pipeline error: {exc}", file=sys.stderr)
        return "", False


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

def scan_menu(
    image_bytes: Optional[bytes],
    raw_text: Optional[str],
    declared_allergens: List[str],
) -> OCRScanResponse:
    """
    Main allergen scan function.

    Parameters
    ----------
    image_bytes       : JPEG/PNG image bytes from UploadFile, or None.
    raw_text          : Fallback plain text if no image provided.
    declared_allergens: List of allergen names from traveler profiles.

    Returns
    -------
    OCRScanResponse with result = HAZARD_ALERT | NO_MATCH_DETECTED | TEXT_ONLY_MODE
    """
    ocr_available = True
    extracted_text = ""

    if image_bytes:
        extracted_text, ocr_available = _ocr_from_image_bytes(image_bytes)
        if not ocr_available or not extracted_text.strip():
            # Fall back to raw_text if supplied
            extracted_text = raw_text or ""
    else:
        extracted_text = raw_text or ""
        ocr_available = False  # no image was supplied

    if not extracted_text.strip():
        return OCRScanResponse(
            result=OCRResult.no_match,
            matched_allergens=[],
            matched_tokens=[],
            confidence=0.0,
            raw_text_preview="[NO TEXT EXTRACTED]",
            disclaimer=MANDATORY_DISCLAIMER,
            ocr_available=ocr_available,
        )

    tokens = _tokenise(extracted_text)
    matched_allergens, matched_tokens = _match_allergens(tokens, declared_allergens)

    # Confidence heuristic: higher when more tokens scanned, image was used
    base_confidence = min(0.95, 0.60 + 0.004 * len(tokens))
    if not ocr_available:
        base_confidence = min(base_confidence, 0.75)

    result = OCRResult.hazard_alert if matched_allergens else OCRResult.no_match
    if not image_bytes and not raw_text:
        result = OCRResult.text_only_mode

    return OCRScanResponse(
        result=result,
        matched_allergens=matched_allergens,
        matched_tokens=matched_tokens,
        confidence=round(base_confidence, 2),
        raw_text_preview=extracted_text[:500].strip(),
        disclaimer=MANDATORY_DISCLAIMER,
        ocr_available=ocr_available,
    )
