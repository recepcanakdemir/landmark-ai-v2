import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme preference types
export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

// Context value interface
interface ThemeContextValue {
  preference: ThemePreference;
  colorScheme: ColorScheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  isLoading: boolean;
}

// Create context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Storage key for theme preference
const THEME_STORAGE_KEY = 'theme_preference';

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme() || 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Determine effective color scheme based on preference
  const colorScheme: ColorScheme = preference === 'system' ? systemColorScheme : preference;

  // Load stored theme preference on app start
  useEffect(() => {
    loadStoredPreference();
  }, []);

  const loadStoredPreference = async () => {
    try {
      const storedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedPreference && ['system', 'light', 'dark'].includes(storedPreference)) {
        setPreference(storedPreference as ThemePreference);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update theme preference and persist to storage
  const setThemePreference = async (newPreference: ThemePreference) => {
    try {
      setPreference(newPreference);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
      console.log('Theme preference saved:', newPreference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const value: ThemeContextValue = {
    preference,
    colorScheme,
    setThemePreference,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Legacy hook for backward compatibility - updates existing useColorScheme usage
export function useColorScheme(): ColorScheme {
  const { colorScheme, isLoading } = useTheme();
  
  // Return light as default while loading to prevent flicker
  if (isLoading) {
    return 'light';
  }
  
  return colorScheme;
}