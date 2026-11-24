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

const API_BASE: string = 
  ((import.meta as any).env?.VITE_API_BASE_URL as string) ?? 'http://localhost:8000/api/v1';

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
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(8000),
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
  try {
    const res = await fetch(`${API_BASE.replace('/api/v1', '')}/api/health`, {
      signal: AbortSignal.timeout(4000),
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
  try {
    const form = new FormData();
    if (imageFile) form.append('image', imageFile);
    if (rawText)   form.append('raw_text', rawText);
    form.append('declared_allergens', (declaredAllergens ?? []).join(','));

    const res = await fetch(`${API_BASE}/ocr/scan-menu`, {
      method: 'POST', body: form,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _markLive();
    return (await res.json()) as OCRScanResponse;
  } catch {
    _markFallback(); return null;
  }
}

// ---------------------------------------------------------------------------
// 5. Vitals Evaluation
// ---------------------------------------------------------------------------
export interface VitalsEvaluateRequest {
  travelers:        TravelerProfileReq[];
  ambient_wbgt?:    number;
  current_slope_deg?: number;
}

export interface VitalsEvaluateResponse {
  results: {
    traveler_id: string; traveler_name: string;
    strain_level: string; alpha_k: number;
    advisory: string | null; flag_pacing: boolean;
  }[];
  group_max_strain: string;
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
