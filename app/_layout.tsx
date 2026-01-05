import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import 'react-native-reanimated';

// Import i18n configuration
import '@/i18n';

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
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkLaunchPaywall();
    // Start loading bar animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [progressAnim]);

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
        
        {/* Loading Bar */}
        <View style={styles.loadingBarContainer}>
          <View style={[styles.loadingBarBackground, { backgroundColor: colors.backgroundSecondary }]}>
            <Animated.View
              style={[
                styles.loadingBar,
                {
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
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
    marginBottom: 60,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  loadingBarContainer: {
    width: '40%',
    maxWidth: 140,
  },
  loadingBarBackground: {
    width: '100%',
    height: 6, // Bold thickness
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingBar: {
    height: '100%',
    borderRadius: 3,
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
