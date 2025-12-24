// Core types for LandmarkAI application

export interface LandmarkAnalysis {
  id: string;
  name: string;
  description: string;
  history: string;
  architect?: string;
  yearBuilt?: number;
  funFacts: string[];
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  culturalSignificance?: string;
  architecturalStyle?: string;
  visitingTips?: string[];
  city: string; // City name
  location?: string; // City, State (legacy)
  country?: string; // Country name
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  nearbySearchQueries?: string[]; // AI-suggested nearby place names for verification
  nearbyMustSeePlaces?: NearbyPlace[]; // Enriched nearby places
  imageUrl?: string;
  analyzedAt: string; // ISO timestamp
  accuracy?: number; // AI confidence score 0-1
  confidence?: number; // AI confidence score from response (temporary parsing field)
  scanType?: 'landmark' | 'museum'; // Type of scan - defaults to 'landmark' for backward compatibility
  // Museum-specific fields (optional, used when scanType === 'museum')
  artist?: string; // Artist name for artworks
  medium?: string; // Art medium (oil on canvas, bronze, etc.)
  artMovement?: string; // Art movement (Renaissance, Impressionism, etc.)
  technique?: string; // Artistic technique used
  dimensions?: string; // Artwork dimensions
  // Art guide specific fields
  estimatedValue?: string; // Estimated worth or "Priceless" for historical pieces
  artStyle?: string; // Detailed art style (Cubism, Realism, Art Nouveau, etc.)
  historicalEra?: string; // Time period (Renaissance Period, Victorian Era, etc.)
  museumExplanation?: string; // Deep artistic/technical analysis for museum visitors
  historicalContext?: string; // Historical significance and period context
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  priceLevel?: number;
  types: string[];
  photos?: {
    photoReference: string;
    width: number;
    height: number;
  }[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // in meters
  openingHours?: {
    openNow: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
}

export interface SubscriptionStatus {
  isPremium: boolean;
  productId?: string;
  purchaseDate?: string;
  expirationDate?: string;
  isTrialPeriod?: boolean;
  trialEndDate?: string;
  autoRenewStatus?: boolean;
  platform: 'ios' | 'android' | 'web';
}

export interface UserLimit {
  deviceId: string;
  date: string; // YYYY-MM-DD format
  scansUsed: number;
  scansAllowed: number;
  isPremium: boolean;
  lastResetAt: string; // ISO timestamp
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  isPremium: boolean;
  isTrialActive: boolean;
  scansUsed: number;
  scansAllowed: number;
  resetTime?: string; // Next reset timestamp
  trialEndDate?: string; // Trial expiration timestamp
}

export interface TrialState {
  isActive: boolean;
  startDate: string; // ISO timestamp
  endDate: string;   // ISO timestamp
  hasUsedTrial: boolean; // Prevent multiple trials per device
}

export type UserAccessType = 'premium' | 'trial' | 'free';

export interface UserAccessState {
  type: UserAccessType;
  unlimited: boolean;
  scansRemaining?: number;
  trialEndDate?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  landmarkId?: string; // Associated landmark for context
}

export interface ChatSession {
  id: string;
  landmarkId: string;
  landmarkName: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  language: 'en' | 'tr' | 'es' | 'fr' | 'de';
  notifications: boolean;
  cameraQuality: 'low' | 'medium' | 'high';
  autoSaveToCollection: boolean;
  shareAnalytics: boolean;
}

export interface UserStats {
  totalScans: number;
  totalLandmarks: number;
  countriesVisited: string[];
  favoriteArchitecturalStyle?: string;
  streakDays: number;
  lastScanDate?: string;
  memberSince: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface GeminiAnalysisResponse {
  landmark: LandmarkAnalysis;
  nearbyPlaces?: NearbyPlace[];
  processingTime: number;
}

// Camera and Image types
export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
  exif?: Record<string, any>;
}

export interface ImageUpload {
  uri: string;
  type: string;
  name: string;
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined;
  camera: { mode?: 'landmark' | 'museum' };
  result: { 
    landmarkId?: string; 
    imageUri?: string; 
    source?: 'new' | 'saved' | 'recent';
    locationCoords?: string;
    scanType?: 'landmark' | 'museum';
  };
  chat: { landmarkId: string; landmarkName: string };
  paywall: { source: 'scan_limit' | 'chat_feature' | 'settings' };
  onboarding: undefined;
};

export type TabParamList = {
  index: undefined;
  passport: undefined;
  settings: undefined;
};