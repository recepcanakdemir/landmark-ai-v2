import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserAccessState } from '@/services/limitService';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLaunchPaywall();
  }, []);

  const checkLaunchPaywall = async () => {
    try {
      const accessState = await getUserAccessState();
      
      // Navigate to paywall for free tier users on app launch
      if (accessState.type === 'free') {
        // Small delay to ensure app is fully loaded
        setTimeout(() => {
          router.push('/paywall?source=app_launch');
        }, 500);
      }
    } catch (error) {
      console.error('Error checking launch paywall:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // Show loading state while checking user access
    return (
      <View style={styles.loadingContainer}>
        {/* App will show loading briefly while checking trial/premium status */}
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
