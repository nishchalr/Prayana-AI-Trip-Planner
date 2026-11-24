/**
 * PRAYANA — Google Health API & Android Health Connect Integration Service
 * 
 * Implements wearable telemetry sync and Prayana's authentic effort strain heuristic:
 * ψ_ij(u_k) = α_k * (1 + β_k) * d_ij * exp( γ1*(1 + c_mob)*max(0, tan θ_ij) + γ2*c_card*(Δh_ij^+ / 100) + γ3*c_resp*Φ(W_ij) )
 * 
 * References:
 * - Google Health Developer API: https://developers.google.com/health
 * - Android Health Connect: androidx.health.connect.client
 * - Dayananda Sagar University Major Project Phase-I Report (Chapter 4)
 */

import { TravelerProfile, VitalsData, StrainLevel } from '../types';

export interface GoogleHealthConfig {
  clientId?: string;
  scopes: string[];
  healthConnectPackage: string;
}

export const GOOGLE_HEALTH_DEFAULT_CONFIG: GoogleHealthConfig = {
  clientId: (import.meta as any).env?.VITE_GOOGLE_HEALTH_CLIENT_ID || 'mock-google-health-client-id',
  scopes: [
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
    'https://www.googleapis.com/auth/fitness.activity.read',
  ],
  healthConnectPackage: 'androidx.health.connect.client.records',
};

// Calibrated heuristic constants from Chapter 4
export const GAMMA_1_SLOPE = 2.5;  // Slope sensitivity
export const GAMMA_2_CLIMB = 1.2;  // Elevation gain sensitivity
export const GAMMA_3_HEAT = 0.8;   // Thermal WBGT stress sensitivity
export const W_SAFE = 26.0;        // Thermal comfort threshold (°C)
export const W_CRIT = 35.0;        // Thermal risk threshold (°C)
export const LAMBDA_GROUP = 0.05;  // Group aggregate load weight

export interface SegmentPhysicalParams {
  distanceKm: number;
  elevationDeltaM: number;
  slopeDeg: number;
  ambientWbgtC: number;
}

export interface TravelerHeuristicVector {
  c_card: number; // Cardiopulmonary / hypertension risk [0, 1]
  c_resp: number; // Respiratory / asthma risk [0, 1]
  c_mob: number;  // Mobility limitation [0, 1]
  alpha: number;  // Baseline exertion sensitivity
  beta: number;   // Age-adjusted effort weight
}

/**
 * Extracts traveler risk vector p_k from declared profile flags
 */
export function extractHeuristicVector(traveler: TravelerProfile): TravelerHeuristicVector {
  const flags = traveler.medicalFlags;

  // c_card: Hypertension
  const c_card = flags.includes('Hypertension') ? 0.8 : 0.0;

  // c_resp: Asthma or Altitude Sensitivity
  let c_resp = 0.0;
  if (flags.includes('Asthma')) c_resp += 0.7;
  if (flags.includes('Altitude Sensitivity')) c_resp += 0.3;
  c_resp = Math.min(1.0, c_resp);

  // c_mob: Mobility
  let c_mob = 0.0;
  if (traveler.mobility === 'Wheelchair-Accessible') c_mob = 1.0;
  else if (traveler.mobility === 'Assisted') c_mob = 0.8;
  if (flags.includes('Arthritis')) c_mob = Math.min(1.0, c_mob + 0.2);

  // beta_k: Age-adjusted factor
  const beta = traveler.age > 50 ? (traveler.age - 50) / 50.0 : 0.0;

  // alpha_k: Baseline sensitivity
  const alpha = 0.5 + (c_card * 0.2) + (c_mob * 0.2);

  return { c_card, c_resp, c_mob, alpha, beta };
}

/**
 * Thermal stress function: Φ(W_ij) = max(0, (W_ij - W_safe) / (W_crit - W_safe))^2
 */
