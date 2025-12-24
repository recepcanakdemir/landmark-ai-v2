import { Tabs, router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
      onPress={() => router.push('/camera')}
    >
      <IconSymbol name="camera.fill" size={28} color="#FFFFFF" />
    </Pressable>
  );

  return (
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
            router.push('/camera');
          },
        }}
      />
      
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 24} 
              name={focused ? "map.fill" : "map"} 
              color={color} 
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Prevent navigation
            router.push('/camera'); // Navigate to camera for now
          },
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
  );
}
