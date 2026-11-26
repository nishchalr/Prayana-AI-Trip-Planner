/**
 * Prayana Frontend API Client
 * ===========================
 * Points to the FastAPI backend at VITE_API_BASE_URL (default localhost:8000/api/v1).
 * Every function tries the live backend first; on any network error it
 * returns null / a deterministic local fallback and sets apiStatus to 'FALLBACK'.
 *
 * Import apiStatus (a reactive signal updated on each call) into HeaderHud
 * to show [ API: LIVE ] or [ API: LOCAL FALLBACK ].
 */

const ENV_API_BASE: string | undefined =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.trim() || undefined;

const IS_LOCAL_HOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Only fall back to http://localhost:8000 when running locally. On public HTTPS hosts
// without an explicit remote VITE_API_BASE_URL, return local fallback without noisy browser errors.
const API_BASE: string | null = ENV_API_BASE ?? (IS_LOCAL_HOST ? 'http://localhost:8000/api/v1' : null);

// ---------------------------------------------------------------------------
// Reactive API status (mutated in-place so imports stay referentially equal)
// ---------------------------------------------------------------------------
export type ApiStatus = 'CHECKING' | 'LIVE' | 'FALLBACK';

const _status: { current: ApiStatus } = { current: 'CHECKING' };
export const getApiStatus = (): ApiStatus => _status.current;

function _markLive()     { _status.current = 'LIVE'; }
function _markFallback() { _status.current = 'FALLBACK'; }

