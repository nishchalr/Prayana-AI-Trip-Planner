import type { OCRParseMenuResponse, ParsedMenuCategory, ParsedMenuItem } from '../services/apiClient';
import type { TravelerProfile } from '../types';

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  rateToInr: number; // 1 unit of currency = X INR
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToInr: 1.0 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rateToInr: 22.4 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToInr: 0.57 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToInr: 86.5 },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToInr: 93.8 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rateToInr: 2.55 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToInr: 64.5 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToInr: 109.2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateToInr: 23.55 },
];

const FX_CACHE_KEY = 'prayana_fx_inr_rates_v1';

export function getCachedFxRates(): Record<string, number> {
  const defaults: Record<string, number> = {};
  SUPPORTED_CURRENCIES.forEach(c => {
    defaults[c.code] = c.rateToInr;
  });
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as { rates?: Record<string, number> };
    return { ...defaults, ...(parsed.rates || {}) };
  } catch {
    return defaults;
  }
}

/**
 * Fetches live FX rates (with offline/cached fallback) so currency conversion always works.
 */
export async function fetchLiveFxRatesToInr(): Promise<Record<string, number>> {
  const cached = getCachedFxRates();
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return cached;
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (!data.rates) return cached;
    const updated: Record<string, number> = { ...cached };
    for (const c of SUPPORTED_CURRENCIES) {
      const perInr = data.rates[c.code];
      if (typeof perInr === 'number' && perInr > 0) {
        updated[c.code] = Number((1 / perInr).toFixed(4));
      }
    }
    try {
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rates: updated, ts: Date.now() }));
    } catch {
      // ignore storage quota
    }
    return updated;
  } catch {
    return cached;
  }
}

export function getCurrencySymbol(code: string): string {
  const upper = (code || 'INR').toUpperCase();
  return SUPPORTED_CURRENCIES.find(c => c.code === upper)?.symbol || upper;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesToInr: Record<string, number>
): number {
  const fromRate = ratesToInr[(fromCurrency || 'INR').toUpperCase()] ?? 1;
  const toRate = ratesToInr[(toCurrency || 'INR').toUpperCase()] ?? 1;
  const inInr = amount * fromRate;
  return toRate > 0 ? inInr / toRate : inInr;
}

export function formatCurrencyValue(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  const upper = (currency || 'INR').toUpperCase();
  const formatted = upper === 'JPY' ? Math.round(amount).toLocaleString('en-IN') : amount.toFixed(2);
  return sym.length > 1 ? `${sym} ${formatted}` : `${sym}${formatted}`;
}

const LOCALE_SPEECH_MAP: Record<string, string> = {
  ms: 'ms-MY',
  ja: 'ja-JP',
  kn: 'kn-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  fr: 'fr-FR',
  es: 'es-ES',
  th: 'th-TH',
  en: 'en-IN',
};

export const TRANSLATOR_LANGUAGES = [
  { code: 'auto', label: 'Auto-Detect' },
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'Kannada' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ms', label: 'Malay' },
  { code: 'ja', label: 'Japanese' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
];

export function detectInputMode(text: string): 'MENU' | 'TEXT' {
  const trimmed = text.trim();
  if (!trimmed) return 'TEXT';
  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
  const hasPrices = /(?:RM|MYR|JPY|INR|USD|EUR|THB|SGD|GBP|AED|Rs\.?|₹|\$|€|¥|฿)\s*\d+/i.test(trimmed);
  const hasDishSeparators = lines.some(l => l.includes('|') || /^\d+[.)]\s+/.test(l.trim()));
  if (hasPrices || (lines.length >= 2 && hasDishSeparators)) return 'MENU';
  return 'TEXT';
}

