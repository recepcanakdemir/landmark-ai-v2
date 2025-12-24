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
import { getSavedCollections, removeCollection } from '@/services/storageService';

export default function CollectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [collections, setCollections] = useState<LandmarkAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load collections on initial mount
  useEffect(() => {
    loadCollections();
  }, []);

  // Reload when screen comes into focus (to catch newly saved collections)
  useFocusEffect(
    useCallback(() => {
      loadCollections();
    }, [])
  );

  const loadCollections = async () => {
    try {
      setLoading(true);
      const savedCollections = await getSavedCollections();
      
      // Filter out any invalid collections and only include museum items
      const validCollections = savedCollections.filter(item => 
        item && item.id && item.name && item.scanType === 'museum'
      );
      
      setCollections(validCollections);
      console.log('Loaded saved collections:', validCollections.length);
    } catch (error) {
      console.error('Error loading collections:', error);
      Alert.alert('Error', 'Failed to load your collections');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCollections();
    setRefreshing(false);
  };

  const handleCollectionPress = (collection: LandmarkAnalysis) => {
    // Navigate to result screen with saved collection data
    router.push({
      pathname: '/result',
      params: { 
        landmarkId: collection.id,
        imageUri: collection.imageUrl || '',
        savedLandmark: JSON.stringify(collection),
        source: 'saved'
      }
    });
  };

  const handleMuseumScanPress = () => {
    router.push({
      pathname: '/camera',
      params: { mode: 'museum' }
    });
  };

  const handleDeleteCollection = (collection: LandmarkAnalysis) => {
    Alert.alert(
      "Remove from Collections",
      `Remove "${collection.name}" from your collections?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => deleteCollection(collection.id, collection.name)
        }
      ]
    );
  };

  const deleteCollection = async (collectionId: string, collectionName: string) => {
    try {
      console.log('Deleting collection:', collectionName);
      await removeCollection(collectionId);
      
      // Update local state immediately
      setCollections(prev => prev.filter(item => item.id !== collectionId));
      
      // Show success message
      Alert.alert('Removed', `"${collectionName}" has been removed from your collections.`);
    } catch (error) {
      console.error('Error deleting collection:', error);
      Alert.alert('Error', 'Failed to remove item. Please try again.');
    }
  };

  const renderCollectionCard = ({ item, index }: { item: LandmarkAnalysis; index: number }) => {
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
          tags={['Museum', 'Saved']}
          onPress={() => handleCollectionPress(item)}
          onDelete={() => handleDeleteCollection(item)}
          onFavorite={() => handleCollectionPress(item)} // For now, just navigate
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
          name="paintbrush.fill" 
          size={64} 
          color={colors.sunsetOrange} 
        />
        <ThemedText style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Your Collections are Empty
        </ThemedText>
        <ThemedText style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          Start scanning artworks and museum pieces to build your personal art collection
        </ThemedText>
        <CustomButton
          title="Museum Scanner"
          onPress={handleMuseumScanPress}
          variant="primary"
          size="large"
          icon="paintbrush.fill"
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
        title="My Collections"
        subtitle={collections.length > 0 
          ? `${collections.length} museum piece${collections.length !== 1 ? 's' : ''} discovered`
          : 'Your art & museum discoveries'
        }
        alignment="left"
      />
      
      {/* Collections Grid */}
      <FlatList
        data={collections}
        renderItem={renderCollectionCard}
        keyExtractor={(item, index) => item?.id || `collection-${index}`}
        style={styles.listContainer}
        contentContainerStyle={collections.length > 0 ? styles.listContent : styles.emptyListContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={collections.length > 0 ? styles.row : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.sunsetOrange}
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