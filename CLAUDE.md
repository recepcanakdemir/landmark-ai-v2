# LandmarkAI v2 - Technical Documentation

## Overview

LandmarkAI v2 is a sophisticated AI-powered travel companion React Native application built with Expo. The app enables users to identify landmarks and artworks using their smartphone camera, providing detailed AI analysis with comprehensive historical and cultural information. It features a dual-mode scanning system (landmarks and museum pieces), local-first data architecture, and a freemium monetization model with device-based usage tracking and premium subscriptions.

## Tech Stack

### Core Framework
- **React Native**: 0.81.5
- **Expo SDK**: 54.0.30 (Managed Workflow)
- **TypeScript**: 5.9.2 with strict mode
- **Expo Router**: 6.0.21 (File-based routing)

### Backend & Services
- **Supabase**: PostgreSQL database with Edge Functions for AI proxy
- **Google Gemini 2.0 Flash**: AI analysis engine (via Supabase Edge Functions)
- **RevenueCat**: iOS App Store subscription management with real-time status
- **Google Places API**: Nearby locations discovery and enrichment

### Storage & State
- **AsyncStorage**: Local-first landmark persistence
- **SecureStore**: Device ID and sensitive data
- **No global state management**: Component-level state only

### UI & Design
- **Expo Symbols**: SF Symbols for iOS-style icons
- **Custom themed components**: Light/dark mode support
- **Card-based design**: Modern shadow system
- **No external UI library**: Pure React Native styling

## Project Structure

```
LandmarkAI-v2/
├── app/                          # File-based routing (Expo Router)
│   ├── (tabs)/                   # Tab navigation group
│   │   ├── _layout.tsx          # Tab bar configuration with haptic feedback
│   │   ├── index.tsx            # 🏠 Home Dashboard with recent scans
│   │   ├── passport.tsx         # 📚 Passport (Landmark Collections)
│   │   ├── explore.tsx          # 🎨 Explore tab (future implementation)
│   │   └── settings.tsx         # ⚙️ Settings & Subscription management
│   ├── _layout.tsx              # Root layout with theme & RevenueCat providers
│   ├── camera.tsx               # 📸 Full-screen camera with dual scan modes
│   ├── result.tsx               # ✨ AI Analysis Results with nearby places
│   ├── chat.tsx                 # 💬 AI Chat interface (premium feature)
│   └── paywall.tsx              # 💰 RevenueCat subscription modal
├── components/                   # Reusable UI components
│   ├── themed-text.tsx          # Typography with theme support
│   ├── themed-view.tsx          # Container with theme support
│   ├── haptic-tab.tsx           # Tab with haptic feedback
│   ├── ActionCard.tsx           # Home screen action cards
│   ├── LandmarkCard.tsx         # Collection item cards
│   ├── TabHeader.tsx            # Consistent tab headers
│   ├── CameraOverlay.tsx        # Camera scanning overlay
│   ├── ScanningAnimation.tsx    # AI analysis loading animation
│   └── ui/
│       └── icon-symbol.tsx      # SF Symbols wrapper
├── services/                     # Business logic & API calls
│   ├── limitService.ts          # Usage tracking & subscription logic
│   ├── aiService.ts             # Google Gemini AI integration
│   ├── storageService.ts        # Local data persistence & collections
│   ├── placesService.ts         # Google Places API integration
│   ├── chatService.ts           # AI chat functionality (premium)
│   ├── reviewService.ts         # App Store review prompting
│   └── supabase.ts              # Database client & RPC helpers
├── providers/                    # React context providers
│   └── RevenueCatProvider.tsx   # Subscription management context
├── contexts/                     # Additional React contexts
│   └── ThemeContext.tsx         # Theme management context
├── types/                        # TypeScript definitions
│   └── index.ts                 # All app interfaces & RevenueCat types
├── constants/                    # App configuration
│   └── theme.ts                 # Complete design system
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts      # Light/dark detection
│   └── use-theme-color.ts       # Theme-aware colors
└── assets/                       # Static assets
    └── images/                   # Icons, splash screens, paywall assets
```

## Core Features