// ---------------------------------------------------------------------------
// Generic fetch helper
// ---------------------------------------------------------------------------
async function _post<Req, Res>(endpoint: string, body: Req): Promise<Res | null> {
  if (!API_BASE) {
    _markFallback();
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as Res;
  } catch {
    _markFallback();
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Health Check
// ---------------------------------------------------------------------------
export async function checkApiHealth(): Promise<boolean> {
  if (!API_BASE) {
    _markFallback();
    return false;
  }
  try {
    const res = await fetch(`${API_BASE.replace('/api/v1', '')}/api/health`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) { _markLive(); return true; }
    _markFallback(); return false;
  } catch {
    _markFallback(); return false;
  }
}

// ---------------------------------------------------------------------------
// 2. Route Optimizer
// ---------------------------------------------------------------------------
export interface TravelerProfileReq {
  id: string; name: string; age: number; mobility: string;
  cardiac_coeff?: number; respiratory_coeff?: number; mobility_coeff?: number;
  alpha_k?: number; beta_k?: number;
  hr_bpm?: number; spo2?: number; strain_level?: string;
}

export interface POICandidateReq {
  id: string; name: string; lat: number; lon: number;
  distance_km: number; elevation_gain_m?: number;
  slope_deg?: number; wbgt_celsius?: number;
  is_indoor?: boolean; is_pinned?: boolean;
}

export interface RouteOptimizeRequest {
  travelers:         TravelerProfileReq[];
  poi_candidates:    POICandidateReq[];
  max_daily_effort?: number;
  pinned_stop_ids?:  string[];
}

export interface RouteOptimizeResponse {
  ordered_stops:     { id: string; name: string; lat: number; lon: number; group_penalty: number; is_indoor: boolean; is_pinned: boolean }[];
  transit_times_min: number[];
  strain_scores:     Record<string, number>;
  solve_time_ms:     number;
  exceedances:       number;
  solver_status:     string;
  source:            string;
}

export async function optimizeRoute(req: RouteOptimizeRequest): Promise<RouteOptimizeResponse | null> {
  return _post<RouteOptimizeRequest, RouteOptimizeResponse>('/route/optimize', req);
}

// ---------------------------------------------------------------------------
// 3. Budget Rebalancer
// ---------------------------------------------------------------------------
export interface BudgetRebalanceRequest {
  total_budget:   number;
  expenses:       { id: string; category: string; amount: number; label?: string }[];
  days_remaining: number;
  days_total:     number;
}

export interface BudgetRebalanceResponse {
  updated_targets:       { stays: number; food: number; transit: number; activities: number };
  overspend_delta:       number;
  budget_utilization_pct: number;
  recommended_swaps:     string[];
  source:                string;
}

export async function rebalanceBudget(req: BudgetRebalanceRequest): Promise<BudgetRebalanceResponse | null> {
  return _post<BudgetRebalanceRequest, BudgetRebalanceResponse>('/budget/rebalance', req);
}

// ---------------------------------------------------------------------------
// 4. OCR Allergen Screener
// ---------------------------------------------------------------------------
export interface OCRScanResponse {
  result:            'HAZARD_ALERT' | 'NO_MATCH_DETECTED' | 'TEXT_ONLY_MODE';
  matched_allergens: string[];
  matched_tokens:    string[];
  confidence:        number;
  raw_text_preview:  string;
  disclaimer:        string;
  ocr_available:     boolean;
}

export async function scanMenuOCR(
  imageFile: File | null,
  rawText?: string,
  declaredAllergens?: string[],
): Promise<OCRScanResponse | null> {
  if (!API_BASE) {
    _markFallback();
    return null;
  }
  try {
    const form = new FormData();
    if (imageFile) form.append('image', imageFile);
    if (rawText)   form.append('raw_text', rawText);
    form.append('declared_allergens', (declaredAllergens ?? []).join(','));

    const res = await fetch(`${API_BASE}/ocr/scan-menu`, {
      method: 'POST', body: form,
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as OCRScanResponse;
  } catch {
    _markFallback(); return null;
  }
}

export interface ParsedMenuItem {
  id: string;
  name_en: string;
  name_original: string;
  price: number;
  currency: string;
  category: string;
  spiciness: number;
  possible_ingredients: string[];
  description: string;
  allergen_matches: string[];
  status: 'HAZARD_ALERT' | 'NO_MATCH_DETECTED' | 'TEXT_ONLY_MODE';
}

export interface ParsedMenuCategory {
  name: string;
  items: ParsedMenuItem[];
}

export interface OCRParseMenuResponse {
  detected_language: string;
  detected_currency: string;
  greeting_local: string;
  greeting_en: string;
  closing_local: string;
  closing_en: string;
  allergy_notice_local: string;
  allergy_notice_en: string;
  categories: ParsedMenuCategory[];
  raw_text_preview: string;
  confidence: number;
  disclaimer: string;
  source: string;
}

export async function parseMenuStructured(
  imageFile: File | null,
  rawText?: string,
  declaredAllergens?: string[],
  targetCurrency: string = 'INR',
): Promise<OCRParseMenuResponse | null> {
  if (!API_BASE) {
    _markFallback();
    return null;
  }
  try {
    const form = new FormData();
    if (imageFile) form.append('image', imageFile);
    if (rawText)   form.append('raw_text', rawText);
    form.append('declared_allergens', (declaredAllergens ?? []).join(','));
    form.append('target_currency', targetCurrency);

    const res = await fetch(`${API_BASE}/ocr/parse-menu`, {
      method: 'POST', body: form,
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as OCRParseMenuResponse;
  } catch {
    _markFallback();
    return null;
  }
}

export interface TranslateTextResponse {
  detected_source_language: string;
  target_language: string;
  original_text: string;
  translated_text: string;
  source: string;
}

export async function translateText(
  text: string,
  sourceLanguage: string = 'auto',
  targetLanguage: string = 'en',
): Promise<TranslateTextResponse | null> {
  return _post<{ text: string; source_language: string; target_language: string }, TranslateTextResponse>(
    '/ocr/translate-text',
    { text, source_language: sourceLanguage, target_language: targetLanguage },
  );
}

// ---------------------------------------------------------------------------
// 5. Vitals Evaluation
// ---------------------------------------------------------------------------
export interface VitalsEvaluateRequest {
  travelers:         TravelerProfileReq[];
  ambient_wbgt?:     number;
  current_slope_deg?: number;
  destination_id?:   string;
}

export interface VitalsEvaluateResponse {
  results: {
    traveler_id: string; traveler_name: string;
    strain_level: string; alpha_k: number;
    advisory: string | null; flag_pacing: boolean;
  }[];
  group_max_strain: string;
  computed_wbgt?: number;
  weather_summary?: string;
  source: string;
}

export async function evaluateVitals(req: VitalsEvaluateRequest): Promise<VitalsEvaluateResponse | null> {
  return _post<VitalsEvaluateRequest, VitalsEvaluateResponse>('/vitals/evaluate', req);
}

// ---------------------------------------------------------------------------
// 6. Disruption Rerouter
// ---------------------------------------------------------------------------
export interface DisruptionRerouteRequest {
  travelers:        TravelerProfileReq[];
  stops:            POICandidateReq[];
  disruption_type?: string;
  pinned_stop_ids?: string[];
}

export interface DisruptionRerouteResponse {
  rerouted_stops:     RouteOptimizeResponse['ordered_stops'];
  disruption_summary: string;
  weather_data:       Record<string, unknown>;
  source:             string;
}

export async function rerouteDisruption(req: DisruptionRerouteRequest): Promise<DisruptionRerouteResponse | null> {
  return _post<DisruptionRerouteRequest, DisruptionRerouteResponse>('/disruption/reroute', req);
}

// ---------------------------------------------------------------------------
// 7. Gemini Copilot
// ---------------------------------------------------------------------------
export interface CopilotResponse {
  action_type: string;
  mutations:   Record<string, unknown>;
  explanation: string;
  source:      string;
}

export async function sendCopilotCommand(
  command: string,
  currentState: object,
): Promise<CopilotResponse | null> {
  return _post<{ command: string; current_state: object }, CopilotResponse>(
    '/copilot/command',
    { command, current_state: currentState },
  );
}


// ---------------------------------------------------------------------------
// 7. Live OpenStreetMap Overpass Places & Stays
// ---------------------------------------------------------------------------

export interface PlaceItemApi {
  id: string;
  name: string;
  kind: 'dining' | 'stay';
  category_tag: string;
  cuisine: string;
  distance_km: number;
  lat: number;
  lon: number;
  address: string;
  estimated_cost_for_two: number;
  cost_source: string;
  osm_verified_tags: string[];
  heuristic_notes: string[];
  allergen_warnings: string[];
  is_osm_diet_verified: boolean;
  matches_diet_filter: boolean;
  within_budget: boolean;
  source: string;
}

export interface PlacesApiResponse {
  destination_id: string;
  destination_name: string;
  dining: PlaceItemApi[];
  stays: PlaceItemApi[];
  total_count: number;
  source: string;
  overpass_endpoint?: string;
  disclaimer: string;
}

export async function fetchDestinationPlaces(
  destinationId: string,
  dietaryTags: string[] = [],
  maxCost?: number
): Promise<PlacesApiResponse | null> {
  if (!API_BASE) return null;
  const params = new URLSearchParams();
  if (dietaryTags.length > 0) params.set('dietary_tags', dietaryTags.join(','));
  if (typeof maxCost === 'number' && maxCost > 0) params.set('max_cost', String(Math.round(maxCost)));
  const qs = params.toString();
  const url = `${API_BASE}/places/${encodeURIComponent(destinationId)}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as PlacesApiResponse;
  } catch (err) {
    console.warn(`[Prayana API] /places/${destinationId} error:`, err);
    return null;
  }
}


// ---------------------------------------------------------------------------
// 8. Searchable Medical & Dietary Conditions + AI Custom Classifier
// ---------------------------------------------------------------------------

export interface MedicalConditionApiItem {
  id: string;
  name: string;
  category: 'medical' | 'mobility' | 'dietary';
  subcategory: string;
  aliases: string[];
  c_card: number;
  c_resp: number;
  c_mob: number;
  dietary_keywords: string[];
  recommended_kit_items: string[];
  route_advisory: string;
  source: string;
}

export interface MedicalSearchApiResponse {
  query: string;
  count: number;
  total_catalog_size: number;
  results: MedicalConditionApiItem[];
}

export async function searchMedicalConditions(
  query: string,
  category: 'all' | 'medical' | 'mobility' | 'dietary' = 'all'
): Promise<MedicalSearchApiResponse | null> {
  if (!API_BASE) return null;
  try {
    const params = new URLSearchParams({
      q: query,
      category,
      limit: '25',
    });
    const res = await fetch(`${API_BASE}/medical/search?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as MedicalSearchApiResponse;
  } catch (err) {
    console.warn('[Prayana API] /medical/search error:', err);
    return null;
  }
}

export async function classifyCustomCondition(
  condition: string,
  preferredCategory?: 'medical' | 'mobility' | 'dietary'
): Promise<MedicalConditionApiItem | null> {
  return _post<{ condition: string; preferred_category?: string }, MedicalConditionApiItem>(
    '/medical/classify',
    { condition, preferred_category: preferredCategory }
  );
}

export interface TransitPlaceItem {
  id: string;
  name: string;
  kind: 'fuel' | 'ev_charger' | 'bus_station' | 'railway_station';
  distance_km: number;
  lat: number;
  lon: number;
  address: string;
  connector_hints: string[];
  compatible_2w_ev: boolean;
  compatible_4w_ev: boolean;
  source: string;
}

export interface TransitPlacesResponse {
  destination_id: string;
  destination_name: string;
  fuel_stations: TransitPlaceItem[];
  ev_chargers: TransitPlaceItem[];
  bus_stands: TransitPlaceItem[];
  railway_stations: TransitPlaceItem[];
  source: string;
  disclaimer: string;
}

export async function fetchDestinationTransit(
  destinationId: string,
): Promise<TransitPlacesResponse | null> {
  if (!API_BASE) {
    _markFallback();
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/places/${encodeURIComponent(destinationId)}/transit`, {
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as TransitPlacesResponse;
  } catch {
    _markFallback();
    return null;
  }
}