const OFFLINE_PHRASE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'where is the nearest train station': {
    ja: '一番近い駅はどこですか？',
    kn: 'ಹತ್ತಿರದ ರೈಲು ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?',
    hi: 'निकटतम रेलवे स्टेशन कहाँ है?',
    ta: 'அருகிலுள்ள ரயில் நிலையம் எங்கே உள்ளது?',
    te: 'దగ్గరలోని రైలు స్టేషన్ ఎక్కడ ఉంది?',
    ms: 'Di manakah stesen kereta api terdekat?',
    fr: 'Où est la gare la plus proche ?',
    es: '¿Dónde está la estación de tren más cercana?',
    en: 'Where is the nearest train station?',
  },
  'how much does this cost': {
    ja: 'これはいくらですか？',
    kn: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?',
    hi: 'इसकी कीमत क्या है?',
    ta: 'இதன் விலை என்ன?',
    te: 'దీని ధర ఎంత?',
    ms: 'Berapakah harga ini?',
    fr: 'Combien ça coûte ?',
    es: '¿Cuánto cuesta esto?',
    en: 'How much does this cost?',
  },
  'please call a doctor': {
    ja: 'お医者さんを呼んでください。',
    kn: 'ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಕರೆಯಿರಿ.',
    hi: 'कृपया डॉक्टर को बुलाएँ।',
    ta: 'தயவுசெய்து மருத்துவரை அழையுங்கள்.',
    te: 'దయచేసి డాక్టర్‌ను పిలవండి.',
    ms: 'Sila panggil doktor.',
    fr: 'Veuillez appeler un médecin.',
    es: 'Por favor llame a un médico.',
    en: 'Please call a doctor.',
  },
  'does this contain peanuts': {
    ja: 'これにはピーナッツが入っていますか？',
    kn: 'ಇದರಲ್ಲಿ ಕಡಲೆಕಾಯಿ ಇದೆಯಾ?',
    hi: 'क्या इसमें मूँगफली है?',
    ta: 'இதில் வேர்க்கடலை உள்ளதா?',
    te: 'ఇందులో వేరుశెనగ ఉందా?',
    ms: 'Adakah ini mengandungi kacang tanah?',
    fr: 'Est-ce que cela contient des cacahuètes ?',
    es: '¿Esto contiene cacahuetes?',
    en: 'Does this contain peanuts?',
  },
};

export function deterministicTextTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): { detectedSource: string; translatedText: string } {
  const clean = text.trim();
  const low = clean.toLowerCase().replace(/[?!.]+$/g, '').trim();
  const detectedSource =
    sourceLang !== 'auto'
      ? sourceLang
      : /[\u3040-\u30ff\u4e00-\u9faf]/.test(clean)
      ? 'ja'
      : /[\u0c80-\u0cff]/.test(clean)
      ? 'kn'
      : /[\u0900-\u097f]/.test(clean)
      ? 'hi'
      : /(helo|terima kasih|makan|stesen|kacang)/i.test(low)
      ? 'ms'
      : 'en';

  const phraseMatch = OFFLINE_PHRASE_TRANSLATIONS[low]?.[targetLang];
  if (phraseMatch) {
    return { detectedSource, translatedText: phraseMatch };
  }

  // Reverse lookup if source is a known local phrase
  for (const [, translations] of Object.entries(OFFLINE_PHRASE_TRANSLATIONS)) {
    const matchedLang = Object.entries(translations).find(
      ([, v]) => v.toLowerCase().replace(/[?!.]+$/g, '').trim() === low
    );
    if (matchedLang && translations[targetLang]) {
      return { detectedSource: matchedLang[0], translatedText: translations[targetLang] };
    }
  }

  const targetName = TRANSLATOR_LANGUAGES.find(l => l.code === targetLang)?.label || targetLang.toUpperCase();
  return {
    detectedSource,
    translatedText: `${clean} (${targetName} translation ready when online / Gemini live)`,
  };
}

export function speakInLocalLanguage(
  text: string,
  langCode: string
): { supported: boolean; voiceFound: boolean } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { supported: false, voiceFound: false };
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const bcp47 = LOCALE_SPEECH_MAP[langCode] || langCode || 'en-US';
  const voices = synth.getVoices();
  const prefix = bcp47.split('-')[0].toLowerCase();
  const matchedVoice =
    voices.find(v => v.lang.toLowerCase() === bcp47.toLowerCase()) ||
    voices.find(v => v.lang.toLowerCase().startsWith(prefix));

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = bcp47;
  utterance.rate = 0.92;
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  synth.speak(utterance);

  return {
    supported: true,
    voiceFound: Boolean(matchedVoice),
  };
}

