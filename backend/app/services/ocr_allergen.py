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

import json
import os
import re
import shutil
import sys
from typing import Any, Dict, List, Optional, Tuple

from app.models.schemas import (
    OCRParseMenuResponse,
    OCRResult,
    OCRScanResponse,
    ParsedMenuCategory,
    ParsedMenuItem,
)

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


# ---------------------------------------------------------------------------
# Structured Menu Parsing (Gemini 3.x Flash + Deterministic Fallback)
# ---------------------------------------------------------------------------

_LOCALE_PHRASES: Dict[str, Dict[str, str]] = {
    "ms": {
        "greeting_local": "Helo, saya nak buat pesanan",
        "greeting_en": "Hello, I would like to place an order",
        "closing_local": "Jutaan terima kasih!",
        "closing_en": "Thank you very much!",
        "allergy_prefix": "Makluman Alahan: Saya ada alahan makanan terhadap",
    },
    "ja": {
        "greeting_local": "すみません、注文をお願いします",
        "greeting_en": "Excuse me, I would like to order",
        "closing_local": "ありがとうございます！",
        "closing_en": "Thank you very much!",
        "allergy_prefix": "アレルギーのお知らせ：次の食材にアレルギーがあります",
    },
    "kn": {
        "greeting_local": "ನಮಸ್ಕಾರ, ನಾನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ",
        "greeting_en": "Hello, I would like to place an order",
        "closing_local": "ತುಂಬಾ ಧನ್ಯವಾದಗಳು!",
        "closing_en": "Thank you very much!",
        "allergy_prefix": "ಅಲರ್ಜಿ ಸೂಚನೆ: ದಯವಿಟ್ಟು ಈ ಪದಾರ್ಥಗಳನ್ನು ಬಳಸಬೇಡಿ",
    },
    "hi": {
        "greeting_local": "नमस्ते, मैं ऑर्डर करना चाहता हूँ",
        "greeting_en": "Hello, I would like to place an order",
        "closing_local": "बहुत धन्यवाद!",
        "closing_en": "Thank you very much!",
        "allergy_prefix": "एलर्जी सूचना: कृपया इन सामग्री का उपयोग न करें",
    },
    "th": {
        "greeting_local": "สวัสดีครับ/ค่ะ ขอสั่งอาหารหน่อยครับ/ค่ะ",
        "greeting_en": "Hello, I would like to place an order",
        "closing_local": "ขอบคุณมากครับ/ค่ะ!",
        "closing_en": "Thank you very much!",
        "allergy_prefix": "แจ้งเตือนการแพ้อาหาร: แพ้ส่วนผสมต่อไปนี้",
    },
    "en": {
        "greeting_local": "Hello, I would like to place an order",
        "greeting_en": "Hello, I would like to place an order",
        "closing_local": "Thank you very much!",
        "closing_en": "Thank you very much!",
        "allergy_prefix": "Allergy Notice: Please avoid",
    },
}

_MENU_SYSTEM_PROMPT = """
You are Prayana's structured restaurant menu parser. Given extracted OCR or pasted menu text and declared traveler allergens, parse every dish into a single JSON object with these exact keys:
- "detected_language": ISO 639-1 code (e.g. "ms", "ja", "kn", "hi", "th", "en")
- "detected_currency": 3-letter currency code (e.g. "MYR", "JPY", "INR", "USD", "EUR", "THB", "SGD", "GBP", "AED")
- "greeting_local": polite ordering greeting in detected language
- "greeting_en": English translation of greeting
- "closing_local": polite thank-you in detected language
- "closing_en": English translation of closing
- "allergy_notice_local": polite allergy warning in detected language if allergens are non-empty, else ""
- "allergy_notice_en": English allergy warning if allergens are non-empty, else ""
- "categories": array of { "name": string, "items": [ { "id": string, "name_en": string, "name_original": string, "price": number, "currency": string, "category": string, "spiciness": integer 0..3, "possible_ingredients": string[], "description": string } ] }
Return ONLY valid JSON — no markdown fences, no commentary.
""".strip()


