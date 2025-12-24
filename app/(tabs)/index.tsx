import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { ThemedText } from '@/components/themed-text';
import { ActionCard } from '@/components/ActionCard';
import { LandmarkCard } from '@/components/LandmarkCard';
import { CustomButton } from '@/components/CustomButton';
import { TabHeader } from '@/components/TabHeader';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentUsageStats } from '@/services/limitService';
import { getScanHistory } from '@/services/storageService';
import { LimitCheckResult, LandmarkAnalysis } from '@/types';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [usageStats, setUsageStats] = useState<LimitCheckResult | null>(null);
  const [recentLandmarks, setRecentLandmarks] = useState<LandmarkAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stats, scanHistory] = await Promise.all([
        getCurrentUsageStats(),
        getScanHistory()
      ]);
      setUsageStats(stats);
      
      // Get recent scans (last 5) from scan history
      const recentScans = scanHistory
        .filter(landmark => landmark && landmark.id && landmark.name)
        .slice(0, 5); // Show only recent 5
      
      setRecentLandmarks(recentScans);
      console.log('Loaded recent scans:', recentScans.length);
    } catch (error) {
      console.error('Error loading data:', error);
      setRecentLandmarks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleScanPress = async () => {
    if (!usageStats) return;

    if (usageStats.isPremium || usageStats.remaining > 0) {
      router.push('/camera');
    } else {
      router.push('/paywall?source=scan_limit');
    }
  };

  const handleExplorePress = () => {
    // Navigate to explore/map screen
    // For now, redirect to camera as placeholder
    router.push('/camera');
  };

  const handleViewAllLandmarks = () => {
    router.push('/passport');
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
        tags={['Recent Scan']}
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
        title="Discover the World"
        subtitle="Good morning! ✈️"
        titleStyle={{ fontSize: 28, lineHeight: 34 }}
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
            title="Scan Landmark"
            subtitle="Discover the history behind any landmark"
            icon="camera.fill"
            iconColor={colors.primary}
            onPress={handleScanPress}
            badge={usageStats?.remaining.toString()}
          />
          
          <ActionCard
            title="Explore Map"
            subtitle="Find interesting places near you"
            icon="map.fill"
            iconColor={colors.sunsetOrange}
            onPress={handleExplorePress}
          />
        </View>

        {/* Recent Landmarks Section - Always show title */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recent Discoveries
            </ThemedText>
            {recentLandmarks.length > 0 && (
              <CustomButton
                title="View All"
                onPress={handleViewAllLandmarks}
                variant="ghost"
                size="small"
              />
            )}
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
                No recent discoveries
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
    ...Typography.h2,
  },
  recentLandmarksList: {
    paddingLeft: Spacing.xs,
  },
  recentLandmarkCard: {
    width: 160,
  },

  // Empty State
  emptyMessage: {
    ...Typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: Spacing.lg,
  },
});