### 1. **Device-Based User Identification**
The app uses **anonymous device tracking** instead of traditional user accounts:
- **Hardware-based IDs**: iOS Vendor ID, Android ID for persistent tracking
- **SecureStore encryption**: Device IDs stored securely on device
- **Graceful fallbacks**: AsyncStorage backup, temporary IDs for edge cases
- **Privacy-first**: No personal data collection or cloud user profiles

### 2. **Three-Tier Access System**
```typescript
// Free Tier (Device-based daily limits)
- 3 scans per day per device
- Basic landmark & artwork analysis
- Local collection storage
- Scan history tracking

// Trial Tier (3-day unlimited trial)
- Unlimited scans for 3 days
- One-time trial per device
- All premium features included
- Local trial state management

// Premium Tier (RevenueCat subscriptions)
- Unlimited landmark & artwork scans
- AI chat with landmarks (planned)
- Priority analysis processing
- Advanced insights & analytics
```

### 3. **Dual-Mode AI Analysis System**
The app features two specialized scanning modes:

#### Landmark Mode (Historical Architecture)
- **AI Persona**: Professional historian and architecture expert
- **Content Focus**: Historical significance, architectural styles, cultural context
- **Output**: Construction details, architect info, visiting tips, nearby attractions
- **Data Enrichment**: Google Places integration for nearby recommendations

#### Museum Mode (Artwork & Cultural Artifacts)
- **AI Persona**: Expert museum curator and art historian
- **Content Focus**: Artistic techniques, historical periods, cultural significance
- **Output**: Artist details, estimated values, art movements, expert analysis
- **Specialized Fields**: Medium, technique, dimensions, historical context

### 4. **Advanced Camera & Image Processing**
- **Full-screen camera experience** with custom overlay and controls
- **Dual capture modes**: Live camera capture + gallery photo selection
- **Permission management**: Graceful camera, media library, and location access
- **Image optimization**: 0.8 quality compression optimized for AI analysis
- **GPS context integration**: Location coordinates enhance AI accuracy
- **Flash and camera flip controls** with haptic feedback

### 5. **Production AI Analysis Pipeline**
```typescript
// Complete Implementation Flow
1. Image capture → Base64 encoding via Expo FileSystem
2. Usage limit check → Supabase RPC atomic transaction
3. AI analysis → Supabase Edge Function → Google Gemini 2.0 Flash
4. Context-aware prompting → GPS coordinates + scan mode selection
5. Response parsing → Structured JSON with fallback handling
6. Data persistence → Local AsyncStorage + optional cloud sync
7. Nearby enrichment → Google Places API for recommendations
```

### 6. **Local-First Data Architecture**
The app implements a comprehensive local storage strategy:

#### Collection Management (`storageService.ts`)
```typescript
// Storage Buckets
LANDMARK_STORAGE_KEY = 'saved_landmarks'      // User's Passport
COLLECTION_STORAGE_KEY = 'saved_collections'  // Art Collections
SCAN_HISTORY_KEY = 'scan_history'            // Auto-saved scans

// Data Operations
saveLandmark() → User's curated Passport
saveCollection() → Museum/Art collections  
addToScanHistory() → Automatic scan tracking
```

#### Settings & Preferences
```typescript
// Distributed AsyncStorage keys
'location_enabled_preference'     // GPS usage consent
'subscription_status_cache'       // 5-minute RevenueCat cache
'landmark_trial_state'           // Local trial management
'home_needs_refresh'             // UI state coordination
```

## Backend Architecture (Supabase)

The app uses a **privacy-first backend** design where Supabase only tracks usage limits for free users. Premium users bypass the backend entirely.

### Database Schema

```sql
-- Core table: Daily usage tracking for free tier only
CREATE TABLE daily_limits (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,        -- Hardware-based device identifier
    date DATE NOT NULL,             -- YYYY-MM-DD format (user's timezone)
    scans_used INTEGER DEFAULT 0,   -- Current day usage count
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, date)         -- One record per device per day
);

-- Indexes for performance
CREATE INDEX idx_daily_limits_device_date ON daily_limits(device_id, date);
CREATE INDEX idx_daily_limits_date ON daily_limits(date);
```

### Edge Functions (Supabase)

#### 1. **Gemini Proxy Function** (`gemini-proxy`)
```typescript
// Handles AI analysis requests
POST /functions/v1/gemini-proxy
Body: {
  contents: [{
    parts: [
      { text: "Analysis prompt..." },
      { inlineData: { mimeType: "image/jpeg", data: "base64..." } }
    ]
  }]
}

// Response: Structured landmark/artwork analysis
```