export function computeThermalStress(wbgtC: number): number {
  if (wbgtC <= W_SAFE) return 0.0;
  const normalized = (wbgtC - W_SAFE) / (W_CRIT - W_SAFE);
  return Math.pow(Math.min(normalized, 1.5), 2);
}

/**
 * Computes individual traveler segment effort penalty ψ_ij(u_k)
 */
export function computeTravelerSegmentPenalty(
  traveler: TravelerProfile,
  segment: SegmentPhysicalParams,
  liveHrBpm?: number
): number {
  const p = extractHeuristicVector(traveler);
  const tanTheta = Math.max(0, Math.tan((segment.slopeDeg * Math.PI) / 180));
  const climbNorm = Math.max(0, segment.elevationDeltaM) / 100.0;
  const phiThermal = computeThermalStress(segment.ambientWbgtC);

  // Exponent capped at 3.0 to avoid overflow as specified in Chapter 4
  const rawExponent = 
    GAMMA_1_SLOPE * (1 + p.c_mob) * tanTheta +
    GAMMA_2_CLIMB * p.c_card * climbNorm +
    GAMMA_3_HEAT * p.c_resp * phiThermal;
  
  const boundedExponent = Math.min(3.0, rawExponent);

  // Base mechanical effort
  let psi = p.alpha * (1 + p.beta) * segment.distanceKm * Math.exp(boundedExponent);

  // Live heart rate elevation multiplier: if live HR spikes above resting (70 bpm), effort scales
  const hr = liveHrBpm ?? traveler.vitals.heartRate;
  if (hr > 85) {
    const hrFactor = 1.0 + ((hr - 85) / 50.0);
    psi *= Math.min(2.5, hrFactor);
  }

  return Number(psi.toFixed(3));
}

/**
 * Computes group segment penalty Ψ_ij(U) = max(ψ_ij) + λ * sum(ψ_ij)
 */
export function computeGroupSegmentPenalty(
  travelers: TravelerProfile[],
  segment: SegmentPhysicalParams
): { maxPenalty: number; groupScore: number; worstTraveler: TravelerProfile } {
  let maxPenalty = -1;
  let sumPenalty = 0;
  let worstTraveler = travelers[0];

  for (const t of travelers) {
    const psi = computeTravelerSegmentPenalty(t, segment);
    if (psi > maxPenalty) {
      maxPenalty = psi;
      worstTraveler = t;
    }
    sumPenalty += psi;
  }

  const groupScore = maxPenalty + LAMBDA_GROUP * sumPenalty;
  return { maxPenalty, groupScore: Number(groupScore.toFixed(3)), worstTraveler };
}

/**
 * Evaluates Strain Level based on live heart rate, traveler mobility, and terrain slope
 */
export function evaluateRealtimeStrain(
  hr: number,
  spO2: number,
  slopeDeg: number,
  mobility: string,
  medicalFlags: string[]
): { strainLevel: StrainLevel; advisory?: string } {
  const isHighRisk = 
    mobility !== 'Full Mobility' || 
    medicalFlags.includes('Hypertension') || 
    medicalFlags.includes('Asthma');

  if (hr >= 125 || spO2 < 93 || (isHighRisk && hr >= 105) || (mobility === 'Assisted' && slopeDeg > 3.0)) {
    return {
      strainLevel: 'ELEVATED',
      advisory: `High exertion detected (${hr} BPM). Slope (${slopeDeg}°) exceeds comfort threshold for ${mobility.toLowerCase()} traveler.`,
    };
  }

  if (hr >= 95 || spO2 < 96 || (isHighRisk && hr >= 88) || slopeDeg > 2.5) {
    return {
      strainLevel: 'MODERATE',
      advisory: `Moderate cardiovascular pacing (${hr} BPM). Maintain hydration and shaded rest intervals.`,
    };
  }

  return {
    strainLevel: 'LOW',
    advisory: undefined,
  };
}