def _detect_locale_and_currency(text: str) -> Tuple[str, str]:
    low = text.lower()
    if re.search(r"[\u3040-\u30ff\u4e00-\u9faf]", text) or "¥" in text or "jpy" in low:
        return "ja", "JPY"
    if re.search(r"[\u0c80-\u0cff]", text) or any(w in low for w in ("dosa", "idli", "kadalekaayi", "bisibele")):
        return "kn", "INR"
    if re.search(r"[\u0900-\u097f]", text):
        return "hi", "INR"
    if re.search(r"[\u0e00-\u0e7f]", text) or "฿" in text or "thb" in low:
        return "th", "THB"
    if re.search(r"\brm\s*\d|\bmyr\b", low) or any(w in low for w in ("kopi", "teh", "nasi", "char kuey", "laksa", "roti canai", "milo")):
        return "ms", "MYR"
    if "€" in text or "eur" in low:
        return "en", "EUR"
    if "$" in text or "usd" in low:
        return "en", "USD"
    if "sgd" in low:
        return "en", "SGD"
    if "£" in text or "gbp" in low:
        return "en", "GBP"
    if "aed" in low:
        return "en", "AED"
    return "en", "INR"


def _infer_category_and_ingredients(name: str) -> Tuple[str, int, List[str], str]:
    low = name.lower()
    if any(w in low for w in ("tea", "teh", "coffee", "kopi", "milo", "juice", "lassi", "chai", "drink", "soda", "water", "matcha", "sake")):
        ings = ["water"]
        if any(w in low for w in ("teh", "kopi", "coffee", "tea", "chai", "lassi", "milo")):
            ings.extend(["condensed milk", "sugar"] if any(w in low for w in ("teh", "kopi", "milo")) else ["milk", "sugar"])
        return "Beverages", 0, ings, "Chilled or hot house beverage."
    if any(w in low for w in ("halwa", "cake", "ice", "dessert", "sweet", "pudding", "mochi", "kulfi", "gulab")):
        ings = ["sugar", "milk", "ghee"]
        if "badam" in low or "almond" in low:
            ings.append("almond")
        if "cashew" in low or "kaju" in low:
            ings.append("cashew")
        return "Desserts", 0, ings, "Traditional sweet course."
    spiciness = 2 if any(w in low for w in ("curry", "masala", "chili", "chilli", "spicy", "sambal", "laksa", "tom yum", "schezwan")) else (1 if any(w in low for w in ("biriyani", "biryani", "pepper", "tikka")) else 0)
    ings: List[str] = []
    for token in ("prawn", "shrimp", "chicken", "mutton", "beef", "pork", "fish", "egg", "paneer", "cashew", "kaju", "peanut", "almond", "badam", "coconut", "dosa", "idli", "rice", "noodle", "wheat", "flour", "milk", "butter", "ghee", "soy", "tofu"):
        if token in low:
            ings.append(token)
    if not ings:
        ings = ["spices", "herbs", "house seasoning"]
    return "Mains", spiciness, ings, "Prepared to order from the kitchen."