#### 2. **Places Proxy Function** (`places-proxy`) 
```typescript
// Handles Google Places API calls
GET /functions/v1/places-proxy?endpoint=nearby&query=...
GET /functions/v1/places-proxy?endpoint=photo&query=...

// Enables nearby recommendations and place photos
```

### RPC Functions

#### **Atomic Limit Checking** (`check_and_increment_limit`)
```sql
-- Prevents race conditions in concurrent usage tracking
CREATE OR REPLACE FUNCTION check_and_increment_limit(
    p_device_id TEXT,
    p_limit_date DATE,
    p_max_scans INTEGER DEFAULT 3
) RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    can_scan BOOLEAN;
BEGIN
    -- Atomic upsert: get or create daily record
    INSERT INTO daily_limits (device_id, date, scans_used)
    VALUES (p_device_id, p_limit_date, 0)
    ON CONFLICT (device_id, date) DO NOTHING;
    
    -- Get current usage count
    SELECT scans_used INTO current_usage
    FROM daily_limits
    WHERE device_id = p_device_id AND date = p_limit_date;
    
    -- Check if scan is allowed
    can_scan := current_usage < p_max_scans;
    
    -- Increment if allowed (atomic update)
    IF can_scan THEN
        UPDATE daily_limits
        SET scans_used = scans_used + 1,
            updated_at = NOW()
        WHERE device_id = p_device_id AND date = p_limit_date;
    END IF;
    
    -- Return boolean result (simplified response)
    RETURN can_scan;
END;
$$ LANGUAGE plpgsql;
```

## Design System & UI Architecture

### **Complete Color Palette** (`constants/theme.ts`)
```typescript
// Light Theme - Premium iOS Aesthetic
{
  // Core Colors
  textPrimary: '#1D1D1F',     // Apple's near-black for headers
  textSecondary: '#686868',    // High-contrast gray for body text
  textTertiary: '#8E8E93',     // iOS systemGray for supporting text
  background: '#f9f9f9',       // iOS systemGray6 app background
  surface: '#FFFFFF',          // Pure white cards and surfaces
  
  // Brand Identity
  primary: '#007AFF',          // Modern travel blue (main actions)
  tint: '#007AFF',            // Active states and selections
  sunsetOrange: '#FF5A5F',     // Accent color for highlights
  explorerGold: '#FF9500',     // Premium features and warnings
  
  // Semantic Colors
  success: '#34C759',          // iOS systemGreen
  warning: '#FF9500',          // iOS systemOrange  
  error: '#FF3B30',           // iOS systemRed
  info: '#007AFF',            // Information states
  
  // UI Elements
  card: '#FFFFFF',             // Card backgrounds
  cardBorder: '#E5E5EA',       // iOS separator color
  backgroundSecondary: '#FAFAFA', // Subtle background variation
  overlay: 'rgba(0, 0, 0, 0.4)', // Modal overlays
}

// Dark Theme - Automatically adapted
{
  // Optimized for OLED displays and accessibility
  textPrimary: '#FFFFFF',      // Pure white headers
  textSecondary: '#C9D1D9',    // Light gray body text
  background: '#0D1117',       // Very dark gray app background
  surface: '#21262D',          // Dark gray cards
  primary: '#2563EB',          // Deeper blue for dark mode
  // ... complete dark theme adaptation
}
```

### **Typography System**
```typescript
// Comprehensive type scale with iOS-style spacing
{
  h1: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.25 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
}
```

### **Shadow System** (Enhanced for Premium Feel)
```typescript
// Progressive shadow depths for visual hierarchy
{
  small: { shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  medium: { shadowOpacity: 0.16, shadowRadius: 6, elevation: 4 },
  large: { shadowOpacity: 0.20, shadowRadius: 12, elevation: 8 },
  floating: { shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 },
}
```

### **Component Architecture**
- **ThemedText/ThemedView**: Automatic light/dark mode adaptation
- **ActionCard**: Home screen feature cards with haptic feedback
- **LandmarkCard**: Collection items with confidence badges and metadata
- **CameraOverlay**: Scanning interface with animated guides
- **ScanningAnimation**: AI analysis feedback with landmark context
- **IconSymbol**: SF Symbols integration for iOS-native feel
- **Spacing System**: 8px grid (xs:4, sm:8, md:16, lg:24, xl:32, xxl:48, xxxl:64)
- **BorderRadius**: Consistent rounding (sm:8, md:12, lg:16, xl:20, pill:999)

