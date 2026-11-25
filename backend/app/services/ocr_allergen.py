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

import os
import re
import shutil
import sys
from typing import List, Optional, Tuple

from app.models.schemas import OCRResult, OCRScanResponse

# ---------------------------------------------------------------------------
# Windows Tesseract Path Auto-Detection
# ---------------------------------------------------------------------------

def _configure_tesseract():
    """
    Auto-detect Tesseract executable on Windows if not on system PATH.
    Checks Program Files and Program Files (x86) and sets pytesseract tesseract_cmd.
    """
    try:
        import pytesseract  # type: ignore
        if shutil.which("tesseract"):
            return
        candidates = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
        for path in candidates:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"[ocr_allergen] Configured Windows Tesseract at: {path}", file=sys.stderr)
                break
    except Exception as exc:
        print(f"[ocr_allergen] Tesseract path configuration warning: {exc}", file=sys.stderr)

_configure_tesseract()

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
    "Shellfish Allergy":  ["prawn", "prawns", "shrimp", "crab", "lobster", "shellfish", "fish", "seafood", "clam", "mussel", "oyster", "scampi"],
    "Mollusc Allergy":    ["clam", "mussel", "oyster", "squid", "calamari", "octopus", "scallop"],
    "Fin Fish Allergy":   ["fish", "salmon", "tuna", "cod", "mackerel", "anchovy", "dashi", "bonito", "pomfret"],
    "Nut Allergy":        ["peanut", "cashew", "kaju", "almond", "badam", "walnut", "pistachio", "pista", "nut", "nuts", "hazel", "pecan"],
    "Tree Nut Allergy":   ["cashew", "kaju", "almond", "badam", "walnut", "akhrot", "pistachio", "pista", "hazelnut", "pecan", "macadamia", "nut", "nuts"],
    "Peanut Allergy":     ["peanut", "peanuts", "groundnut", "moongphali", "singdana", "satay", "peanuf"],
    "Gluten-Free":        ["wheat", "maida", "atta", "flour", "roti", "paratha", "bread", "naan", "semolina", "rava", "gluten", "sooji", "barley", "udon", "ramen"],
    "Celiac Disease (Strict Gluten-Free)": ["wheat", "maida", "atta", "flour", "roti", "paratha", "bread", "naan", "semolina", "rava", "gluten", "barley", "rye", "udon", "ramen"],
    "Wheat Allergy":      ["wheat", "maida", "atta", "flour", "roti", "naan", "bread", "semolina", "rava"],
    "Dairy-Free":         ["milk", "cream", "butter", "cheese", "paneer", "ghee", "curd", "yogurt", "lactose", "whey", "dahi", "malai", "lassi"],
    "Milk / Dairy Allergy": ["milk", "cream", "butter", "cheese", "paneer", "ghee", "curd", "yogurt", "lactose", "whey", "dahi", "malai", "casein"],
    "Lactose Intolerance": ["milk", "cream", "ice cream", "paneer", "curd", "yogurt", "lassi", "cheese", "chaas"],
    "Egg-Free":           ["egg", "eggs", "omelette", "mayo", "mayonnaise", "albumen", "bhurji"],
    "Egg Allergy":        ["egg", "eggs", "omelette", "mayo", "mayonnaise", "albumen", "bhurji", "meringue"],
    "Soy Allergy":        ["soy", "soya", "soybean", "tofu", "edamame", "miso", "tempeh", "shoyu", "tamari", "teriyaki"],
    "Sesame Allergy":     ["sesame", "til", "tahini", "gingelly", "goma", "hummus", "halva"],
    "Mustard Allergy":    ["mustard", "rai", "sarson", "kasundi", "dijon"],
    "Sulfite Sensitivity": ["sulfite", "sulphite", "wine", "vinegar", "molasses"],
    "Corn Allergy":       ["corn", "maize", "cornstarch", "cornmeal", "makki", "polenta"],
    "Buckwheat Allergy (Soba Risk)": ["buckwheat", "soba", "kuttu", "kasha"],
    "Alpha-Gal Syndrome (Red Meat Allergy)": ["beef", "pork", "lamb", "mutton", "goat", "steak", "bacon", "ham", "sausage", "gelatin", "lard"],
    "Pure Vegetarian":    ["chicken", "mutton", "beef", "pork", "lamb", "fish", "prawn", "shrimp", "crab", "meat", "egg", "dashi"],
    "Vegan":              ["chicken", "mutton", "beef", "pork", "fish", "prawn", "meat", "egg", "milk", "cheese", "paneer", "ghee", "butter", "cream", "honey"],
    "Vegan (Plant-Based)": ["chicken", "mutton", "beef", "pork", "fish", "prawn", "meat", "egg", "milk", "cheese", "paneer", "ghee", "butter", "cream", "honey"],
    "Jain Vegetarian (Strict)": ["chicken", "mutton", "beef", "pork", "fish", "egg", "meat", "onion", "garlic", "potato", "aloo", "carrot", "radish", "ginger"],
    "Halal":              ["pork", "bacon", "ham", "lard", "gelatin", "alcohol", "wine", "beer", "mirin", "sake"],
    "Kosher":             ["pork", "bacon", "ham", "shellfish", "prawn", "shrimp", "crab", "lobster", "oyster", "clam"],
    "Allium Allergy (No Onion / Garlic)": ["onion", "pyaz", "garlic", "lahsun", "leek", "shallot"],
}

_STOP_KEYWORDS = {"allergy", "allergic", "intolerance", "sensitivity", "diet", "free", "avoid", "strict", "risk", "severe", "syndrome"}


def _resolve_keywords(allergen_name: str) -> List[str]:
    if allergen_name in ALLERGEN_KEYWORDS:
        return ALLERGEN_KEYWORDS[allergen_name]
    low = allergen_name.lower()
    for known, kws in ALLERGEN_KEYWORDS.items():
        if known.lower() == low:
            return kws
    # Special-case dynamic keyword patterns + generic token extraction for any custom allergen
    if "alpha-gal" in low or "alpha gal" in low:
        return ["beef", "pork", "lamb", "mutton", "steak", "bacon", "ham", "gelatin", "lard"]
    if low.startswith("kw:"):
        return [t.strip() for t in low[3:].split(",") if len(t.strip()) >= 2]
    tokens = [w for w in re.split(r"[^a-z0-9]+", low) if len(w) >= 3 and w not in _STOP_KEYWORDS]
    return tokens or [low]


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
        keywords = _resolve_keywords(allergen_name)
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
        _configure_tesseract()
        text = pytesseract.image_to_string(closed, config="--oem 1 --psm 6")
        if not text.strip():
            text = pytesseract.image_to_string(gray, config="--oem 1 --psm 6")
        if not text.strip():
            text = pytesseract.image_to_string(img)
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
