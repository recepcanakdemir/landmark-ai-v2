# LandmarkAI v2 - Technical Documentation

## Overview

LandmarkAI is an AI-powered travel companion React Native application built with Expo. The app allows users to scan landmarks using their camera, get AI-powered analysis, and build a personal collection of visited historical places. It features a freemium model with daily usage limits for free users and unlimited access for premium subscribers.

## Tech Stack

### Core Framework
- **React Native**: 0.81.5
- **Expo SDK**: 54.0.30 (Managed Workflow)
- **TypeScript**: 5.9.2 with strict mode
- **Expo Router**: 6.0.21 (File-based routing)

### Backend & Services
- **Supabase**: PostgreSQL database with Edge Functions
- **Google Gemini 2.0 Flash**: AI analysis (via Supabase Edge Functions)
- **RevenueCat**: Subscription management (placeholder ready)
- **Google Places API**: Nearby locations discovery

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
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── index.tsx            # 🏠 Home Dashboard
│   │   ├── passport.tsx         # 📚 Passport (Collection)
│   │   └── settings.tsx         # ⚙️ Settings & Subscription
│   ├── _layout.tsx              # Root layout with theme provider
│   ├── camera.tsx               # 📸 Full-screen camera
│   ├── result.tsx               # ✨ AI Analysis Results
│   └── paywall.tsx              # 💰 Subscription Modal
├── components/                   # Reusable UI components
│   ├── themed-text.tsx          # Typography with theme support
│   ├── themed-view.tsx          # Container with theme support
│   ├── haptic-tab.tsx           # Tab with haptic feedback
│   └── ui/
│       └── icon-symbol.tsx      # SF Symbols wrapper
├── services/                     # Business logic & API calls
│   ├── limitService.ts          # Usage tracking & limits
│   └── supabase.ts              # Database client & helpers
├── types/                        # TypeScript definitions
│   └── index.ts                 # All app interfaces
├── constants/                    # App configuration
│   └── theme.ts                 # Color system & fonts
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts      # Light/dark detection
│   └── use-theme-color.ts       # Theme-aware colors
└── assets/                       # Static assets
    └── images/                   # Icons, splash screens
```

## Core Features

### 1. Authentication & User Management
- **Anonymous users**: Device ID-based tracking via SecureStore
- **No user accounts**: Simplified onboarding experience
- **Device fingerprinting**: Unique ID generation for usage limits

### 2. Freemium Monetization Model
```typescript
// Free Tier Limits
- 3 scans per day per device
- Basic landmark information
- Local collection storage
- No AI chat feature

// Premium Tier ($4.99/week)
- Unlimited landmark scans
- AI chat with landmarks
- Priority support
- Advanced insights
```

### 3. Camera & Image Processing
- **Expo Camera**: Full-screen capture experience
- **Permission handling**: Graceful camera access requests
- **Image optimization**: 0.8 quality, base64 encoding for AI
- **UI overlay**: Custom controls over camera view

### 4. AI Analysis Pipeline
```typescript
// Current Implementation (Placeholder)
1. Image captured → Base64 encoding
2. Limit check → Supabase RPC call
3. Mock analysis → 1.5s simulation
4. Result display → Rich landmark data

// Production Implementation (Planned)
1. Image → Supabase Edge Function
2. Edge Function → Google Gemini 2.0 Flash
3. Gemini response → Structured JSON
4. Data persistence → Local storage + Supabase
```

## Database Schema (Supabase)

### Tables

```sql
-- Daily usage tracking
CREATE TABLE daily_limits (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    date DATE NOT NULL,
    scans_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, date)
);

-- Analyzed landmarks (future)
CREATE TABLE landmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    history TEXT,
    image_url TEXT,
    coordinates POINT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC Functions

```sql
-- Atomic limit checking and incrementing
CREATE OR REPLACE FUNCTION check_and_increment_limit(
    p_device_id TEXT,
    p_limit_date DATE,
    p_max_scans INTEGER DEFAULT 3
) RETURNS JSON AS $$
DECLARE
    current_usage INTEGER;
    can_scan BOOLEAN;
BEGIN
    -- Get or create daily record
    INSERT INTO daily_limits (device_id, date, scans_used)
    VALUES (p_device_id, p_limit_date, 0)
    ON CONFLICT (device_id, date) DO NOTHING;
    
    -- Get current usage
    SELECT scans_used INTO current_usage
    FROM daily_limits
    WHERE device_id = p_device_id AND date = p_limit_date;
    
    -- Check if can scan
    can_scan := current_usage < p_max_scans;
    
    -- Increment if allowed
    IF can_scan THEN
        UPDATE daily_limits
        SET scans_used = scans_used + 1,
            updated_at = NOW()
        WHERE device_id = p_device_id AND date = p_limit_date;
        
        current_usage := current_usage + 1;
    END IF;
    
    -- Return result
    RETURN json_build_object(
        'can_scan', can_scan,
        'scans_used', current_usage,
        'scans_remaining', p_max_scans - current_usage
    );
END;
$$ LANGUAGE plpgsql;
```

