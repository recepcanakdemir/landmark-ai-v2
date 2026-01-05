import { StyleSheet, FlatList, Alert, RefreshControl, View } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LandmarkCard } from '@/components/LandmarkCard';
import { CustomButton } from '@/components/CustomButton';
import { TabHeader } from '@/components/TabHeader';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LandmarkAnalysis } from '@/types';
import { getSavedLandmarks, removeLandmark } from '@/services/storageService';
import { useTranslation } from 'react-i18next';


export default function PassportScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const [landmarks, setLandmarks] = useState<LandmarkAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load landmarks on initial mount
  useEffect(() => {
    loadLandmarks();
  }, []);

  // Reload when screen comes into focus (to catch newly saved landmarks)
  useFocusEffect(
    useCallback(() => {
      loadLandmarks();
    }, [])
  );

  const loadLandmarks = async () => {
    try {
      setLoading(true);
      const savedLandmarks = await getSavedLandmarks();
      
      // Filter out any invalid landmarks
      const validLandmarks = savedLandmarks.filter(landmark => 
        landmark && landmark.id && landmark.name
      );
      
      setLandmarks(validLandmarks);
      console.log('Loaded saved landmarks:', validLandmarks.length);
    } catch (error) {
      console.error('Error loading landmarks:', error);
      Alert.alert(t('common.error'), t('passport.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLandmarks();
    setRefreshing(false);
  };

  const handleLandmarkPress = (landmark: LandmarkAnalysis) => {
    // Navigate to result screen with saved landmark data
    router.push({
      pathname: '/result',
      params: { 
        landmarkId: landmark.id,
        savedLandmark: JSON.stringify(landmark),
        source: 'saved'
      }
    });
  };

  const handleScanPress = () => {
    router.push('/camera');
  };

  const handleDeleteLandmark = (landmark: LandmarkAnalysis) => {
    Alert.alert(
      t('passport.removeLandmark'),
      t('passport.removeConfirm', { landmarkName: landmark.name }),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('common.remove'), 
          style: "destructive", 
          onPress: () => deleteLandmark(landmark.id, landmark.name)
        }
      ]
    );
  };

  const deleteLandmark = async (landmarkId: string, landmarkName: string) => {
    try {
      console.log('Deleting landmark:', landmarkName);
      await removeLandmark(landmarkId);
      
      // Update local state immediately
      setLandmarks(prev => prev.filter(landmark => landmark.id !== landmarkId));
      
      // Optional: Show success message
      Alert.alert(t('passport.removed'), t('passport.removedSuccess', { landmarkName }));
    } catch (error) {
      console.error('Error deleting landmark:', error);
      Alert.alert(t('common.error'), t('passport.removeError'));
    }
  };

  const renderLandmarkCard = ({ item, index }: { item: LandmarkAnalysis; index: number }) => {
    // Safety check to prevent rendering invalid items
    if (!item || !item.id || !item.name) {
      return null;
    }

    return (
      <View style={styles.cardWrapper}>
        <LandmarkCard
          id={item.id}
          name={item.name}
          location={item.location || item.country || 'Unknown location'}
          imageUrl={item.imageUrl}
          dateAdded={new Date(item.analyzedAt)}
          confidence={item.accuracy ? Math.round(item.accuracy * 100) : undefined}
          tags={item.scanType === 'museum' ? ['Museum', 'Saved'] : ['Landmark', 'Saved']}
          onPress={() => handleLandmarkPress(item)}
          onDelete={() => handleDeleteLandmark(item)}
          onFavorite={() => handleLandmarkPress(item)} // For now, just navigate
          isFavorite={true}
          size="small"
          style={styles.gridCard}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <IconSymbol 
          name="building.columns.fill" 
          size={64} 
          color={colors.primary} 
        />
        <ThemedText style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {t('passport.title')}
        </ThemedText>
        <ThemedText style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          {t('passport.emptyStateDesc')}
        </ThemedText>
        <CustomButton
          title={t('passport.scanLandmark')}
          onPress={handleScanPress}
          variant="primary"
          size="large"
          icon="camera.fill"
          fullWidth={true}
        />
      </View>
    </View>
  );


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <TabHeader
        title={t('passport.title')}
        subtitle={landmarks.length > 0 
          ? `${landmarks.length} landmark${landmarks.length !== 1 ? 's' : ''} discovered`
          : t('passport.subtitle')
        }
        alignment="left"
      />
      
      {/* Landmarks Grid */}
      <FlatList
        data={landmarks}
        renderItem={renderLandmarkCard}
        keyExtractor={(item, index) => item?.id || `landmark-${index}`}
        style={styles.listContainer}
        contentContainerStyle={landmarks.length > 0 ? styles.listContent : styles.emptyListContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={landmarks.length > 0 ? styles.row : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // LIST
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    paddingBottom: 100,
    flex: 1,
  },
  
  // GRID LAYOUT
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: Spacing.md,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%', // Ensures proper spacing between cards
  },
  gridCard: {
    width: '100%',
  },

  // EMPTY STATE
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 280,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginTop: 24,
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyDescription: {
    fontSize: 16,
    fontWeight: '400' as const,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 22,
  },
});