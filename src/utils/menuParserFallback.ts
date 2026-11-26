import type { OCRParseMenuResponse, ParsedMenuCategory, ParsedMenuItem } from '../services/apiClient';

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
  th: 'th-TH',
  en: 'en-IN',
};

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

const ALLERGEN_TOKEN_MAP: Record<string, string[]> = {
  'Shellfish Allergy': ['prawn', 'prawns', 'shrimp', 'crab', 'lobster', 'shellfish', 'seafood', 'clam', 'mussel', 'oyster', 'udang'],
  'Peanut Allergy': ['peanut', 'peanuts', 'groundnut', 'satay', 'kacang', 'kadalekaayi'],
  'Nut Allergy': ['peanut', 'cashew', 'kaju', 'almond', 'badam', 'walnut', 'pistachio', 'nut', 'nuts', 'kacang'],
  'Tree Nut Allergy': ['cashew', 'kaju', 'almond', 'badam', 'walnut', 'pistachio', 'pista', 'nut', 'nuts'],
  'Gluten-Free': ['wheat', 'maida', 'atta', 'flour', 'roti', 'paratha', 'bread', 'naan', 'udon', 'ramen', 'mee', 'noodle', 'gluten'],
  'Dairy-Free': ['milk', 'cream', 'butter', 'cheese', 'paneer', 'ghee', 'curd', 'yogurt', 'lassi', 'susu'],
  'Milk / Dairy Allergy': ['milk', 'cream', 'butter', 'cheese', 'paneer', 'ghee', 'curd', 'yogurt', 'susu'],
  'Egg Allergy': ['egg', 'eggs', 'omelette', 'mayo', 'telur'],
  'Soy Allergy': ['soy', 'soya', 'tofu', 'miso', 'shoyu', 'tamari', 'teriyaki'],
};

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

    const possibleIngredients: string[] = [];
    ['prawn', 'shrimp', 'chicken', 'mutton', 'beef', 'fish', 'egg', 'paneer', 'cashew', 'kaju', 'peanut', 'almond', 'badam', 'coconut', 'dosa', 'idli', 'rice', 'noodle', 'wheat', 'flour', 'milk', 'condensed milk', 'butter', 'ghee', 'soy', 'tofu'].forEach(tok => {
      if (itemLow.includes(tok)) possibleIngredients.push(tok);
    });
    if (isBeverage && /(teh|kopi|coffee|tea|chai|milo)/.test(itemLow) && !possibleIngredients.includes('milk')) {
      possibleIngredients.push('milk', 'sugar');
    }
    if (possibleIngredients.length === 0) possibleIngredients.push('house spices', 'seasoning');

    const combined = `${nameOriginal} ${nameEn} ${possibleIngredients.join(' ')}`.toLowerCase();
    const allergenMatches = declaredAllergens.filter(allergen => {
      const kws = ALLERGEN_TOKEN_MAP[allergen] || allergen.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      return kws.some(kw => combined.includes(kw));
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
