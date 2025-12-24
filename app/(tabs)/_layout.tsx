import { Tabs, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentUsageStats, performScan } from '@/services/limitService';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showScanMenu, setShowScanMenu] = useState(false);

  const handleCameraPress = () => {
    setShowScanMenu(true);
  };

  const handleScanTypeSelect = async (scanType: 'landmark' | 'art') => {
    setShowScanMenu(false);
    
    try {
      // Atomic check-and-reserve: This will increment counter if allowed
      const limitResult = await performScan();
      
      if (limitResult.allowed) {
        // Navigate to camera with scan reserved
        if (scanType === 'landmark') {
          router.push({
            pathname: '/camera',
            params: { scanReserved: 'true', refreshOnReturn: 'true' }
          });
        } else {
          router.push({
            pathname: '/camera',
            params: { mode: 'museum', scanReserved: 'true', refreshOnReturn: 'true' }
          });
        }
        
        // Signal that home tab needs refresh when user returns
        try {
          await AsyncStorage.setItem('home_needs_refresh', Date.now().toString());
        } catch (error) {
          console.error('Error setting refresh flag:', error);
        }
      } else {
        router.push('/paywall?source=scan_limit');
      }
    } catch (error) {
      console.error('Error checking scan access:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const ScanTabButton = () => (
    <Pressable
      style={[
        {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -20, // Raise above tab bar
        },
        Shadows.large
      ]}
      onPress={handleCameraPress}
    >
      <IconSymbol name="camera.fill" size={28} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <>
      <Tabs
        screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          paddingBottom: Spacing.md,
          paddingTop: Spacing.sm,
          height: 90,
          borderTopLeftRadius: BorderRadius.lg,
          borderTopRightRadius: BorderRadius.lg,
          marginHorizontal: 0,
          marginBottom: 0,
          position: 'absolute',
          ...Shadows.medium,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 24} 
              name={focused ? "house.fill" : "house"} 
              color={color} 
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="passport"
        options={{
          title: 'Passport',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 24} 
              name={focused ? "book.fill" : "book"} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Center Scan Button */}
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarIcon: () => <ScanTabButton />,
          tabBarButton: (props) => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ScanTabButton />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Prevent navigation to scan screen
            handleCameraPress();
          },
        }}
      />
      
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 24} 
              name={focused ? "rectangle.stack.fill" : "rectangle.stack"} 
              color={color} 
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 24} 
              name={focused ? "gearshape.fill" : "gearshape"} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>

    {/* Compact Scan Menu Popup */}
    {showScanMenu && (
      <View 
        style={{
          position: 'absolute',
          bottom: 120, // Position above the tab bar
          alignSelf: 'center',
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.md,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.xs,
          ...Shadows.large,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          zIndex: 1000,
        }}
      >
        <Pressable
          style={{
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            alignItems: 'center',
          }}
          onPress={() => handleScanTypeSelect('landmark')}
        >
          <ThemedText style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: colors.textPrimary 
          }}>
            Landmark
          </ThemedText>
        </Pressable>
        
        <View style={{
          height: 1,
          backgroundColor: colors.cardBorder,
          marginHorizontal: Spacing.md,
        }} />
        
        <Pressable
          style={{
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            alignItems: 'center',
          }}
          onPress={() => handleScanTypeSelect('art')}
        >
          <ThemedText style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: colors.textPrimary 
          }}>
            Art
          </ThemedText>
        </Pressable>
      </View>
    )}

    {/* Backdrop to close popup */}
    {showScanMenu && (
      <Pressable
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
        onPress={() => setShowScanMenu(false)}
      />
    )}
    </>
  );
}