def _deterministic_menu_parse(
    extracted_text: str,
    declared_allergens: List[str],
    confidence: float,
) -> OCRParseMenuResponse:
    lang, currency = _detect_locale_and_currency(extracted_text)
    phrases = _LOCALE_PHRASES.get(lang, _LOCALE_PHRASES["en"])

    price_re = re.compile(
        r"(?:(RM|MYR|JPY|INR|USD|EUR|THB|SGD|GBP|AED|Rs\.?|₹|\$|€|¥|฿)\s*)?(\d+(?:[.,]\d{1,2})?)\s*$"
    )
    categories_map: Dict[str, List[ParsedMenuItem]] = {}

    raw_lines = [ln.strip() for ln in extracted_text.splitlines() if ln.strip()]
    idx = 0
    for line in raw_lines:
        clean = re.sub(r"^\d+[\.\)]\s*", "", line).strip()
        if not clean or len(clean) < 2:
            continue

        price = 0.0
        item_currency = currency
        m = price_re.search(clean)
        if m:
            try:
                price = float(m.group(2).replace(",", "."))
            except ValueError:
                price = 0.0
            sym = (m.group(1) or "").upper()
            if sym in ("RM", "MYR"):
                item_currency = "MYR"
            elif sym in ("¥", "JPY"):
                item_currency = "JPY"
            elif sym in ("₹", "RS", "RS.", "INR"):
                item_currency = "INR"
            elif sym in ("$", "USD"):
                item_currency = "USD"
            elif sym in ("€", "EUR"):
                item_currency = "EUR"
            elif sym in ("฿", "THB"):
                item_currency = "THB"
            clean = clean[: m.start()].strip(" -–—·|")

        if not clean:
            continue

        idx += 1
        cat_name, spiciness, ings, desc = _infer_category_and_ingredients(clean)
        tokens = _tokenise(f"{clean} {' '.join(ings)}")
        matched_allergens, _ = _match_allergens(tokens, declared_allergens)
        status = OCRResult.hazard_alert if matched_allergens else OCRResult.no_match

        item = ParsedMenuItem(
            id=f"dish-{idx}",
            name_en=clean.title() if clean.isupper() else clean,
            name_original=clean,
            price=round(price, 2),
            currency=item_currency,
            category=cat_name,
            spiciness=spiciness,
            possible_ingredients=ings,
            description=desc,
            allergen_matches=matched_allergens,
            status=status,
        )
        categories_map.setdefault(cat_name, []).append(item)

    categories = [ParsedMenuCategory(name=k, items=v) for k, v in categories_map.items()]
    allergy_en = f"Allergy Notice: Please avoid {', '.join(declared_allergens)}." if declared_allergens else ""
    allergy_local = f"{phrases['allergy_prefix']}: {', '.join(declared_allergens)}." if declared_allergens else ""

    return OCRParseMenuResponse(
        detected_language=lang,
        detected_currency=currency,
        greeting_local=phrases["greeting_local"],
        greeting_en=phrases["greeting_en"],
        closing_local=phrases["closing_local"],
        closing_en=phrases["closing_en"],
        allergy_notice_local=allergy_local,
        allergy_notice_en=allergy_en,
        categories=categories,
        raw_text_preview=extracted_text[:600].strip(),
        confidence=round(confidence, 2),
        disclaimer=MANDATORY_DISCLAIMER,
        source="deterministic_fallback",
    )


def _screen_parsed_items(
    data: Dict[str, Any],
    declared_allergens: List[str],
    extracted_text: str,
    confidence: float,
) -> OCRParseMenuResponse:
    """Applies Prayana's Levenshtein allergen screener to every Gemini-parsed dish."""
    lang = str(data.get("detected_language") or "en")
    currency = str(data.get("detected_currency") or "INR").upper()
    phrases = _LOCALE_PHRASES.get(lang, _LOCALE_PHRASES["en"])

    categories: List[ParsedMenuCategory] = []
    idx = 0
    for cat in data.get("categories") or []:
        cat_name = str(cat.get("name") or "Mains")
        parsed_items: List[ParsedMenuItem] = []
        for raw_item in cat.get("items") or []:
            idx += 1
            name_en = str(raw_item.get("name_en") or raw_item.get("name_original") or f"Dish {idx}")
            name_orig = str(raw_item.get("name_original") or name_en)
            ings = [str(x) for x in (raw_item.get("possible_ingredients") or [])]
            desc = str(raw_item.get("description") or "")
            combined_text = f"{name_en} {name_orig} {' '.join(ings)} {desc}"
            matched_allergens, _ = _match_allergens(_tokenise(combined_text), declared_allergens)
            status = OCRResult.hazard_alert if matched_allergens else OCRResult.no_match

            try:
                price_val = float(raw_item.get("price") or 0.0)
            except (TypeError, ValueError):
                price_val = 0.0
            try:
                spice_val = max(0, min(3, int(raw_item.get("spiciness") or 0)))
            except (TypeError, ValueError):
                spice_val = 0

            parsed_items.append(
                ParsedMenuItem(
                    id=str(raw_item.get("id") or f"dish-{idx}"),
                    name_en=name_en,
                    name_original=name_orig,
                    price=round(price_val, 2),
                    currency=str(raw_item.get("currency") or currency).upper(),
                    category=cat_name,
                    spiciness=spice_val,
                    possible_ingredients=ings,
                    description=desc,
                    allergen_matches=matched_allergens,
                    status=status,
                )
            )
        if parsed_items:
            categories.append(ParsedMenuCategory(name=cat_name, items=parsed_items))

    allergy_en = str(data.get("allergy_notice_en") or "")
    allergy_local = str(data.get("allergy_notice_local") or "")
    if declared_allergens and not allergy_en:
        allergy_en = f"Allergy Notice: Please avoid {', '.join(declared_allergens)}."
    if declared_allergens and not allergy_local:
        allergy_local = f"{phrases['allergy_prefix']}: {', '.join(declared_allergens)}."

    return OCRParseMenuResponse(
        detected_language=lang,
        detected_currency=currency,
        greeting_local=str(data.get("greeting_local") or phrases["greeting_local"]),
        greeting_en=str(data.get("greeting_en") or phrases["greeting_en"]),
        closing_local=str(data.get("closing_local") or phrases["closing_local"]),
        closing_en=str(data.get("closing_en") or phrases["closing_en"]),
        allergy_notice_local=allergy_local,
        allergy_notice_en=allergy_en,
        categories=categories,
        raw_text_preview=extracted_text[:600].strip(),
        confidence=round(confidence, 2),
        disclaimer=MANDATORY_DISCLAIMER,
        source="gemini",
    )