## Comprehensive Services Architecture

### **1. Limit Service** (`services/limitService.ts`)
**The most complex service** - orchestrates the entire freemium system:

#### Core Access Control Flow
```typescript
// Primary function - checks subscription status FIRST, backend LAST
async function getUserAccessState(): Promise<UserAccessState> {
  // STEP 1: Check RevenueCat for premium status (existing subscribers)
  const subscriptionStatus = await checkPremiumStatus();
  if (subscriptionStatus.isPremium) {
    return { type: 'premium', unlimited: true };
  }
  
  // STEP 2: Check local trial state (3-day unlimited trial)
  const trialActive = await isTrialActive();
  if (trialActive) {
    return { type: 'trial', unlimited: true, trialEndDate: trialState.endDate };
  }
  
  // STEP 3: Free users only - hit Supabase for usage tracking
  const deviceId = await getDeviceId();
  const limitResult = await checkSupabaseLimit(deviceId, false);
  return { type: 'free', unlimited: false, scansRemaining: limitResult.remaining };
}
```

#### Device ID Management (Hardware-Based Tracking)
```typescript
// Prevents uninstall/reinstall loophole
async function getDeviceId(): Promise<string> {
  // iOS: Application.getIosIdForVendorAsync() - persists until vendor apps deleted
  // Android: Application.getAndroidId() - persists until factory reset
  // Fallbacks: SecureStore → AsyncStorage → Temporary session ID
}
```

#### Subscription Integration (RevenueCat)
```typescript
// Real-time subscription status with 5-minute local cache
async function checkPremiumStatus(): Promise<SubscriptionStatus> {
  const customerInfo = await Purchases.getCustomerInfo();
  const proEntitlement = customerInfo.entitlements.active['premium'];
  return { isPremium: proEntitlement?.isActive === true };
}
```

### **2. AI Service** (`services/aiService.ts`)
**Google Gemini 2.0 Flash integration** with dual-persona system:

#### Dual-Mode Analysis Pipeline
```typescript
// Context-aware prompting based on scan type and location
function buildAnalysisPrompt(locationCoords?: {lat, lng}, scanType: 'landmark' | 'museum') {
  if (scanType === 'museum') {
    return buildMuseumAnalysisPrompt(); // Expert art curator persona
  }
  return buildLandmarkAnalysisPrompt(); // Professional historian persona
}

// Complete analysis flow
async function analyzeImage(imageUri: string, locationCoords?: {lat, lng}, scanType: 'landmark' | 'museum') {
  1. Convert image → Base64 via Expo FileSystem
  2. Build context-aware prompt → Location + scan mode
  3. Call Supabase Edge Function → Gemini 2.0 Flash proxy
  4. Parse response → Structured JSON with fallbacks
  5. Enrich with metadata → ID, timestamp, confidence score
}
```

#### Advanced Response Handling
```typescript
// Robust parsing with graceful fallbacks
function parseGeminiResponse(response: any, scanType: 'landmark' | 'museum') {
  // Handles multiple response formats from Gemini API
  // Validates required fields and confidence scores
  // Returns fallback data if parsing fails (never blocks user)
}
```

### **3. Storage Service** (`services/storageService.ts`)
**Local-first data persistence** with three distinct storage buckets:

#### Collection Management Architecture
```typescript
// Separate storage for different content types
const LANDMARK_STORAGE_KEY = 'saved_landmarks';      // User's curated Passport
const COLLECTION_STORAGE_KEY = 'saved_collections';  // Museum/Art pieces
const SCAN_HISTORY_KEY = 'scan_history';            // Auto-saved all scans

// Smart save operations based on content type
async function saveLandmark(landmark: LandmarkAnalysis) {
  if (landmark.scanType === 'museum') {
    await saveCollection(landmark); // Routes to art collections
  } else {
    await saveToPassport(landmark); // Routes to travel passport
  }
}
```

