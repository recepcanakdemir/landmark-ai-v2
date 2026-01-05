import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ActionCard } from '@/components/ActionCard';
import { LandmarkCard } from '@/components/LandmarkCard';
import { TabHeader } from '@/components/TabHeader';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentUsageStats } from '@/services/limitService';
import { getScanHistory } from '@/services/storageService';
import { LimitCheckResult, LandmarkAnalysis } from '@/types';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [usageStats, setUsageStats] = useState<LimitCheckResult | null>(null);
  const [recentLandmarks, setRecentLandmarks] = useState<LandmarkAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    requestLocationPermissionSilently();
  }, []);

  // Auto-refresh when screen gains focus (catches updates from modal/camera)
  useFocusEffect(
    useCallback(() => {
      checkAndRefresh();
    }, [])
  );

  const checkAndRefresh = async () => {
    try {
      // Check if refresh was requested from modal
      const refreshFlag = await AsyncStorage.getItem('home_needs_refresh');
      if (refreshFlag) {
        // Clear the flag and refresh
        await AsyncStorage.removeItem('home_needs_refresh');
        await loadData();
      } else {
        // Normal focus refresh
        loadData();
      }
    } catch (error) {
      console.error('Error checking refresh flag:', error);
      // Fallback to normal refresh
      loadData();
    }
  };

  const loadData = async () => {
    try {
      console.log('🏠 Home Screen: Loading usage stats and scan history...');
      
      const [stats, scanHistory] = await Promise.all([
        getCurrentUsageStats(),
        getScanHistory()
      ]);
      
      console.log('📊 Home Screen - Usage Stats:', JSON.stringify(stats, null, 2));
      setUsageStats(stats);
      
      // Get recent scans (last 5) from scan history
      const recentScans = scanHistory
        .filter(landmark => landmark && landmark.id && landmark.name)
        .slice(0, 5); // Show only recent 5
      
      setRecentLandmarks(recentScans);
      console.log('🏠 Loaded recent scans:', recentScans.length);
      
    } catch (error) {
      console.error('💥 Error loading data:', error);
      setRecentLandmarks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermissionSilently = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'undetermined') {
        console.log('Location permission undetermined, requesting silently...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        await AsyncStorage.setItem('location_permission_status', newStatus);
        console.log('Location permission result:', newStatus);
      } else {
        await AsyncStorage.setItem('location_permission_status', status);
        console.log('Location permission already determined:', status);
      }
    } catch (error) {
      console.log('Error requesting location permission:', error);
      await AsyncStorage.setItem('location_permission_status', 'denied');
    }
  };

  const handleScanPress = async () => {
    // Navigate directly to camera - limit check will happen after photo capture
    router.push('/camera');
  };

  const handleExplorePress = async () => {
    // Navigate directly to camera in museum mode - limit check will happen after photo capture
    router.push({
      pathname: '/camera',
      params: { mode: 'museum' }
    });
  };


  const handleLandmarkPress = (landmark: LandmarkAnalysis) => {
    // Safety check before navigation
    if (!landmark || !landmark.id) {
      console.warn('Invalid landmark data for navigation:', landmark);
      return;
    }

    router.push({
      pathname: '/result',
      params: { 
        landmarkId: landmark.id,
        savedLandmark: JSON.stringify(landmark),
        source: 'recent'
      }
    });
  };


  const renderRecentLandmark = ({ item }: { item: LandmarkAnalysis }) => {
    // Safety check to prevent rendering invalid items
    if (!item || !item.id || !item.name) {
      return null;
    }

    return (
      <LandmarkCard
        id={item.id}
        name={item.name}
        location={item.location || item.country || 'Unknown location'}
        imageUrl={item.imageUrl}
        dateAdded={new Date(item.analyzedAt || Date.now())}
        confidence={item.accuracy ? Math.round(item.accuracy * 100) : undefined}
        tags={[item.scanType === 'museum' ? 'Collection' : 'Landmark']}
        onPress={() => handleLandmarkPress(item)}
        size="small"
        style={styles.recentLandmarkCard}
      />
    );
  };

  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header - Fixed at top */}
      <TabHeader
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        titleStyle={{ fontSize: 28, lineHeight: 34 } as any}
        alignment="left"
      />
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >

        {/* Main Action Cards */}
        <View style={styles.actionsSection}>
          <ActionCard
            title={t('home.scanLandmark')}
            subtitle={t('home.scanLandmarkDesc')}
            icon="camera.fill"
            iconColor={colors.primary}
            onPress={handleScanPress}
          />
          
          <ActionCard
            title={t('home.scanArt')}
            subtitle={t('home.scanArtDesc')}
            icon="paintbrush.fill"
            iconColor={colors.sunsetOrange}
            onPress={handleExplorePress}
          />
        </View>

        {/* Recent Landmarks Section - Always show title */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('home.recentDiscoveries')}
            </ThemedText>
          </View>
          
          {recentLandmarks.length > 0 ? (
            <FlatList
              data={recentLandmarks}
              renderItem={renderRecentLandmark}
              keyExtractor={(item, index) => item?.id || `landmark-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentLandmarksList}
              ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
            />
          ) : (
            !loading && (
              <ThemedText style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                {t('home.noRecentDiscoveries')}
              </ThemedText>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Actions
  actionsSection: {
    marginBottom: Spacing.xl,
  },

  // Recent Landmarks
  recentSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  recentLandmarksList: {
    paddingLeft: Spacing.xs,
  },
  recentLandmarkCard: {
    width: 160,
  },

  // Empty State
  emptyMessage: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.lg,
  },
});