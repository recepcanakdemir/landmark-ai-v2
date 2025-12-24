import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Dimensions, Alert, FlatList, ActivityIndicator, Text, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import MapView, { Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, BorderRadius, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LandmarkAnalysis, NearbyPlace } from '@/types';
import { analyzeImage } from '@/services/aiService';
import { saveLandmark, removeLandmark, isLandmarkSaved, addToScanHistory, saveCollection, removeCollection, isCollectionSaved } from '@/services/storageService';
import { enrichNearbyPlaces, formatDistance, getPlaceTypeIcon } from '@/services/placesService';
import { ScanningAnimation } from '@/components/ScanningAnimation';

const { height: screenHeight } = Dimensions.get('window');

// Robust Supabase URL helper with fallback chain
const getSupabaseUrl = () => {
  const url = Constants.expoConfig?.extra?.supabaseUrl || 
              process.env.EXPO_PUBLIC_SUPABASE_URL || 
              'https://your-project.supabase.co'; // Replace with your actual URL
  
  console.log('Supabase URL resolved to:', url);
  return url;
};

// Robust Supabase key helper with fallback chain  
const getSupabaseKey = () => {
  const key = Constants.expoConfig?.extra?.supabaseAnonKey || 
              process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
              '';
  
  console.log('Supabase key available:', key ? 'YES' : 'NO');
  return key;
};

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  
  const { imageUri, savedLandmark, source = 'new', locationCoords, scanType = 'landmark' } = useLocalSearchParams<{ 
    imageUri?: string; 
    savedLandmark?: string;
    source?: 'new' | 'saved' | 'recent';
    locationCoords?: string;
    scanType?: 'landmark' | 'museum';
  }>();

  const [landmark, setLandmark] = useState<LandmarkAnalysis | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingNearby, setEnrichingNearby] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  useEffect(() => {
    loadLandmarkData();
  }, [imageUri, savedLandmark]);

  useEffect(() => {
    if (landmark) checkSavedStatus();
  }, [landmark]);

  const loadLandmarkData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Kaydedilmiş veri varsa onu kullan
      if (savedLandmark) {
        const data = JSON.parse(savedLandmark);
        setLandmark(data);
        if (data.nearbyMustSeePlaces?.length > 0) {
          setNearbyPlaces(data.nearbyMustSeePlaces);
        } else if (data.nearbySearchQueries) {
          // Kayıtlı ama yerler yüklenmemişse yükle
          enrichNearbyPlacesIfAvailable(data);
        }
        return;
      }

      // 2. Yoksa ve resim varsa analiz et
      if (imageUri) {
        console.log('Starting Analysis...');
        
        // Parse location coordinates if provided
        let parsedLocation: { lat: number; lng: number } | undefined;
        if (locationCoords) {
          try {
            parsedLocation = JSON.parse(locationCoords);
            console.log('Using location context for AI analysis:', parsedLocation);
          } catch (error) {
            console.log('Failed to parse location coordinates:', error);
          }
        }
        
        const analysis = await analyzeImage(imageUri, parsedLocation, scanType as 'landmark' | 'museum');
        setLandmark(analysis);
        
        // Add to scan history (regardless of whether user saves to passport)
        try {
          await addToScanHistory(analysis);
          console.log('Added to scan history:', analysis.name);
        } catch (error) {
          console.error('Failed to add to scan history:', error);
          // Don't fail the analysis if scan history fails
        }
        
        enrichNearbyPlacesIfAvailable(analysis);
      }
    } catch (err) {
      console.error(err);
      setError('Could not identify landmark.');
    } finally {
      setLoading(false);
    }
  };

  const enrichNearbyPlacesIfAvailable = async (data: LandmarkAnalysis) => {
    // Skip nearby places entirely for museum pieces
    if (data.scanType === 'museum') {
      console.log('Skipping nearby places for museum item');
      return;
    }

    // Don't fetch new nearby places if we already have them (saved/recent landmarks)
    if (data.nearbyMustSeePlaces?.length > 0) {
      setNearbyPlaces(data.nearbyMustSeePlaces);
      return;
    }

    // Only fetch new nearby places for new scans
    if (source !== 'new' || !data.nearbySearchQueries?.length) return;
    
    try {
      setEnrichingNearby(true);
      const places = await enrichNearbyPlaces(data.nearbySearchQueries, data.coordinates);
      if (places.length > 0) {
        setNearbyPlaces(places);
        // Update landmark with nearby places for future saves
        setLandmark(prev => prev ? { ...prev, nearbyMustSeePlaces: places } : null);
      }
    } catch (e) {
      console.log('Nearby enrichment failed silently');
    } finally {
      setEnrichingNearby(false);
    }
  };


  const checkSavedStatus = async () => {
    if (!landmark) return;
    
    // Check saved status based on scan type
    if (landmark.scanType === 'museum') {
      const saved = await isCollectionSaved(landmark.id);
      setIsSaved(saved);
    } else {
      const saved = await isLandmarkSaved(landmark.id);
      setIsSaved(saved);
    }
  };

  const handleSave = async () => {
    if (!landmark) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (landmark.scanType === 'museum') {
      // Museum items go to Collections
      if (isSaved) {
        await removeCollection(landmark.id);
        setIsSaved(false);
      } else {
        await saveCollection(landmark);
        setIsSaved(true);
        Alert.alert('Saved', 'Added to your Collections.');
      }
    } else {
      // Landmarks go to Passport
      if (isSaved) {
        await removeLandmark(landmark.id);
        setIsSaved(false);
      } else {
        await saveLandmark(landmark);
        setIsSaved(true);
        Alert.alert('Saved', 'Added to your Passport.');
      }
    }
  };

  const openMapsForPlace = async (place: NearbyPlace) => {
    const { latitude, longitude } = place.coordinates;
    const label = encodeURIComponent(place.name);
    
    try {
      let nativeUrl = '';
      
      if (Platform.OS === 'ios') {
        // Use proper iOS Maps URL scheme
        nativeUrl = `maps:?ll=${latitude},${longitude}&q=${label}`;
      } else {
        // Android Google Maps
        nativeUrl = `geo:0,0?q=${latitude},${longitude}(${label})`;
      }

      // Try to open native maps app
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      
      if (canOpenNative) {
        await Linking.openURL(nativeUrl);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        // Fallback to Google Maps in browser
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${place.name}`;
        await Linking.openURL(googleMapsUrl);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      // Final fallback to basic Google Maps
      const fallbackUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      Linking.openURL(fallbackUrl).catch(err => {
        console.error('Failed to open fallback URL:', err);
        Alert.alert('Error', 'Could not open maps application');
      });
    }
  };

  const formatPlaceType = (types: string[]): string => {
    // Priority order for type matching
    const typeMap = [
      { keywords: ['museum'], label: 'Museum' },
      { keywords: ['church', 'synagogue', 'mosque', 'temple', 'religious'], label: 'Religious Site' },
      { keywords: ['art_gallery', 'gallery'], label: 'Art Gallery' },
      { keywords: ['restaurant', 'meal_takeaway', 'meal_delivery'], label: 'Restaurant' },
      { keywords: ['cafe', 'coffee'], label: 'Cafe' },
      { keywords: ['park', 'campground'], label: 'Park' },
      { keywords: ['tourist_attraction', 'point_of_interest'], label: 'Attraction' },
      { keywords: ['shopping_mall', 'store'], label: 'Shopping' },
      { keywords: ['lodging', 'hotel'], label: 'Hotel' },
      { keywords: ['hospital', 'health'], label: 'Healthcare' },
      { keywords: ['school', 'university'], label: 'Educational' },
      { keywords: ['bank', 'finance'], label: 'Financial' }
    ];

    for (const mapping of typeMap) {
      if (types.some(type => mapping.keywords.some(keyword => type.includes(keyword)))) {
        return mapping.label;
      }
    }

    return 'Point of Interest';
  };

  const renderInfoRow = (icon: string, label: string, value?: string | number) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <View style={[styles.infoIconBox, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name={icon as any} size={18} color={colors.textPrimary} />
        </View>
        <View style={styles.infoTextContainer}>
          <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</ThemedText>
          <ThemedText style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>
            {value}
          </ThemedText>
        </View>
      </View>
    );
  };


  const renderNearbyCard = ({ item }: { item: NearbyPlace }) => {
    // Build URL safely using new helpers
    const photoRef = item.photos?.[0]?.photoReference;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseKey();
    
    const imageUrl = photoRef 
      ? `${supabaseUrl}/functions/v1/places-proxy?endpoint=photo&query=${photoRef}`
      : null;

    console.log('Nearby place image URL:', imageUrl);

    return (
      <Pressable 
        style={[styles.nearbyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => openMapsForPlace(item)}
        android_ripple={{ color: colors.primary + '20' }}
      >
        <Image
          source={imageUrl ? { 
            uri: imageUrl, 
            headers: { 
              Authorization: `Bearer ${supabaseKey}`,
              Accept: 'image/*'
            } 
          } : undefined}
          style={styles.nearbyImage}
          contentFit="cover"
          transition={300}
          placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
          onError={(error) => {
            console.log('Image Load Error for place:', item.name);
            console.log('Full URL attempted:', imageUrl);
            console.log('Error details:', error);
          }}
        />
        <View style={styles.nearbyContent}>
          {/* Place Type Badge */}
          <View style={[styles.placeTypeBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <ThemedText style={[styles.placeTypeText, { color: colors.textSecondary }]}>
              {formatPlaceType(item.types)}
            </ThemedText>
          </View>
          
          <ThemedText numberOfLines={1} style={[styles.nearbyTitle, { color: colors.textPrimary }]}>
            {item.name}
          </ThemedText>
          
          <View style={styles.nearbyMeta}>
            <IconSymbol name="star.fill" size={12} color="#FFB800" />
            <ThemedText style={[styles.nearbyMetaText, { color: colors.textSecondary }]}>
              {item.rating || '-'}
            </ThemedText>
            {item.distance && (
              <>
                <Text style={{ color: colors.textSecondary }}>•</Text>
                <ThemedText style={[styles.nearbyMetaText, { color: colors.textSecondary }]}>
                  {formatDistance(item.distance)}
                </ThemedText>
              </>
            )}
          </View>
          
          {/* Maps indicator */}
          <View style={styles.mapsIndicator}>
            <IconSymbol name="map.fill" size={10} color={colors.primary} />
            <ThemedText style={[styles.mapsIndicatorText, { color: colors.primary }]}>
              Tap to view in Maps
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return imageUri ? (
      <ScanningAnimation imageUri={imageUri} scanType={scanType} />
    ) : (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Identifying Landmark...</Text>
        </View>
      </View>
    );
  }

  if (error || !landmark) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.textSecondary} />
          <ThemedText style={{ marginTop: 16 }}>{error || 'Something went wrong'}</ThemedText>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
            <ThemedText style={{ color: colors.primary }}>Go Back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      
      {/* Header Actions - Fixed */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable 
            onPress={() => router.push({
              pathname: '/chat',
              params: { landmarkId: landmark.id, landmarkName: landmark.name, landmarkData: JSON.stringify(landmark) }
            })} 
            style={styles.headerChatButton}
          >
            <ThemedText style={styles.headerButtonText}>Chat with AI</ThemedText>
            <IconSymbol name="message.fill" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <IconSymbol name="xmark" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>


      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Scanned Photo - Full Width */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri || landmark.imageUrl }} style={styles.image} contentFit="cover" />
          {/* Confidence Badge Overlay */}
          {landmark.accuracy && (
            <View style={styles.imageConfidenceBadge}>
              <ThemedText style={styles.imageConfidenceText}>
                {Math.round(landmark.accuracy * 100)}%
              </ThemedText>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {/* Header with confidence badge */}
        <View style={styles.contentHeader}>
          <View style={styles.titleContainer}>
            <ThemedText style={[styles.title, { color: colors.textPrimary }]}>{landmark.name}</ThemedText>
          </View>
          <View style={styles.locationRow}>
            <IconSymbol name="mappin.and.ellipse" size={14} color={colors.textSecondary} />
            <ThemedText style={[styles.locationText, { color: colors.textSecondary }]}>
              {landmark.scanType === 'museum' 
                ? // Museum items: Show "Museum Name, City, Country" format
                  landmark.location && landmark.city && landmark.country
                    ? `${landmark.location}, ${landmark.city}, ${landmark.country}`
                    : landmark.location && landmark.city
                      ? `${landmark.location}, ${landmark.city}`
                      : landmark.city && landmark.country
                        ? `${landmark.city}, ${landmark.country}`
                        : landmark.location || landmark.city || landmark.country || 'Location not specified'
                : // Landmark items: Keep existing format
                  landmark.city && landmark.country 
                    ? `${landmark.city}, ${landmark.country}`
                    : landmark.location || landmark.country || 'Location not specified'
              }
            </ThemedText>
          </View>
        </View>

        {/* Quick Facts Grid */}
        {(landmark.yearBuilt || landmark.architecturalStyle || landmark.architect || landmark.artist || landmark.medium || landmark.artMovement || landmark.artStyle || landmark.historicalEra) && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Facts</ThemedText>
            <View style={styles.factsGrid}>
              {landmark.scanType === 'museum' ? (
                <>
                  {renderInfoRow('person.fill', 'Artist', landmark.artist)}
                  {renderInfoRow('calendar', 'Era', landmark.historicalEra)}
                  {renderInfoRow('paintbrush.fill', 'Style', landmark.artStyle || landmark.artMovement)}
                  {renderInfoRow('hammer.fill', 'Medium', landmark.medium)}
                </>
              ) : (
                <>
                  {renderInfoRow('calendar', 'Built', landmark.yearBuilt)}
                  {renderInfoRow('person.fill', 'Architect', landmark.architect)}
                  {renderInfoRow('building.columns.fill', 'Architecture', landmark.architecturalStyle)}
                </>
              )}
            </View>
          </View>
        )}

        {/* Description */}
        {landmark.description && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              {landmark.description}
            </ThemedText>
          </View>
        )}

        {/* Historical Significance */}
        {landmark.history && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Historical Significance</ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              {landmark.history}
            </ThemedText>
          </View>
        )}

        {/* Cultural Significance */}
        {landmark.culturalSignificance && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {landmark.scanType === 'museum' ? 'Artistic Significance' : 'Cultural Significance'}
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              {landmark.culturalSignificance}
            </ThemedText>
          </View>
        )}

        {/* Art Guide sections */}
        {landmark.scanType === 'museum' && (
          <>
            {/* Estimated Value */}
            {landmark.estimatedValue && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estimated Value</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.estimatedValue}
                </ThemedText>
              </View>
            )}

            {/* Art Style Analysis */}
            {landmark.artStyle && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Art Style</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.artStyle}
                </ThemedText>
              </View>
            )}

            {/* Historical Era Context */}
            {landmark.historicalEra && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Historical Era</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.historicalEra}
                </ThemedText>
              </View>
            )}

            {/* Expert Explanation */}
            {landmark.museumExplanation && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Expert Analysis</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.museumExplanation}
                </ThemedText>
              </View>
            )}

            {/* Historical Context */}
            {landmark.historicalContext && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Historical Context</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.historicalContext}
                </ThemedText>
              </View>
            )}

            {/* Technique */}
            {landmark.technique && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Technique</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.technique}
                </ThemedText>
              </View>
            )}

            {/* Dimensions */}
            {landmark.dimensions && (
              <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dimensions</ThemedText>
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                  {landmark.dimensions}
                </ThemedText>
              </View>
            )}
          </>
        )}

        {/* Fun Facts */}
        {landmark.funFacts && landmark.funFacts.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Did You Know?</ThemedText>
            {landmark.funFacts.map((fact, i) => (
              <View key={i} style={styles.factRow}>
                <View style={[styles.factBullet, { backgroundColor: colors.primary }]} />
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary, flex: 1 }]}>
                  {fact}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* FAQ Section */}
        {landmark.faq && landmark.faq.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Frequently Asked Questions</ThemedText>
            {landmark.faq.map((faqItem, i) => (
              <View key={i} style={[styles.faqItem, { backgroundColor: colors.backgroundSecondary }]}>
                <Pressable
                  style={styles.faqQuestion}
                  onPress={() => setExpandedFAQ(expandedFAQ === i ? null : i)}
                >
                  <ThemedText style={[styles.faqQuestionText, { color: colors.textPrimary }]}>
                    {faqItem.question}
                  </ThemedText>
                  <IconSymbol 
                    name={expandedFAQ === i ? "chevron.up" : "chevron.down"} 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                </Pressable>
                {expandedFAQ === i && (
                  <View style={styles.faqAnswer}>
                    <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
                      {faqItem.answer}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Visiting Tips */}
        {landmark.visitingTips && landmark.visitingTips.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Visiting Tips</ThemedText>
            {landmark.visitingTips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <IconSymbol name="lightbulb.fill" size={14} color={colors.warning} />
                <ThemedText style={[styles.bodyText, { color: colors.textSecondary, flex: 1, marginLeft: 8 }]}>
                  {tip}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Nearby Places - Only for landmarks, not museum pieces */}
        {landmark.scanType !== 'museum' && (nearbyPlaces.length > 0 || enrichingNearby) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithToggle}>
              <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>Nearby Gems</ThemedText>
              {nearbyPlaces.length > 0 && (
                <Pressable 
                  style={[styles.viewToggleButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                >
                  <ThemedText style={[styles.toggleButtonText, { color: colors.textSecondary }]}>
                    {viewMode === 'list' ? 'Open Map' : 'Show List'}
                  </ThemedText>
                  <IconSymbol 
                    name={viewMode === 'list' ? "map.fill" : "list.bullet"} 
                    size={20} 
                    color={colors.primary} 
                  />
                </Pressable>
              )}
            </View>
            {enrichingNearby && nearbyPlaces.length === 0 ? (
              <View style={styles.loadingNearby}>
                <ActivityIndicator color={colors.primary} />
                <ThemedText style={[styles.loadingNearbyText, { color: colors.textSecondary }]}>
                  Finding nearby places...
                </ThemedText>
              </View>
            ) : nearbyPlaces.length > 0 ? (
              viewMode === 'list' ? (
                <FlatList
                  data={nearbyPlaces}
                  renderItem={renderNearbyCard}
                  keyExtractor={item => item.placeId}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 16, paddingRight: 20 }}
                />
              ) : (
                <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
                  <MapView
                    style={styles.mapView}
                    initialRegion={{
                      latitude: landmark?.coordinates?.latitude || 0,
                      longitude: landmark?.coordinates?.longitude || 0,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }}
                    showsUserLocation={true}
                  >
                    {/* Main Landmark Marker */}
                    {landmark?.coordinates && (
                      <Marker
                        coordinate={{
                          latitude: landmark.coordinates.latitude,
                          longitude: landmark.coordinates.longitude,
                        }}
                        title={landmark.name}
                        description="Main Landmark"
                        pinColor="red"
                      />
                    )}
                    
                    {/* Nearby Places Markers */}
                    {nearbyPlaces.map((place) => (
                      <Marker
                        key={place.placeId}
                        coordinate={{
                          latitude: place.coordinates.latitude,
                          longitude: place.coordinates.longitude,
                        }}
                        title={place.name}
                        description={place.rating ? `⭐ ${place.rating}` : 'Nearby place'}
                        pinColor="#3B82F6"
                        onCalloutPress={() => openMapsForPlace(place)}
                      />
                    ))}
                  </MapView>
                </View>
              )
            ) : null}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Fixed */}
      <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
        <Pressable 
          style={[styles.circularButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => {
            // Navigate to camera with appropriate mode based on current scan type
            if (landmark?.scanType === 'museum') {
              router.push({
                pathname: '/camera',
                params: { mode: 'museum' }
              });
            } else {
              router.push('/camera');
            }
          }}
        >
          <IconSymbol name="camera.fill" size={24} color={colors.textPrimary} />
        </Pressable>
        
        <Pressable 
          style={[styles.bottomButton, styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <IconSymbol name={isSaved ? "book.fill" : "book"} size={20} color="#FFFFFF" />
          <ThemedText style={[styles.bottomButtonText, { color: '#FFFFFF' }]}>
            {landmark.scanType === 'museum' 
              ? (source === 'saved' || isSaved ? 'Remove from Collections' : 'Add to Collections')
              : (source === 'saved' || isSaved ? 'Remove from My Passport' : 'Add to My Passport')
            }
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: '600' },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    zIndex: 10,
    backgroundColor: 'transparent'
  },
  headerButton: {
    width: 44, 
    height: 44, 
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center', 
    alignItems: 'center',
    ...Shadows.medium
  },
  headerChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: 8,
    ...Shadows.medium
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
  },

  // Scanned Photo Section (30% of screen)
  imageContainer: { 
    height: screenHeight * 0.3, 
    width: '100%',
    position: 'relative',
  },
  image: { 
    width: '100%', 
    height: '100%' 
  },
  imageConfidenceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageConfidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Content Section  
  contentContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  
  // Header with confidence badge
  contentHeader: { marginBottom: Spacing.xl },
  titleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: Spacing.sm 
  },
  title: { 
    ...Typography.h1, 
    flex: 1, 
    marginRight: Spacing.md 
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    ...Shadows.small
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.sm 
  },
  locationText: { 
    ...Typography.body,
    fontStyle: 'italic' 
  },

  // Content sections
  section: { marginBottom: Spacing.xl },
  sectionTitle: { 
    ...Typography.h3,
    marginBottom: Spacing.lg 
  },
  sectionHeaderWithToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    ...Shadows.small,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyText: { 
    ...Typography.body,
    lineHeight: 26,
    letterSpacing: 0.2 
  },
  
  // Quick Facts Grid
  factsGrid: { 
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: Spacing.md,
    minWidth: '45%', // Ensure proper wrapping
    maxWidth: '100%', // Prevent overflow
    marginBottom: Spacing.sm,
    flex: 1
  },
  infoIconBox: { 
    width: 40, 
    height: 40, 
    borderRadius: BorderRadius.md,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  infoTextContainer: {
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  infoLabel: { 
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
    marginBottom: 2
  },
  infoValue: { 
    fontSize: 16,
    fontWeight: '600'
  },

  // Fun Facts
  factRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm
  },
  factBullet: { 
    width: 6, 
    height: 6, 
    borderRadius: 3,
    marginTop: 10
  },

  // FAQ Section
  faqItem: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Visiting Tips  
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md
  },

  // Nearby Places
  loadingNearby: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  loadingNearbyText: {
    ...Typography.body
  },
  nearbyCard: { 
    width: 240, 
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  nearbyImage: { 
    width: '100%', 
    height: 130, 
    backgroundColor: '#f5f5f5' 
  },
  nearbyContent: { 
    padding: Spacing.lg 
  },
  placeTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  placeTypeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nearbyTitle: { 
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    letterSpacing: 0.1
  },
  nearbyMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.sm 
  },
  nearbyMetaText: { 
    fontSize: 13,
    fontWeight: '500'
  },
  mapsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  mapsIndicatorText: {
    fontSize: 10,
    fontWeight: '600'
  },

  // Map View Styles
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  mapView: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    ...Shadows.large,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  circularButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  saveButton: {
    // Primary button styling handled via backgroundColor prop
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '600',
  }
});