#### Data Persistence Strategy
```typescript
// Optimistic updates with error recovery
async function addToScanHistory(landmark: LandmarkAnalysis) {
  1. Immediate UI update → Optimistic state
  2. Background persistence → AsyncStorage.setItem()
  3. Error handling → Rollback on failure
  4. Automatic cleanup → Maintain recent 50 scans
}
```

### **4. Places Service** (`services/placesService.ts`)
**Google Places API integration** for location enrichment:

```typescript
// Enriches landmarks with nearby recommendations
async function enrichNearbyPlaces(searchQueries: string[], coordinates?: {lat, lng}) {
  1. Execute parallel searches → Multiple Google Places queries
  2. Geospatial filtering → Radius-based relevance
  3. Deduplication → Remove duplicate places
  4. Distance calculation → Sort by proximity
  5. Photo enrichment → Supabase proxy for images
}
```

### **5. RevenueCat Provider** (`providers/RevenueCatProvider.tsx`)
**Subscription management context** with real-time updates:

```typescript
// Global subscription state management
const RevenueCatProvider = () => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  
  // Real-time subscription monitoring
  useEffect(() => {
    Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    return () => Purchases.removeCustomerInfoUpdateListener();
  }, []);
  
  // Purchase flow with error handling
  const purchasePackage = async (pkg: Package) => {
    try {
      const {customerInfo} = await Purchases.purchasePackage(pkg);
      return customerInfo.entitlements.active['premium']?.isActive ?? false;
    } catch (e: any) {
      if (e.userCancelled) return false;
      throw e; // Re-throw for caller handling
    }
  };
}
```

### **6. Review Service** (`services/reviewService.ts`)
**Smart App Store review prompting**:

```typescript
// Triggers review prompts at optimal moments
async function checkScanSuccessReview() {
  // Conditions: 10+ scans, no recent prompts, iOS only
  if (scanCount >= 10 && !recentlyPrompted && Platform.OS === 'ios') {
    await StoreReview.requestReview();
  }
}
```

### **7. Supabase Service** (`services/supabase.ts`)
**Database client** with optimized helpers:

```typescript
// Atomic limit operations
const supabaseHelpers = {
  async checkAndIncrementLimit(deviceId: string, limitDate: string, maxScans: number = 3) {
    return await supabase.rpc('check_and_increment_limit', {
      p_device_id: deviceId,
      p_limit_date: limitDate, 
      p_max_scans: maxScans
    });
  }
};
```

## Advanced Navigation Architecture

### **Expo Router File-based Routing** (v6.0.21)
```typescript
// Bottom Tab Navigation (Core App Flow)
/(tabs)/_layout.tsx      → Tab bar with haptic feedback & badges
/(tabs)/index.tsx        → Home Dashboard with recent scans & action cards
/(tabs)/passport.tsx     → Travel Passport & Art Collections
/(tabs)/explore.tsx      → Explore nearby (future feature)
/(tabs)/settings.tsx     → Settings, subscription management & app info

// Full-Screen Modal Screens (Stack Navigation)
/camera.tsx              → Full-screen camera with dual scan modes
/result.tsx              → AI analysis results with nearby places & maps
/chat.tsx                → AI chat interface (premium feature)
/paywall.tsx             → RevenueCat subscription modal with trial toggle

// Navigation Groups & Typed Routes
app/(tabs) → Tab group with bottom navigation
app/ → Root stack for modals and full-screen experiences
```

### **Advanced Navigation Patterns**
```typescript
// Type-safe navigation with parameters
interface RootStackParamList {
  '(tabs)': undefined;
  camera: { mode?: 'landmark' | 'museum'; scanAllowed?: string };
  result: { 
    landmarkId?: string; 
    imageUri?: string; 
    source?: 'new' | 'saved' | 'recent';
    locationCoords?: string;
    scanType?: 'landmark' | 'museum';
  };
  chat: { landmarkId: string; landmarkName: string; landmarkData: string };
  paywall: { source: 'scan_limit' | 'chat_feature' | 'settings' | 'app_launch' };
}

// Smart navigation with context preservation
const handleScanPress = async () => {
  const limitResult = await checkScanLimit(false); // Pre-check without consuming
  
  if (limitResult.allowed) {
    router.push({
      pathname: '/camera',
      params: { scanAllowed: 'true' } // Skip re-checking in camera
    });
  } else {
    router.push('/paywall?source=scan_limit');
  }
};

// Smart paywall navigation based on entry point
const handleSmartNavigation = () => {
  if (source === 'app_launch') {
    router.replace('/(tabs)'); // No previous screen to return to
  } else {
    router.back(); // Return to previous screen
  }
};
```

