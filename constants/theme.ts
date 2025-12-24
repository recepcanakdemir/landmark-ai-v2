/**
 * LandmarkAI Design System
 * Modern travel and discovery aesthetic with vibrant blue theme
 */

import { Platform } from 'react-native';

const travelBlue = '#007AFF';      // Modern Travel Blue - Primary
const travelBlueDark = '#2563EB';  // Deeper blue for dark mode
const sunsetOrange = '#FF5A5F';    // Sunset Orange - Accent

export const Colors = {
  light: {
    // Core Colors
    text: '#1A1A1A',           // Dark Slate - Primary text
    background: '#F5F7FA',     // Off-white/Light Gray - App background
    surface: '#FFFFFF',        // Pure White - Cards and surfaces
    
    // Brand Colors
    primary: travelBlue,       // Modern Travel Blue - Main actions
    tint: travelBlue,          // Modern Travel Blue - Active states
    
    // Text Hierarchy
    textPrimary: '#1A1A1A',    // Dark Slate - Headings
    textSecondary: '#666666',   // Medium Gray - Body text
    textTertiary: '#999999',    // Light Gray - Supporting text
    
    // UI Elements
    icon: '#666666',           // Medium Gray - Default icons
    iconActive: travelBlue,    // Blue - Active icons
    tabIconDefault: '#999999', // Light Gray - Inactive tabs
    tabIconSelected: travelBlue,
    
    // Surfaces & Borders
    card: '#FFFFFF',           // Pure White - Cards
    cardBorder: '#E8E8E8',     // Light Border
    cardShadow: '#000000',     // Shadow color
    
    // Semantic Colors
    success: '#00C851',        // Botanical Green - Success
    warning: '#FF8A00',        // Orange - Warnings
    error: '#FF3547',          // Red - Errors
    info: '#17A2B8',           // Blue - Information
    
    // Travel & Landmark Specific
    accentBlue: '#2563EB',     // Deeper blue for accents
    sunsetOrange: sunsetOrange, // Orange for highlights
    explorerGold: '#F59E0B',   // Gold for premium features
    
    // Interaction States
    buttonPrimary: travelBlue,
    buttonSecondary: '#F5F7FA',
    buttonDisabled: '#E0E0E0',
    ripple: 'rgba(0, 122, 255, 0.12)', // 12% opacity blue
    
    // Backgrounds
    backgroundSecondary: '#FAFBFC',
    backgroundTertiary: '#F0F0F0',
    overlay: 'rgba(0, 0, 0, 0.4)',
    
    // Legacy compatibility
    premium: '#FF8A00',
    secondary: '#F5F7FA',
    tertiary: '#999999',
    chatBackground: '#F5F7FA',
  },
  dark: {
    // Core Colors
    text: '#FFFFFF',           // Pure White
    background: '#0D1117',     // Very Dark Gray - App background
    surface: '#21262D',        // Dark Gray - Cards and surfaces
    
    // Brand Colors
    primary: travelBlueDark,   // Deeper blue for dark mode
    tint: travelBlueDark,      // Deeper blue - Active states
    
    // Text Hierarchy
    textPrimary: '#FFFFFF',    // Pure White - Headings
    textSecondary: '#C9D1D9',  // Light Gray - Body text
    textTertiary: '#8B949E',   // Medium Gray - Supporting text
    
    // UI Elements
    icon: '#8B949E',           // Medium Gray - Default icons
    iconActive: travelBlueDark,// Deep Blue - Active icons
    tabIconDefault: '#8B949E', // Medium Gray - Inactive tabs
    tabIconSelected: travelBlueDark,
    
    // Surfaces & Borders
    card: '#21262D',           // Dark Gray - Cards
    cardBorder: '#30363D',     // Dark Border
    cardShadow: '#000000',     // Shadow color
    
    // Semantic Colors
    success: '#56D364',        // Lighter green for dark mode
    warning: '#F85149',        // Red-orange for warnings
    error: '#F85149',          // Red for errors
    info: '#58A6FF',           // Blue for information
    
    // Travel & Landmark Specific
    accentBlue: '#60A5FA',     // Lighter blue for dark mode
    sunsetOrange: '#FB7185',   // Lighter orange for dark mode
    explorerGold: '#FCD34D',   // Lighter gold for dark mode
    
    // Interaction States
    buttonPrimary: travelBlueDark,
    buttonSecondary: '#21262D',
    buttonDisabled: '#484F58',
    ripple: 'rgba(37, 99, 235, 0.15)', // 15% opacity deep blue
    
    // Backgrounds
    backgroundSecondary: '#161B22',
    backgroundTertiary: '#21262D',
    overlay: 'rgba(0, 0, 0, 0.6)',
    
    // Legacy compatibility
    premium: '#F85149',
    secondary: '#21262D',
    tertiary: '#8B949E',
    chatBackground: '#0D1117',
  },
};

// Shadow system for consistent depth
export const Shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
};

// Spacing system based on 8px grid
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius system
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999, // For fully rounded buttons
};

// Typography system
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