const NON_VEG_INGREDIENTS = [
  'chicken', 'mutton', 'beef', 'pork', 'lamb', 'goat', 'meat', 'fish',
  'prawn', 'prawns', 'shrimp', 'udang', 'crab', 'lobster', 'seafood',
  'clam', 'mussel', 'oyster', 'squid', 'calamari', 'egg', 'eggs',
  'bacon', 'ham', 'sausage', 'dashi', 'anchovy',
];

const DAIRY_INGREDIENTS = [
  'milk', 'condensed milk', 'susu', 'cream', 'butter', 'cheese',
  'paneer', 'ghee', 'curd', 'yogurt', 'lactose', 'whey', 'dahi', 'malai', 'lassi',
];

const ALLERGEN_TOKEN_MAP: Record<string, string[]> = {
  'Shellfish Allergy': ['prawn', 'prawns', 'shrimp', 'udang', 'crab', 'lobster', 'shellfish', 'seafood', 'clam', 'mussel', 'oyster', 'scampi', 'squid', 'calamari'],
  'Mollusc Allergy': ['clam', 'mussel', 'oyster', 'squid', 'calamari', 'octopus', 'scallop'],
  'Fin Fish Allergy': ['fish', 'salmon', 'tuna', 'cod', 'mackerel', 'anchovy', 'dashi', 'bonito', 'pomfret'],
  'Peanut Allergy': ['peanut', 'peanuts', 'groundnut', 'moongphali', 'singdana', 'satay', 'kacang', 'kadalekaayi'],
  'Nut Allergy': ['peanut', 'peanuts', 'cashew', 'kaju', 'almond', 'badam', 'walnut', 'pistachio', 'pista', 'hazelnut', 'pecan', 'macadamia', 'kacang'],
  'Tree Nut Allergy': ['cashew', 'kaju', 'almond', 'badam', 'walnut', 'akhrot', 'pistachio', 'pista', 'hazelnut', 'pecan', 'macadamia'],
  'Gluten-Free': ['wheat', 'maida', 'atta', 'flour', 'roti', 'paratha', 'bread', 'naan', 'semolina', 'rava', 'gluten', 'barley', 'rye', 'udon', 'ramen', 'mee', 'noodle', 'noodles'],
  'Celiac Disease (Strict Gluten-Free)': ['wheat', 'maida', 'atta', 'flour', 'roti', 'paratha', 'bread', 'naan', 'gluten', 'barley', 'rye', 'udon', 'ramen', 'mee', 'noodle', 'noodles'],
  'Wheat Allergy': ['wheat', 'maida', 'atta', 'flour', 'roti', 'naan', 'bread', 'semolina', 'rava'],
  'Dairy-Free': DAIRY_INGREDIENTS,
  'Milk / Dairy Allergy': DAIRY_INGREDIENTS,
  'Lactose Intolerance': DAIRY_INGREDIENTS,
  'Egg-Free': ['egg', 'eggs', 'omelette', 'mayo', 'mayonnaise', 'albumen', 'bhurji', 'telur'],
  'Egg Allergy': ['egg', 'eggs', 'omelette', 'mayo', 'mayonnaise', 'albumen', 'bhurji', 'telur'],
  'Soy Allergy': ['soy', 'soya', 'soybean', 'tofu', 'edamame', 'miso', 'tempeh', 'shoyu', 'tamari', 'teriyaki'],
  'Sesame Allergy': ['sesame', 'til', 'tahini', 'gingelly', 'goma', 'hummus', 'halva'],
  'Pure Vegetarian': NON_VEG_INGREDIENTS,
  'Vegetarian': NON_VEG_INGREDIENTS,
  'Lacto-Vegetarian': NON_VEG_INGREDIENTS,
  'Vegan': [...NON_VEG_INGREDIENTS, ...DAIRY_INGREDIENTS, 'honey'],
  'Vegan (Plant-Based)': [...NON_VEG_INGREDIENTS, ...DAIRY_INGREDIENTS, 'honey'],
  'Jain Vegetarian': [...NON_VEG_INGREDIENTS, 'onion', 'garlic', 'potato', 'aloo', 'carrot', 'radish', 'ginger'],
  'Jain Vegetarian (Strict)': [...NON_VEG_INGREDIENTS, 'onion', 'garlic', 'potato', 'aloo', 'carrot', 'radish', 'ginger'],
  'Halal': ['pork', 'bacon', 'ham', 'lard', 'gelatin', 'alcohol', 'wine', 'beer', 'mirin', 'sake'],
};