### **State Coordination Between Screens**
```typescript
// Cross-screen state management without global state
// Uses AsyncStorage flags for coordination

// result.tsx → home.tsx refresh coordination
await AsyncStorage.setItem('home_needs_refresh', 'true');
router.back(); // Home screen will detect flag and refresh

// Subscription state updates trigger app-wide refresh
const { isPro } = useRevenueCat();
useEffect(() => {
  if (isPro) {
    router.back(); // Exit paywall automatically
  }
}, [isPro]);
```

## Advanced State Management & Data Flow

### **Component-Level State Architecture**
The app intentionally avoids global state management libraries for simplicity and performance:

```typescript
// Local state with service layer
const [landmark, setLandmark] = useState<LandmarkAnalysis | null>(null);
const [loading, setLoading] = useState(true);

// Service calls with immediate UI updates
const handleScan = async () => {
  setLoading(true); // Immediate UI feedback
  try {
    const analysis = await analyzeImage(imageUri);
    setLandmark(analysis); // Update local state
    await addToScanHistory(analysis); // Background persistence
  } finally {
    setLoading(false);
  }
};
```

### **Data Persistence Hierarchy**
```typescript
// Storage priority and fallback chain
1. SecureStore (encrypted) → Device ID, sensitive settings
2. AsyncStorage (local) → Collections, scan history, preferences
3. Supabase (backend) → Usage limits for free users only
4. RevenueCat (cloud) → Subscription state tied to Apple ID
5. In-memory state → Session data, UI state
```

### **Cross-Screen State Coordination**
```typescript
// RevenueCat provider for subscription state
const { isPro, customerInfo, purchasePackage } = useRevenueCat();

// AsyncStorage flags for UI coordination
'home_needs_refresh' → Signals home screen to reload data
'subscription_status_cache' → 5-minute cache for performance

// Focus-based refresh patterns
useFocusEffect(
  useCallback(() => {
    checkAndRefresh(); // Reload when screen gains focus
  }, [])
);
```

## **Subscription Migration & Restoration**

### **Critical App Store Update Scenario**
The app handles the transition from pre-backend to post-backend versions seamlessly:

#### **Existing Premium User Restoration Flow**
```typescript
// App Launch Sequence (app/_layout.tsx)
1. RevenueCat Provider initialization (1000ms delay for full setup)
2. getUserAccessState() → Checks RevenueCat FIRST, backend LAST
3. Premium users → Skip paywall, never hit backend
4. Free users → Hit backend for usage tracking

// Priority Order Ensures Backward Compatibility
async function getUserAccessState() {
  // STEP 1: RevenueCat check (existing subscribers)
  const subscriptionStatus = await checkPremiumStatus();
  if (subscriptionStatus.isPremium) return { type: 'premium' }; // EXIT HERE
  
  // STEP 2: Trial check (local state only)
  if (await isTrialActive()) return { type: 'trial' };
  
  // STEP 3: Backend check (new free users only)
  return await checkFreeUserLimits();
}
```

#### **Manual Restoration Option**
```typescript
// Paywall screen provides restore button for edge cases
const handleRestore = async () => {
  const restoreSuccess = await restorePurchases(); // Direct RevenueCat call
  if (restoreSuccess) {
    handleSmartNavigation(); // Exit paywall immediately
  }
  // Failure cases handled by RevenueCat with user-friendly alerts
};
```

### **Migration Success Factors**
✅ **RevenueCat First**: Premium status checked before backend  
✅ **Backend Isolation**: Only free users tracked in Supabase  
✅ **Apple ID Continuity**: Subscriptions tied to App Store account  
✅ **Graceful Fallbacks**: Errors never block premium users  
✅ **Zero Data Loss**: No user data migrated to backend  

## **Production Deployment Architecture**

