import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import 'react-native-reanimated';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { RevenueCatProvider } from '@/providers/RevenueCatProvider';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserAccessState } from '@/services/limitService';
import { checkAppLaunchReview } from '@/services/reviewService';
import { Colors } from '@/constants/theme';

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
      console.log('🚀 App Launch: Starting paywall check...');
      
      // Add a small delay to ensure RevenueCat provider is fully initialized
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const accessState = await getUserAccessState();
      console.log('📊 App Launch - User Access State:', JSON.stringify(accessState, null, 2));
      
      // Navigate to paywall for free tier users on app launch
      if (accessState.type === 'free') {
        console.log('💳 Free user detected - navigating to paywall');
        // Small delay to ensure app is fully loaded
        setTimeout(() => {
          router.push('/paywall?source=app_launch');
        }, 500);
      } else if (accessState.type === 'premium') {
        console.log('⭐ Premium user detected - skipping paywall');
      } else if (accessState.type === 'trial') {
        console.log('🎯 Trial user detected - skipping paywall');
      }

      // Check for app launch review after paywall logic
      // This runs independently and won't block the app launch
      checkAppLaunchReview().catch(error => {
        console.error('💥 Error in app launch review check:', error);
      });

    } catch (error) {
      console.error('💥 Error checking launch paywall:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // On error, don't show paywall to avoid blocking premium users
      console.log('🛡️ Error occurred - not showing paywall to avoid blocking premium users');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    // Show branded loading state while checking user access
    const colors = Colors[colorScheme ?? 'light'];
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/paywall-icon.png')}
            style={styles.loadingLogo}
            contentFit="contain"
          />
        </View>
        
        {/* Loading Spinner */}
        <ActivityIndicator 
          size="large" 
          color={colors.primary} 
          style={styles.loadingSpinner}
        />
        
        {/* Loading Text */}
        <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
          Initializing...
        </ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RevenueCatProvider>
        <AppContent />
      </RevenueCatProvider>
    </ThemeProvider>
  );
}
