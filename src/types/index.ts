export type MobilityLevel = 'Full Mobility' | 'Assisted' | 'Wheelchair-Accessible';

export type MedicalFlag = 
  | 'Asthma' 
  | 'Hypertension' 
  | 'Arthritis' 
  | 'Motion Sickness' 
  | 'Altitude Sensitivity';

export type DietaryTag = 
  | 'Pure Vegetarian' 
  | 'Vegan' 
  | 'Halal' 
  | 'Gluten-Free' 
  | 'Nut Allergy' 
  | 'Shellfish Allergy';

export type StrainLevel = 'LOW' | 'MODERATE' | 'ELEVATED';

export type AppView = 'AUTH' | 'GALLERY_HOME' | 'PROFILES' | 'PLANNER_WIZARD' | 'ITINERARY_OUTPUT';

export type CockpitTab = 'BUDGET' | 'DINING' | 'OCR_ALLERGEN' | 'DISRUPTION_SAFETY';

export type MapMode = 'NODE_GRAPH' | 'GOOGLE_MAPS';

export interface VitalsData {
  heartRate: number; // BPM
  spO2: number; // %
  steps: number;
  strainLevel: StrainLevel;
  ambientWbgt: number; // Wet Bulb Globe Temp in Celsius
  lastSync: string;
}

export interface TravelerProfile {
  id: string;
  name: string;
  age: number;
  mobility: MobilityLevel;
  medicalFlags: MedicalFlag[];
  dietaryTags: DietaryTag[];
  vibeProfile: string;
  landscapePreferences?: string[];
  crowdTolerance?: 'Low / Solitary' | 'Moderate / Standard' | 'High / Festive';
  pacingPreference?: 'Slow & Restful' | 'Balanced' | 'High Exertion';
  fitbandConnected: boolean;
  vitals: VitalsData;
  travelInsuranceId: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  localGuardian?: {
    name: string;
    phone: string;
  };
}

export interface MonolithStop {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  elevationDeltaM: number;
  distanceKm: number;
  slopeDeg: number;
  effortRating: StrainLevel;
  vibeTag: string;
  optimalTime: string;
  dwellMinutes: number;
  description: string;
  isOutdoor: boolean;
  cost: number;
  isPinned?: boolean;
  coords?: { lat: number; lng: number };
}

export interface Destination {
  id: string;
  name: string;
  region: string;
  country: string;
  routeTitle: string;
  daysCount: number;
  vibeMatchScore: number;
  monumentName: string;
  monumentDescription: string;
  historicalPeriod: string;
  paletteAccent: string;
  stops: MonolithStop[];
}

export interface BudgetSplit {
  stays: number; // 35%
  food: number; // 25%
  transit: number; // 20%
  activitiesAndBuffer: number; // 20%
}

export interface ExpenseItem {
  id: string;
  category: 'stays' | 'food' | 'transit' | 'activitiesAndBuffer';
  amount: number;
  description: string;
  dayIndex: number;
  timestamp: string;
}

export interface DiningOption {
  id: string;
  name: string;
  cuisine: string;
  distanceKm: number;
  costForTwo: number;
  dietaryTags: DietaryTag[];
  allergenFlags: string[];
  isVerifiedSafe: boolean;
  rating: number;
  address: string;
}

export interface OcrScanResult {
  status: 'HAZARD_ALERT' | 'NO_MATCH_DETECTED';
  matchedAllergens: string[];
  rawExtractedText: string;
  confidence: number;
  disclaimer: string;
}

export interface ActiveTrip {
  id: string;
  destinationId: string;
  routeTitle: string;
  dayIndex: number;
  totalDays: number;
  checkInDate?: string;
  checkOutDate?: string;
  groupTravelerIds: string[];
  totalBudget: number; // INR
  spentBudget: number;
  budgetSplit: BudgetSplit;
  transitMode: 'Self-Drive' | 'Public Transport';
  transitDetails?: {
    flightOrTrainNo?: string;
    originHub?: string;
    notes?: string;
  };
}