async def parse_menu_structured(
    image_bytes: Optional[bytes],
    raw_text: Optional[str],
    declared_allergens: List[str],
    target_currency: str = "INR",
) -> OCRParseMenuResponse:
    """
    1. Run Tesseract OCR if image_bytes supplied (fallback to raw_text).
    2. Call Gemini 3.x Flash for structured menu translation & parsing.
    3. Fall back cleanly to deterministic line parser if offline/rate-limited.
    4. Screen every dish with Prayana's Levenshtein allergen matcher.
    """
    extracted_text = ""
    ocr_available = False
    if image_bytes:
        extracted_text, ocr_available = _ocr_from_image_bytes(image_bytes)
    if not extracted_text.strip():
        extracted_text = raw_text or ""

    if not extracted_text.strip():
        return _deterministic_menu_parse("", declared_allergens, 0.0)

    tokens = _tokenise(extracted_text)
    confidence = min(0.96, 0.65 + 0.004 * len(tokens)) if ocr_available else min(0.88, 0.68 + 0.003 * len(tokens))

    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        try:
            from google import genai  # type: ignore
            from google.genai import types as genai_types  # type: ignore

            client = genai.Client(
                api_key=api_key,
                http_options=genai_types.HttpOptions(
                    timeout=14000,
                    retry_options=genai_types.HttpRetryOptions(attempts=1),
                ),
            )
            prompt = (
                f"Target currency: {target_currency}\n"
                f"Declared cohort allergens: {', '.join(declared_allergens) if declared_allergens else 'None'}\n\n"
                f"Menu text:\n{extracted_text[:4000]}"
            )
            preferred = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
            for model_name in dict.fromkeys([preferred, "gemini-3.5-flash-lite", "gemini-3.7-flash", "gemini-3.5-flash"]):
                try:
                    resp = client.models.generate_content(
                        model=model_name,
                        contents=[prompt],
                        config=genai_types.GenerateContentConfig(
                            system_instruction=_MENU_SYSTEM_PROMPT,
                            response_mime_type="application/json",
                            temperature=0.15,
                            max_output_tokens=2048,
                        ),
                    )
                    if resp and resp.text:
                        parsed = json.loads(resp.text.strip())
                        if isinstance(parsed, dict) and parsed.get("categories"):
                            return _screen_parsed_items(parsed, declared_allergens, extracted_text, confidence)
                except Exception:
                    continue
        except Exception as exc:
            print(f"[ocr_allergen] Gemini menu parse fallback: {exc}", file=sys.stderr)

    return _deterministic_menu_parse(extracted_text, declared_allergens, confidence)