### **App Store Configuration**
```typescript
// app.json - Production settings
{
  "expo": {
    "name": "LandmarkAI",
    "slug": "LandmarkAI-v2", 
    "version": "1.0.2",
    "ios": {
      "bundleIdentifier": "com.recapp.landmarkai",
      "buildNumber": "3",
      "appleTeamId": "3WL9FYSV99"
    },
    "extra": {
      "supabaseUrl": "https://xishvjmkklbatttnrwbk.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "revenueCatApiKeyIos": "appl_boZGShDRWyOQDzbjYFyAkCJysPB"
    }
  }
}
```

### **Privacy & Compliance**
```typescript
// Data minimization strategy
✅ No personal data collection
✅ Anonymous device tracking only  
✅ Local-first storage architecture
✅ RevenueCat handles payment data
✅ GPS used only during scan (not stored)
✅ Images processed but not persisted on backend

// Privacy policy links in paywall
Terms: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
Privacy: "https://www.freeprivacypolicy.com/live/d267bff4-586c-40d4-a03f-e425112f455d"
```

### **Performance Monitoring & Analytics**
```typescript
// Built-in usage analytics (privacy-first)
- Scan success/failure rates
- AI confidence score distributions  
- Feature usage patterns
- Subscription conversion funnel
- App Store review prompting optimization

// No third-party analytics to maintain privacy
```

## Security Considerations

### Data Protection
- **No personal data**: Anonymous device tracking only
- **SecureStore**: Sensitive data encrypted on device
- **Supabase RLS**: Row-level security (future implementation)
- **No credentials storage**: RevenueCat handles payments

### API Security
- **Supabase**: Anon key with restricted permissions
- **Rate limiting**: Device-based via daily limits
- **Edge Functions**: Server-side API key management

## Performance Optimizations

### Image Handling
- **Quality**: 0.8 compression for AI analysis
- **Base64**: Only when needed for API calls
- **Local caching**: AsyncStorage for analyzed landmarks

### Database Efficiency
- **RPC functions**: Atomic operations
- **Indexing**: device_id + date composite keys
- **Minimal queries**: Single calls for limit checking

### UI Performance
- **Themed components**: Minimal re-renders
- **Image optimization**: Expo Image with caching
- **List virtualization**: FlatList for large collections

## Development Workflow

### Environment Setup
```bash
# Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator / Android Emulator

# Installation
npm install
npx expo start

# Platform specific
npx expo start --ios
npx expo start --android
```

### Configuration
```typescript
// app.json - Supabase Integration
{
  "extra": {
    "supabaseUrl": "YOUR_SUPABASE_URL",
    "supabaseAnonKey": "YOUR_SUPABASE_ANON_KEY"
  }
}
```

### Build Commands
```bash
# Development
npm run start

# Linting
npm run lint

# Platform builds
npm run ios
npm run android
npm run web
```

## Future Roadmap

### Phase 1: Core Features (Current)
- ✅ Tab navigation structure
- ✅ Camera integration
- ✅ Result screen UI
- ✅ Usage limits system
- ✅ Paywall implementation

### Phase 2: AI Integration
- [ ] Gemini 2.0 Flash integration
- [ ] Supabase Edge Functions
- [ ] Real landmark analysis
- [ ] Nearby places API

### Phase 3: Enhanced Features
- [ ] AI chat functionality
- [ ] Collection sharing
- [ ] Offline support
- [ ] Advanced analytics

### Phase 4: Scale & Polish
- [ ] RevenueCat integration
- [ ] Performance monitoring
- [ ] A/B testing framework
- [ ] Advanced personalization

## Error Handling

### Graceful Degradation
- **Network errors**: Offline mode with cached data
- **Camera issues**: Clear permission prompts
- **API failures**: Fallback to mock data
- **Storage errors**: In-memory fallbacks

### User Feedback
- **Loading states**: Skeleton screens and spinners
- **Error messages**: Clear, actionable guidance
- **Success feedback**: Haptic and visual confirmation

## Testing Strategy

### Current Status
- **Manual testing**: Development device testing
- **Type checking**: TypeScript strict mode
- **Linting**: ESLint with Expo configuration

### Planned Testing
```typescript
// Unit Tests (Jest + React Native Testing Library)
- Service layer functions
- Component rendering
- Navigation flows

// E2E Tests (Detox)
- Camera capture flow
- Limit enforcement
- Paywall integration

// Performance Tests
- Image processing benchmarks
- Database query optimization
- Memory usage monitoring
```