const STOP_RULE_WORDS = new Set([
  'allergy', 'allergic', 'intolerance', 'sensitivity', 'diet', 'free', 'avoid',
  'strict', 'risk', 'severe', 'syndrome', 'pure', 'vegetarian', 'vegan', 'jain',
]);

export function resolveRuleKeywords(rule: string): string[] {
  if (ALLERGEN_TOKEN_MAP[rule]) return ALLERGEN_TOKEN_MAP[rule];
  const low = rule.toLowerCase().trim();
  for (const [k, v] of Object.entries(ALLERGEN_TOKEN_MAP)) {
    if (k.toLowerCase() === low) return v;
  }
  if (low.includes('vegetarian')) return NON_VEG_INGREDIENTS;
  if (low.includes('vegan')) return [...NON_VEG_INGREDIENTS, ...DAIRY_INGREDIENTS, 'honey'];
  if (low.includes('dairy') || low.includes('lactose')) return DAIRY_INGREDIENTS;
  if (low.includes('gluten') || low.includes('celiac')) return ALLERGEN_TOKEN_MAP['Gluten-Free'];
  if (low.includes('shellfish')) return ALLERGEN_TOKEN_MAP['Shellfish Allergy'];
  if (low.includes('peanut')) return ALLERGEN_TOKEN_MAP['Peanut Allergy'];
  if (low.includes('nut')) return ALLERGEN_TOKEN_MAP['Nut Allergy'];
  return low
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !STOP_RULE_WORDS.has(w));
}

