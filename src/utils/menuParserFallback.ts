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

const CLIENT_DISH_KB: Array<{
  keys: string[];
  nameEn: string;
  category: 'Mains' | 'Beverages' | 'Desserts';
  spiciness: number;
  sweetness: number;
  bitterness: number;
  ingredients: string[];
  description: string;
}> = [
  { keys: ['ಇಡ್ಲಿ', 'idli'], nameEn: 'Idli', category: 'Mains', spiciness: 0, sweetness: 0, bitterness: 0, ingredients: ['fermented rice', 'urad dal', 'coconut chutney', 'sambar'], description: 'Steamed fermented rice & lentil cakes served with chutney and sambar.' },
  { keys: ['ಮಸಾಲೆ ದೋಸೆ', 'masala dosa'], nameEn: 'Masala Dosa', category: 'Mains', spiciness: 2, sweetness: 0, bitterness: 0, ingredients: ['rice', 'urad dal', 'potato masala', 'onion', 'ghee', 'mustard seeds'], description: 'Crisp fermented crepe filled with spiced potato masala and ghee.' },
  { keys: ['ರವಾ ದೋಸೆ', 'rava dosa'], nameEn: 'Rava Dosa', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['semolina', 'rava', 'rice flour', 'maida', 'cumin', 'curry leaves', 'onion'], description: 'Crisp lacy semolina and rice-flour crepe speckled with cumin.' },
  { keys: ['ಸೆಟ್ ದೋಸೆ', 'set dosa'], nameEn: 'Set Dosa', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['rice', 'urad dal', 'poha', 'fenugreek', 'ghee'], description: 'Soft spongy trio of fermented rice crepes.' },
  { keys: ['ದೋಸೆ', 'dosa'], nameEn: 'Plain Dosa', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['rice', 'urad dal', 'ghee', 'coconut chutney'], description: 'Golden crisp fermented rice and lentil crepe.' },
  { keys: ['ವಡೆ', 'vada', 'medu vada'], nameEn: 'Medu Vada', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['urad dal', 'black pepper', 'curry leaves', 'ginger', 'onion'], description: 'Crisp savory urad dal fritters.' },
  { keys: ['ಕೇಸರಿ ಬಾತ್', 'kesari bath', 'kesari'], nameEn: 'Kesari Bath', category: 'Desserts', spiciness: 0, sweetness: 3, bitterness: 0, ingredients: ['semolina', 'rava', 'sugar', 'ghee', 'saffron', 'cashew', 'raisins'], description: 'Rich saffron-scented semolina dessert cooked with ghee and cashews.' },
  { keys: ['ಬಿಸಿ ಬೇಳೆ ಬಾತ್', 'bisi bele bath', 'bisibelebath'], nameEn: 'Bisi Bele Bath', category: 'Mains', spiciness: 2, sweetness: 0, bitterness: 0, ingredients: ['rice', 'toor dal', 'tamarind', 'ghee', 'mixed vegetables', 'cashew', 'spices'], description: 'Spiced Karnataka rice-and-lentil medley tempered with ghee.' },
  { keys: ['ಖಾರಾ ಬಾತ್', 'khara bath'], nameEn: 'Khara Bath', category: 'Mains', spiciness: 2, sweetness: 0, bitterness: 0, ingredients: ['semolina', 'rava', 'ghee', 'green chili', 'onion', 'tomato', 'cashew'], description: 'Savory spiced semolina upma with vegetables.' },
  { keys: ['ಪೂರಿ ಸಾಗು', 'poori saagu', 'puri sagu'], nameEn: 'Poori Saagu', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['wheat flour', 'atta', 'potato', 'onion', 'coconut', 'green peas'], description: 'Puffed whole-wheat pooris paired with spiced vegetable saagu.' },
  { keys: ['ಪೊಂಗಲ್', 'pongal'], nameEn: 'Khara Pongal', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['rice', 'moong dal', 'ghee', 'black pepper', 'cumin', 'cashew'], description: 'Comforting rice and lentil porridge tempered with pepper and ghee.' },
  { keys: ['ಉಪ್ಪಿಟ್ಟು', 'upma'], nameEn: 'Upma', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['semolina', 'rava', 'mustard seeds', 'curry leaves', 'onion', 'ghee'], description: 'Warm tempered semolina breakfast.' },
  { keys: ['ಮೈಸೂರು ಪಾಕ್', 'mysore pak'], nameEn: 'Mysore Pak', category: 'Desserts', spiciness: 0, sweetness: 3, bitterness: 0, ingredients: ['gram flour', 'besan', 'ghee', 'sugar'], description: 'Melt-in-mouth roasted gram flour and ghee fudge.' },
  { keys: ['ಫಿಲ್ಟರ್ ಕಾಫಿ', 'filter coffee'], nameEn: 'Filter Coffee', category: 'Beverages', spiciness: 0, sweetness: 1, bitterness: 2, ingredients: ['roasted coffee', 'chicory', 'milk', 'sugar'], description: 'South Indian decoction coffee frothed with hot milk.' },
  { keys: ['ಬಾದಾಮ್ ಹಾಲು', 'badam milk'], nameEn: 'Badam Milk', category: 'Beverages', spiciness: 0, sweetness: 2, bitterness: 0, ingredients: ['milk', 'almond', 'badam', 'saffron', 'sugar', 'cardamom'], description: 'Warm saffron-almond milk.' },
  { keys: ['sushi', '寿司', 'nigiri', 'sashimi'], nameEn: 'Assorted Sushi', category: 'Mains', spiciness: 1, sweetness: 1, bitterness: 0, ingredients: ['raw fish', 'sushi rice', 'nori seaweed', 'wasabi', 'soy sauce', 'rice vinegar'], description: 'Hand-pressed vinegared rice topped with fresh raw fish.' },
  { keys: ['wagyu', '和牛'], nameEn: 'Wagyu Steak', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['beef', 'butter', 'garlic', 'black pepper', 'sea salt'], description: 'Seared Japanese marbled beef finished with garlic butter.' },
  { keys: ['matcha ice cream', '抹茶アイス'], nameEn: 'Matcha Ice Cream', category: 'Desserts', spiciness: 0, sweetness: 2, bitterness: 2, ingredients: ['matcha green tea', 'dairy cream', 'milk', 'sugar', 'egg yolk'], description: 'Velvety Uji matcha green tea ice cream with earthy bitterness.' },
  { keys: ['char kuey teow'], nameEn: 'Char Kuey Teow', category: 'Mains', spiciness: 2, sweetness: 1, bitterness: 0, ingredients: ['flat rice noodles', 'prawn', 'shrimp', 'egg', 'soy sauce', 'bean sprouts', 'garlic'], description: 'Wok-seared flat rice noodles with prawns and egg.' },
  { keys: ['nasi lemak'], nameEn: 'Nasi Lemak', category: 'Mains', spiciness: 2, sweetness: 1, bitterness: 0, ingredients: ['coconut rice', 'sambal chili', 'anchovy', 'peanut', 'egg', 'cucumber'], description: 'Fragrant coconut rice with spicy sambal, anchovies, and peanuts.' },
  { keys: ['teh tarik'], nameEn: 'Teh Tarik', category: 'Beverages', spiciness: 0, sweetness: 2, bitterness: 1, ingredients: ['black tea', 'condensed milk', 'evaporated milk', 'sugar'], description: 'Pulled Malaysian milk tea with frothy top.' },
  { keys: ['kopi o', 'black coffee'], nameEn: 'Black Coffee (Kopi O)', category: 'Beverages', spiciness: 0, sweetness: 0, bitterness: 3, ingredients: ['roasted coffee', 'water'], description: 'Bold black coffee with zero dairy.' },
  { keys: ['laksa'], nameEn: 'Curry Laksa', category: 'Mains', spiciness: 3, sweetness: 1, bitterness: 0, ingredients: ['rice noodles', 'coconut milk', 'prawn', 'shrimp', 'fish cake', 'chili paste', 'tofu'], description: 'Rich spicy coconut curry noodle soup.' },
  { keys: ['roti canai'], nameEn: 'Roti Canai', category: 'Mains', spiciness: 1, sweetness: 0, bitterness: 0, ingredients: ['wheat flour', 'maida', 'ghee', 'condensed milk', 'dhal curry'], description: 'Flaky pan-griddled flatbread served with dhal.' },
];

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
  } else if (/[\u0c80-\u0cff]/.test(rawText) || /(dosa|idli|kadalekaayi|bisibele|kesari|vada)/i.test(low)) {
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
  const priceRe = /(?:(RM|MYR|JPY|INR|USD|EUR|THB|SGD|GBP|AED|Rs\.?|₹|\$|€|¥|฿)\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:\/-)?\s*$/i;
  const categoriesMap = new Map<string, ParsedMenuItem[]>();
  let headingCategory: 'Mains' | 'Beverages' | 'Desserts' | null = null;

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let dishCounter = 0;
  lines.forEach((line) => {
    // Skip Markdown table separators (e.g. | --- | --- | or ----)
    if (/^\|?[\s:=-]+\|[\s|:-]*$/.test(line) || /^[-=_*]{3,}$/.test(line)) return;
    // Handle Markdown headings (### Breakfast / ### ಪಾನೀಯ)
    if (line.startsWith('#')) {
      const hLow = line.replace(/^#+\s*/, '').toLowerCase();
      if (/(beverage|drink|coffee|tea|ಕಾಫಿ|ಪಾನೀಯ)/.test(hLow)) headingCategory = 'Beverages';
      else if (/(dessert|sweet|ಸಿಹಿ)/.test(hLow)) headingCategory = 'Desserts';
      else headingCategory = null;
      return;
    }
    const lowLine = line.toLowerCase();
    // Skip footer notes & table headers
    if (/(ಎಲ್ಲಾ ಬೆಲೆಗಳು|all prices|gst extra|service charge|conditions apply)/.test(lowLine)) return;
    if (line.includes('|') && /(item|dish|price|ಬೆಲೆ|ವಿವರ|ತಿಂಡಿ)/.test(lowLine) && !/\d/.test(line)) return;

    let clean = line;
    if (line.includes('|')) {
      let cells = line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length > 1 && /^\d{1,2}$/.test(cells[0])) cells = cells.slice(1);
      if (cells.length === 0) return;
      clean = cells.join(' | ');
    } else {
      clean = line.replace(/^\d+[.)]\s*/, '').trim();
    }
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

    if (!clean || /^(?:₹|Rs\.?|RM|¥|\$|€|฿)?\s*\d+(?:[.,]\d+)?\s*(?:\/-)?$/i.test(clean)) return;

    dishCounter += 1;
    // Support optional "Original Name | English Name" syntax or single name
    const parts = clean.split('|').map(p => p.trim()).filter(Boolean);
    const nameOriginal = parts[0];
    const itemLow = clean.toLowerCase();
    const kbHit = CLIENT_DISH_KB.find(entry => entry.keys.some(k => itemLow.includes(k)));
    const nameEn =
      parts[1] ||
      kbHit?.nameEn ||
      (nameOriginal === nameOriginal.toUpperCase()
        ? nameOriginal.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        : nameOriginal);

    const isBeverage = kbHit?.category === 'Beverages' || /(tea|teh|coffee|kopi|milo|juice|lassi|chai|drink|matcha|sake|soda)/.test(itemLow);
    const isDessert = kbHit?.category === 'Desserts' || /(halwa|cake|ice|dessert|sweet|pudding|mochi|kulfi|kesari|mysore pak)/.test(itemLow);
    const category = kbHit?.category || (isBeverage ? 'Beverages' : isDessert ? 'Desserts' : headingCategory || 'Mains');

    const isBlackDrink = /(black coffee|kopi o|teh o|americano|espresso|plain tea|green tea)/.test(itemLow);
    const isMilkyDrink = !isBlackDrink && /(teh tarik|pulled milk|milk tea|latte|chai|lassi|milo|susu|filter coffee|kopi|teh)/.test(itemLow);

    const spiciness =
      kbHit?.spiciness ??
      (/(curry|masala|chili|chilli|spicy|sambal|laksa|tom yum)/.test(itemLow)
        ? 2
        : /(biriyani|biryani|pepper|tikka)/.test(itemLow)
        ? 1
        : 0);
    const sweetness = kbHit?.sweetness ?? (isDessert ? 3 : isMilkyDrink ? 2 : 0);
    const bitterness = kbHit?.bitterness ?? (isBlackDrink ? 3 : /(coffee|kopi|matcha)/.test(itemLow) ? 2 : 0);

    const possibleIngredients: string[] = kbHit ? [...kbHit.ingredients] : [];
    if (possibleIngredients.length === 0) {
      if (isBeverage) {
        possibleIngredients.push(/(coffee|kopi)/.test(itemLow) ? 'coffee' : 'tea', 'water');
        if (isMilkyDrink) possibleIngredients.push('condensed milk', 'sugar');
      }
      ['prawn', 'shrimp', 'udang', 'chicken', 'mutton', 'beef', 'fish', 'egg', 'paneer', 'cashew', 'kaju', 'peanut', 'peanuts', 'almond', 'badam', 'coconut', 'dosa', 'idli', 'rice', 'noodle', 'noodles', 'flat noodles', 'wheat', 'flour', 'milk', 'condensed milk', 'butter', 'ghee', 'soy', 'tofu'].forEach(tok => {
        if (itemLow.includes(tok) && !possibleIngredients.includes(tok)) possibleIngredients.push(tok);
      });
      if (possibleIngredients.length === 0) possibleIngredients.push('regional grains', 'lentils', 'fresh herbs');
    }

    const combined = `${nameOriginal} ${nameEn} ${possibleIngredients.join(' ')}`.toLowerCase();
    const allergenMatches = declaredAllergens.filter(rule => {
      const kws = resolveRuleKeywords(rule);
      return kws.some(kw => matchesKeywordWordBoundary(combined, kw));
    });

    const item: ParsedMenuItem = {
      id: `dish-${dishCounter}`,
      name_en: nameEn,
      name_original: nameOriginal,
      price: Number(price.toFixed(2)),
      currency: itemCurrency,
      category,
      spiciness,
      sweetness,
      bitterness,
      possible_ingredients: possibleIngredients,
      description: kbHit?.description || (isBeverage ? 'Prepared fresh at the beverage counter.' : 'Prepared to order from the kitchen.'),
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