## Deployment

### Current Configuration
- **Expo Development Build**: For testing camera features
- **Over-the-air updates**: Expo Updates for quick iteration
- **Environment separation**: Dev/staging/production configs

### **Production Readiness Status**

#### ✅ **Completed & Deployed**
- **RevenueCat integration**: Full subscription management with iOS App Store
- **App Store deployment**: Live on iOS App Store (com.recapp.landmarkai)
- **Privacy compliance**: GDPR-compliant data minimization architecture
- **Performance optimization**: Optimized for iOS with 60fps animations
- **Error handling**: Comprehensive fallback systems throughout app
- **Subscription restoration**: Seamless existing user migration support

#### 🔄 **Production Infrastructure Ready** 
- **Supabase backend**: Database and Edge Functions configured
- **Google Gemini 2.0 Flash**: AI analysis pipeline implemented
- **Google Places API**: Nearby recommendations service ready
- **Image processing**: Optimized Base64 encoding and analysis
- **Usage tracking**: Device-based limits with atomic database operations

#### 📱 **App Store Optimization**
- **Bundle ID**: com.recapp.landmarkai
- **Version**: 1.0.2 (Build 3)
- **Team ID**: 3WL9FYSV99
- **Assets**: Icons, splash screens, paywall graphics optimized
- **Metadata**: App Store description, keywords, categories configured

---

## Commands for Claude Code Assistant

When working on this project, these are common tasks:

```bash
# Run the app
npx expo start

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Clear cache
npx expo start --clear
```

**Key Files to Reference:**
- `types/index.ts` - Comprehensive TypeScript interfaces (300+ lines)
- `services/limitService.ts` - Complex freemium logic with device tracking
- `services/aiService.ts` - Google Gemini 2.0 Flash integration with dual personas
- `services/storageService.ts` - Local-first data architecture
- `providers/RevenueCatProvider.tsx` - Subscription management context
- `constants/theme.ts` - Complete design system with iOS aesthetics
- `app/(tabs)/index.tsx` - Home dashboard with usage tracking
- `app/result.tsx` - AI analysis results with nearby places
- `app/paywall.tsx` - RevenueCat subscription flow with trial management
- `app/camera.tsx` - Full-screen camera with dual scan modes

**Critical Architecture Files:**
- `app/_layout.tsx` - App initialization with RevenueCat & subscription checks
- `components/ScanningAnimation.tsx` - AI analysis loading with context
- `services/placesService.ts` - Google Places integration for recommendations

**Database & Backend:**
- Supabase RPC: `check_and_increment_limit` - Atomic usage tracking
- Edge Functions: `gemini-proxy`, `places-proxy` - AI and location services
- AsyncStorage keys: Device settings, collections, scan history

**Subscription Architecture:**
- RevenueCat entitlement: `premium` - Core subscription identifier
- Trial management: Local state with 3-day unlimited access
- Device tracking: Hardware-based IDs preventing reinstall circumvention

**Common Development Issues & Solutions:**
- **Camera permissions**: iOS Simulator unsupported - use physical device
- **RevenueCat testing**: Use sandbox mode with test Apple ID
- **Supabase configuration**: Verify URL/key in app.json extra section
- **TypeScript strict mode**: All interfaces defined in types/index.ts
- **SF Symbols**: Use exact names from Apple's SF Symbols catalog
- **Image analysis**: Requires Base64 encoding via Expo FileSystem legacy API
- **Location permissions**: GPS context improves AI accuracy when available
- **AsyncStorage debugging**: Use Flipper or console logs for persistence issues
- **Subscription restoration**: Test with existing App Store purchases
- **Trial state**: Stored locally, cleared on app reinstall (by design)

**Performance Troubleshooting:**
- **Slow AI analysis**: Check Supabase Edge Function logs and Gemini API quotas
- **Memory issues**: Large images cached in AsyncStorage, implement cleanup
- **Navigation lag**: Avoid unnecessary re-renders in navigation params
- **Image loading**: Use Expo Image with progressive loading and placeholders

**Production Monitoring:**
- **Subscription metrics**: Monitor via RevenueCat dashboard
- **Usage analytics**: Built-in scan success rates and confidence scores
- **Error tracking**: Console logs with structured error information
- **Performance**: Monitor app launch time and scan completion rates