function matchesKeywordWordBoundary(haystack: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

export type DishCohortSeverity = 'ALL_RESTRICTED' | 'PARTIAL_CAUTION' | 'NO_MATCH_DETECTED';

export interface DishCohortEvaluation {
  severity: DishCohortSeverity;
  affectedCount: number;
  totalMembers: number;
  affectedTravelers: Array<{ id: string; name: string; reasons: string[] }>;
  matchedAllergens: string[];
}

export function evaluateDishForCohort(
  dish: ParsedMenuItem,
  travelers: TravelerProfile[]
): DishCohortEvaluation {
  const haystack = `${dish.name_en} ${dish.name_original} ${dish.possible_ingredients.join(' ')} ${dish.description}`.toLowerCase();

  if (!travelers || travelers.length === 0) {
    const fallbackMatches = (dish.allergen_matches || []).filter(Boolean);
    return {
      severity: fallbackMatches.length > 0 ? 'PARTIAL_CAUTION' : 'NO_MATCH_DETECTED',
      affectedCount: fallbackMatches.length > 0 ? 1 : 0,
      totalMembers: 0,
      affectedTravelers: [],
      matchedAllergens: fallbackMatches,
    };
  }

  const affectedTravelers: Array<{ id: string; name: string; reasons: string[] }> = [];
  const allMatchedSet = new Set<string>();

  travelers.forEach((traveler) => {
    const rules = (traveler.dietaryTags || []).filter(t => t && t !== 'None');
    const matchedForTraveler: string[] = [];

    rules.forEach((rule) => {
      const keywords = resolveRuleKeywords(rule);
      if (keywords.some(kw => matchesKeywordWordBoundary(haystack, kw))) {
        matchedForTraveler.push(rule);
        allMatchedSet.add(rule);
      }
    });

    if (matchedForTraveler.length > 0) {
      affectedTravelers.push({
        id: traveler.id,
        name: traveler.name.split(' ')[0] || traveler.name,
        reasons: matchedForTraveler,
      });
    }
  });

  const totalMembers = travelers.length;
  const affectedCount = affectedTravelers.length;
  let severity: DishCohortSeverity = 'NO_MATCH_DETECTED';
  if (affectedCount > 0 && affectedCount === totalMembers) {
    severity = 'ALL_RESTRICTED';
  } else if (affectedCount > 0) {
    severity = 'PARTIAL_CAUTION';
  }

  return {
    severity,
    affectedCount,
    totalMembers,
    affectedTravelers,
    matchedAllergens: Array.from(allMatchedSet),
  };
}

const LOCALE_PHRASES: Record<
  string,
  { greeting_local: string; greeting_en: string; closing_local: string; closing_en: string; allergy_prefix: string }
> = {
  ms: {
    greeting_local: 'Helo, saya nak buat pesanan',
    greeting_en: 'Hello, I would like to place an order',
    closing_local: 'Jutaan terima kasih!',
    closing_en: 'Thank you very much!',
    allergy_prefix: 'Makluman Alahan: Saya ada alahan terhadap',
  },
  ja: {
    greeting_local: 'すみません、注文をお願いします',
    greeting_en: 'Excuse me, I would like to order',
    closing_local: 'ありがとうございます！',
    closing_en: 'Thank you very much!',
    allergy_prefix: 'アレルギーのお知らせ：次の食材にアレルギーがあります',
  },
  kn: {
    greeting_local: 'ನಮಸ್ಕಾರ, ನಾನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ',
    greeting_en: 'Hello, I would like to place an order',
    closing_local: 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು!',
    closing_en: 'Thank you very much!',
    allergy_prefix: 'ಅಲರ್ಜಿ ಸೂಚನೆ: ದಯವಿಟ್ಟು ಈ ಪದಾರ್ಥಗಳನ್ನು ಬಳಸಬೇಡಿ',
  },
  hi: {
    greeting_local: 'नमस्ते, मैं ऑर्डर करना चाहता हूँ',
    greeting_en: 'Hello, I would like to place an order',
    closing_local: 'बहुत धन्यवाद!',
    closing_en: 'Thank you very much!',
    allergy_prefix: 'एलर्जी सूचना: कृपया इन सामग्री का उपयोग न करें',
  },
  en: {
    greeting_local: 'Hello, I would like to place an order',
    greeting_en: 'Hello, I would like to place an order',
    closing_local: 'Thank you very much!',
    closing_en: 'Thank you very much!',
    allergy_prefix: 'Allergy Notice: Please avoid',
  },
};

export function deterministicClientMenuParse(
  rawText: string,
  declaredAllergens: string[]
): OCRParseMenuResponse {
  const low = rawText.toLowerCase();
  let lang = 'en';
  let currency = 'INR';

  if (/\brm\s*\d|\bmyr\b/i.test(rawText) || /(kopi|teh|nasi|laksa|milo|roti canai)/i.test(low)) {
    lang = 'ms';
    currency = 'MYR';
  } else if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(rawText) || /¥|jpy/i.test(rawText)) {
    lang = 'ja';
    currency = 'JPY';
  } else if (/(dosa|idli|kadalekaayi|bisibele)/i.test(low)) {
    lang = 'kn';
    currency = 'INR';
  } else if (/฿|thb/i.test(rawText)) {
    lang = 'th';
    currency = 'THB';
  } else if (/€|eur/i.test(rawText)) {
    currency = 'EUR';
  } else if (/\$|usd/i.test(rawText)) {
    currency = 'USD';
  }

  const phrases = LOCALE_PHRASES[lang] || LOCALE_PHRASES.en;
  const priceRe = /(?:(RM|MYR|JPY|INR|USD|EUR|THB|SGD|GBP|AED|Rs\.?|₹|\$|€|¥|฿)\s*)?(\d+(?:[.,]\d{1,2})?)\s*$/i;
  const categoriesMap = new Map<string, ParsedMenuItem[]>();

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  lines.forEach((line, i) => {
    let clean = line.replace(/^\d+[.)]\s*/, '').trim();
    if (!clean) return;

    let price = 0;
    let itemCurrency = currency;
    const match = clean.match(priceRe);
    if (match) {
      price = parseFloat(match[2].replace(',', '.')) || 0;
      const sym = (match[1] || '').toUpperCase();
      if (sym === 'RM' || sym === 'MYR') itemCurrency = 'MYR';
      else if (sym === '¥' || sym === 'JPY') itemCurrency = 'JPY';
      else if (sym === '₹' || sym === 'RS' || sym === 'RS.' || sym === 'INR') itemCurrency = 'INR';
      else if (sym === '$' || sym === 'USD') itemCurrency = 'USD';
      else if (sym === '€' || sym === 'EUR') itemCurrency = 'EUR';
      else if (sym === '฿' || sym === 'THB') itemCurrency = 'THB';
      clean = clean.slice(0, match.index).replace(/[-–—·|]+$/, '').trim();
    }

    if (!clean) return;

    // Support optional "Original Name | English Name" syntax or single name
    const parts = clean.split('|').map(p => p.trim()).filter(Boolean);
    const nameOriginal = parts[0];
    const nameEn = parts[1] || (clean === clean.toUpperCase() ? clean.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : clean);

    const itemLow = `${nameOriginal} ${nameEn}`.toLowerCase();
    const isBeverage = /(tea|teh|coffee|kopi|milo|juice|lassi|chai|drink|matcha|sake|soda)/.test(itemLow);
    const isDessert = /(halwa|cake|ice|dessert|sweet|pudding|mochi|kulfi)/.test(itemLow);
    const category = isBeverage ? 'Beverages' : isDessert ? 'Desserts' : 'Mains';

    const spiciness = /(curry|masala|chili|chilli|spicy|sambal|laksa|tom yum)/.test(itemLow)
      ? 2
      : /(biriyani|biryani|pepper|tikka)/.test(itemLow)
      ? 1
      : 0;

    const isBlackDrink = /(black coffee|kopi o|teh o|americano|espresso|plain tea|green tea)/.test(itemLow);
    const isMilkyDrink = !isBlackDrink && /(teh tarik|pulled milk|milk tea|latte|chai|lassi|milo|susu|filter coffee|kopi|teh)/.test(itemLow);

    const possibleIngredients: string[] = [];
    if (isBeverage) {
      possibleIngredients.push(/(coffee|kopi)/.test(itemLow) ? 'coffee' : 'tea', 'water');
      if (isMilkyDrink) {
        possibleIngredients.push('condensed milk', 'sugar');
      }
    }
    ['prawn', 'shrimp', 'udang', 'chicken', 'mutton', 'beef', 'fish', 'egg', 'paneer', 'cashew', 'kaju', 'peanut', 'peanuts', 'almond', 'badam', 'coconut', 'dosa', 'idli', 'rice', 'noodle', 'noodles', 'flat noodles', 'wheat', 'flour', 'milk', 'condensed milk', 'butter', 'ghee', 'soy', 'tofu'].forEach(tok => {
      if (itemLow.includes(tok) && !possibleIngredients.includes(tok)) possibleIngredients.push(tok);
    });
    if (possibleIngredients.length === 0) possibleIngredients.push('house spices', 'seasoning');

    const combined = `${nameOriginal} ${nameEn} ${possibleIngredients.join(' ')}`.toLowerCase();
    const allergenMatches = declaredAllergens.filter(rule => {
      const kws = resolveRuleKeywords(rule);
      return kws.some(kw => matchesKeywordWordBoundary(combined, kw));
    });

    const item: ParsedMenuItem = {
      id: `dish-${i + 1}`,
      name_en: nameEn,
      name_original: nameOriginal,
      price: Number(price.toFixed(2)),
      currency: itemCurrency,
      category,
      spiciness,
      possible_ingredients: possibleIngredients,
      description: isBeverage ? 'Prepared fresh at the beverage counter.' : 'Prepared to order from the kitchen.',
      allergen_matches: allergenMatches,
      status: allergenMatches.length > 0 ? 'HAZARD_ALERT' : 'NO_MATCH_DETECTED',
    };

    if (!categoriesMap.has(category)) categoriesMap.set(category, []);
    categoriesMap.get(category)!.push(item);
  });

  const categories: ParsedMenuCategory[] = Array.from(categoriesMap.entries()).map(([name, items]) => ({
    name,
    items,
  }));

  return {
    detected_language: lang,
    detected_currency: currency,
    greeting_local: phrases.greeting_local,
    greeting_en: phrases.greeting_en,
    closing_local: phrases.closing_local,
    closing_en: phrases.closing_en,
    allergy_notice_local: declaredAllergens.length ? `${phrases.allergy_prefix}: ${declaredAllergens.join(', ')}.` : '',
    allergy_notice_en: declaredAllergens.length ? `Allergy Notice: Please avoid ${declaredAllergens.join(', ')}.` : '',
    categories,
    raw_text_preview: rawText.slice(0, 600),
    confidence: 0.84,
    disclaimer:
      'AI Reference Only — Always verify ingredients, hidden allergens, and cross-contact with restaurant staff before ordering.',
    source: 'deterministic_fallback',
  };
}
