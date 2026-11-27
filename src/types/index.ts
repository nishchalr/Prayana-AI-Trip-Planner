export type MobilityLevel = 'Full Mobility' | 'Assisted' | 'Wheelchair-Accessible';

export type MedicalFlag = 
  | 'Asthma' 
  | 'Hypertension' 
  | 'Arthritis' 
  | 'Motion Sickness' 
  | 'Altitude Sensitivity'
  | (string & {});

export type DietaryTag = 
  | 'Pure Vegetarian' 
  | 'Vegan' 
  | 'Halal' 
  | 'Gluten-Free' 
  | 'Nut Allergy' 
  | 'Shellfish Allergy'
  | (string & {});

export interface MedicalConditionItem {
  id: string;
  name: string;
  category: 'medical' | 'mobility' | 'dietary';
  subcategory?: string;
  c_card: number;
  c_resp: number;
  c_mob: number;
  dietary_keywords: string[];
  recommended_kit_items: string[];
  route_advisory: string;
  source?: string;
}

export type StrainLevel = 'LOW' | 'MODERATE' | 'ELEVATED';

export type AppView = 'AUTH' | 'GALLERY_HOME' | 'PROFILES' | 'MY_PROFILE' | 'PLANNER_WIZARD' | 'ITINERARY_OUTPUT';

export type CockpitTab = 'ROUTE_TIMELINE' | 'BUDGET' | 'DINING' | 'OCR_ALLERGEN' | 'DISRUPTION_SAFETY' | 'TRAVELLING';

export type MapMode = 'NODE_GRAPH' | 'GOOGLE_MAPS';

export interface VitalsData {
  heartRate: number; // BPM
  spO2: number; // %
  batteryLevel?: number; // %
  steps: number;
  strainLevel: StrainLevel;
  ambientWbgt: number; // Wet Bulb Globe Temp in Celsius
  lastSync: string;
}

export interface TravelerProfile {
  id: string;
  name: string;
  username?: string;
  dob?: string; // YYYY-MM-DD
  age: number;
  isPrimarySelf?: boolean;
  ownerUid?: string;
  mobility: MobilityLevel;
  medicalFlags: MedicalFlag[];
  dietaryTags: DietaryTag[];
  vibeProfile: string;
  landscapePreferences?: string[];
  crowdTolerance?: 'Low / Solitary' | 'Moderate / Standard' | 'High / Festive';
  pacingPreference?: 'Slow & Restful' | 'Balanced' | 'High Exertion';
  fitbandConnected: boolean;
  wearableStatus?: 'UNPAIRED' | 'BLE_CONNECTED' | 'BLE_LOCKED' | 'SIMULATED';
  bleDeviceName?: string;
  isPrimary?: boolean;
  medicalDetails?: MedicalConditionItem[];
  customDietaryKeywords?: string[];
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

export interface ConnectedFriend {
  uid: string;
  username: string;
  name: string;
  connectedAt: string;
  updatedAt?: string;
  profile: TravelerProfile;
  sharedProfiles?: TravelerProfile[];
}

export interface FriendInvite {
  id: string;
  fromUid: string;
  fromUsername: string;
  fromName: string;
  fromProfile: TravelerProfile;
  toUid: string;
  toUsername: string;
  toName?: string;
  toProfile?: TravelerProfile;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  respondedAt?: string;
}

export interface MonolithStop {
  id: string;
  index: number;
  day?: number; // 1-indexed trip day
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
  paidBy?: string;
  splitMode?: 'equal' | 'custom';
  splitBetween?: string[];
  customSplits?: Record<string, number>;
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
  kind?: 'dining' | 'stay';
  categoryTag?: string;
  lat?: number;
  lon?: number;
  isOsmDietVerified?: boolean;
  osmVerifiedTags?: string[];
  heuristicNotes?: string[];
  costSource?: string;
  source?: string;
}

export interface OcrScanResult {
  status: 'HAZARD_ALERT' | 'NO_MATCH_DETECTED';
  matchedAllergens: string[];
  rawExtractedText: string;
  confidence: number;
  disclaimer: string;
}

export interface DiningReservation {
  venueId: string;
  venueName: string;
  tableId: string;
  tableLabel: string;
  arrivalTime: string;
  partySize: number;
  preOrderedItems: Array<{ name: string; price: number; qty: number }>;
  totalAmount: number;
  confirmationCode: string;
  timestamp: string;
  lat?: number;
  lon?: number;
}

export interface StayReservation {
  stayId: string;
  stayName: string;
  roomCode: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  arrivalTime: string;
  specialRequests: string[];
  totalAmount: number;
  confirmationCode: string;
  timestamp: string;
  lat?: number;
  lon?: number;
}

export interface BudgetTargetsSnapshot {
  stays: number;
  food: number;
  transit: number;
  activities: number;
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
  individualBudgets?: Record<string, number>;
  rebalanceTargets?: BudgetTargetsSnapshot;
  recommendedSwaps?: string[];
  transitMode: 'Self-Drive' | 'Public Transport';
  transitDetails?: {
    flightOrTrainNo?: string;
    originHub?: string;
    arrivalHub?: string;
    pnrOrRef?: string;
    vehicleType?: '2W' | '4W';
    fuelType?: 'PETROL' | 'DIESEL' | 'EV';
    publicMode?: 'FLIGHT' | 'TRAIN' | 'BUS';
    notes?: string;
  };
}
