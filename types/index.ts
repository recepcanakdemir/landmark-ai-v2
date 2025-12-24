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
  scansUsed: number;
  scansAllowed: number;
  resetTime?: string; // Next reset timestamp
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
  camera: undefined;
  result: { landmarkId: string };
  chat: { landmarkId: string; landmarkName: string };
  paywall: { source: 'scan_limit' | 'chat_feature' | 'settings' };
  onboarding: undefined;
};

export type TabParamList = {
  index: undefined;
  passport: undefined;
  settings: undefined;
};