## Design System

### Color Palette
```typescript
// Light Theme
{
  text: '#1F2937',        // Dark gray text
  background: '#FFFFFF',   // Pure white
  tint: '#3B82F6',        // Modern blue
  card: '#F9FAFB',        // Light gray cards
  success: '#10B981',      // Green for success
  warning: '#F59E0B',      // Amber for warnings
  error: '#EF4444',       // Red for errors
  premium: '#F59E0B',     // Gold for premium
}

// Dark Theme
{
  text: '#F9FAFB',        // Light gray text
  background: '#111827',   // Dark blue-gray
  tint: '#60A5FA',        // Lighter blue
  card: '#1F2937',        // Dark gray cards
  // ... semantic colors adapted for dark mode
}
```

### Typography Scale
```typescript
{
  title: { fontSize: 32, fontWeight: '800' },     // Page headers
  subtitle: { fontSize: 20, fontWeight: '700' },  // Section headers
  default: { fontSize: 16, lineHeight: 24 },      // Body text
  caption: { fontSize: 14, opacity: 0.7 },       // Secondary text
}
```

### Component Architecture
- **Themed Components**: Automatic light/dark adaptation
- **Card System**: Consistent shadows and borders
- **Icon Library**: SF Symbols via IconSymbol component
- **Spacing System**: 8px base unit (8, 16, 24, 32px)

## Key Services

### Limit Service (`services/limitService.ts`)
Handles all usage tracking and subscription logic:

```typescript
// Core Functions
checkScanLimit(performScan: boolean) → LimitCheckResult
getCurrentUsageStats() → LimitCheckResult  
performScan() → LimitCheckResult
getCachedSubscriptionStatus() → SubscriptionStatus
refreshSubscriptionStatus() → SubscriptionStatus

// Return Type
interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  isPremium: boolean;
  scansUsed: number;
  scansAllowed: number;
  resetTime?: string;
}
```

### Supabase Service (`services/supabase.ts`)
Database client with helper functions:

```typescript
// Database Helpers
checkDailyLimit(deviceId: string, date: string)
upsertDailyLimit(deviceId: string, date: string, scansUsed: number)
checkAndIncrementLimit(deviceId: string, limitDate: string, maxScans: number)
getUsageAnalytics(startDate: string, endDate: string)
```

## Navigation Architecture

### Expo Router File-based Routing
```typescript
// Tab Navigation (Bottom Tabs)
/(tabs)/index.tsx     → Home Dashboard
/(tabs)/passport.tsx  → Collection
/(tabs)/settings.tsx  → Settings

// Modal Screens (Stack)
/camera.tsx          → Full-screen Camera
/result.tsx          → Analysis Results  
/paywall.tsx         → Subscription Modal
/chat.tsx            → AI Chat (future)
```

### Navigation Patterns
```typescript
// Camera Launch
router.push('/camera')

// Results with Image
router.push({
  pathname: '/result',
  params: { imageUri: photo.uri }
})

// Paywall with Context
router.push('/paywall?source=scan_limit')
```

## State Management

### Component-level State
- No global state library (Redux, Zustand)
- React hooks for local component state
- AsyncStorage for persistence
- SecureStore for sensitive data

### Data Flow
```typescript
// Typical Flow
1. User interaction → Component state update
2. Service call → Supabase/AsyncStorage
3. Response → Component state update
4. UI re-render → User feedback
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

### Production Readiness Checklist
- [ ] RevenueCat subscription setup
- [ ] Gemini API integration
- [ ] App Store assets preparation
- [ ] Privacy policy compliance
- [ ] Performance optimization
- [ ] Crash analytics setup

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
- `types/index.ts` - All TypeScript interfaces
- `services/limitService.ts` - Usage tracking logic
- `constants/theme.ts` - Design system colors
- `app/(tabs)/index.tsx` - Main dashboard implementation

**Common Issues:**
- Camera permissions on iOS Simulator (use device)
- Supabase configuration in app.json
- TypeScript strict mode errors
- Icon name mismatches with SF Symbols