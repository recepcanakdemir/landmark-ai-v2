import { supabase } from './supabase';
import { NearbyPlace } from '@/types';

/**
 * Google Places API service for verifying AI-suggested nearby places
 */

interface PlacesSearchRequest {
  endpoint: 'textsearch' | 'findplacefromtext' | 'details' | 'photo';
  query?: string;
  locationBias?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  placeId?: string;
  fields?: string;
}

interface PlacesSearchResponse {
  status: string;
  error_message?: string;
  results?: any[];
  candidates?: any[];
  result?: any;
}

/**
 * Verify AI-suggested nearby places using Google Places API
 * Takes AI-generated search queries and returns real verified places
 */
export async function enrichNearbyPlaces(
  queries: string[], 
  landmarkCoords?: { latitude: number; longitude: number }
): Promise<NearbyPlace[]> {
  try {
    console.log('Enriching nearby places for queries:', queries);
    
    const verifiedPlaces: NearbyPlace[] = [];
    const seenPlaceIds = new Set<string>(); // Track place IDs to prevent duplicates
    
    // Process each AI-suggested query
    for (const query of queries) {
      try {
        console.log('Searching for:', query);
        
        // Build search request
        const searchRequest: PlacesSearchRequest = {
          endpoint: 'textsearch',
          query: query.trim(),
          ...(landmarkCoords && {
            locationBias: {
              lat: landmarkCoords.latitude,
              lng: landmarkCoords.longitude,
              radius: 5000 // 5km radius
            }
          })
        };
        
        // Call the places-proxy Edge Function
        const { data, error } = await supabase.functions.invoke('places-proxy', {
          body: searchRequest
        });
        
        if (error) {
          console.warn(`Places search failed for "${query}":`, error);
          continue;
        }
        
        if (!data || data.status !== 'OK') {
          console.warn(`Places API returned non-OK status for "${query}":`, data?.status);
          continue;
        }
        
        // Process search results
        const results = data.results || [];
        console.log(`Found ${results.length} results for "${query}"`);
        
        // Take the best result (first one, as Google ranks them)
        if (results.length > 0) {
          const place = results[0];
          
          // Check if we've already seen this place ID (prevent duplicates)
          if (seenPlaceIds.has(place.place_id)) {
            console.log(`Skipping duplicate place: ${place.name} (${place.place_id})`);
            continue;
          }
          
          // Convert to our NearbyPlace format
          const nearbyPlace: NearbyPlace = {
            placeId: place.place_id,
            name: place.name,
            address: place.formatted_address || place.vicinity || 'Address not available',
            rating: place.rating,
            priceLevel: place.price_level,
            types: place.types || [],
            photos: place.photos ? place.photos.map((photo: any) => ({
              photoReference: photo.photo_reference,
              width: photo.width,
              height: photo.height
            })) : [],
            coordinates: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng
            },
            openingHours: place.opening_hours ? {
              openNow: place.opening_hours.open_now,
              periods: place.opening_hours.periods
            } : undefined
          };
          
          // Calculate distance if landmark coordinates provided
          if (landmarkCoords) {
            nearbyPlace.distance = calculateDistance(
              landmarkCoords.latitude,
              landmarkCoords.longitude,
              nearbyPlace.coordinates.latitude,
              nearbyPlace.coordinates.longitude
            );
          }
          
          // Mark this place ID as seen and add to results
          seenPlaceIds.add(place.place_id);
          verifiedPlaces.push(nearbyPlace);
          console.log(`Added verified place: ${nearbyPlace.name} (${place.place_id})`);
        }
        
        // Add small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (queryError) {
        console.warn(`Error processing query "${query}":`, queryError);
        continue;
      }
    }
    
    // Sort by distance if coordinates available, otherwise by rating
    verifiedPlaces.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (a.rating !== undefined && b.rating !== undefined) {
        return b.rating - a.rating;
      }
      return 0;
    });
    
    console.log(`Successfully verified ${verifiedPlaces.length} nearby places`);
    return verifiedPlaces;
    
  } catch (error) {
    console.error('Error enriching nearby places:', error);
    return [];
  }
}

/**
 * Get photo URL for a nearby place using its photo reference
 */
export async function getPlacePhotoUrl(photoReference: string): Promise<string | null> {
  try {
    console.log('Getting photo URL for reference:', photoReference.substring(0, 20) + '...');
    
    // The places-proxy Edge Function handles photo proxying
    const { data: photoUrl } = await supabase.functions.invoke('places-proxy', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // For photos, we'll construct the URL to call our proxy
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/functions/v1/places-proxy?endpoint=photo&query=${photoReference}`;
    
  } catch (error) {
    console.error('Error getting place photo URL:', error);
    return null;
  }
}

/**
 * Get photos for a landmark from Google Places API
 * Searches for the landmark and returns photo references
 */
export async function getLandmarkPhotos(
  landmarkName: string, 
  city?: string
): Promise<string[]> {
  try {
    console.log('Getting photos for landmark:', landmarkName, 'in', city);
    
    // Build search query - prioritize exact landmark name
    const searchQuery = city 
      ? `${landmarkName} ${city}`
      : landmarkName;
    
    const searchRequest: PlacesSearchRequest = {
      endpoint: 'textsearch',
      query: searchQuery.trim()
    };
    
    const { data, error } = await supabase.functions.invoke('places-proxy', {
      body: searchRequest
    });
    
    if (error) {
      console.warn('Landmark photo search failed:', error);
      return [];
    }
    
    if (!data || data.status !== 'OK') {
      console.warn('Landmark photo search returned non-OK status:', data?.status);
      return [];
    }
    
    const results = data.results || [];
    console.log(`Found ${results.length} results for landmark "${searchQuery}"`);
    
    // Look for the best match (usually the first result)
    if (results.length > 0) {
      const landmark = results[0];
      
      if (landmark.photos && landmark.photos.length > 0) {
        // Extract up to 8 photo references
        const photoReferences = landmark.photos
          .slice(0, 8)
          .map((photo: any) => photo.photo_reference);
        
        console.log(`Found ${photoReferences.length} photos for ${landmarkName}`);
        return photoReferences;
      }
    }
    
    console.log('No photos found for landmark:', landmarkName);
    return [];
    
  } catch (error) {
    console.error('Error getting landmark photos:', error);
    return [];
  }
}

/**
 * Get detailed information for a specific place
 */
export async function getPlaceDetails(placeId: string): Promise<any | null> {
  try {
    console.log('Getting details for place:', placeId);
    
    const detailsRequest: PlacesSearchRequest = {
      endpoint: 'details',
      placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos'
    };
    
    const { data, error } = await supabase.functions.invoke('places-proxy', {
      body: detailsRequest
    });
    
    if (error) {
      console.error('Place details request failed:', error);
      return null;
    }
    
    if (!data || data.status !== 'OK') {
      console.warn('Place details API returned non-OK status:', data?.status);
      return null;
    }
    
    return data.result;
    
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${distanceInMeters}m`;
  }
  return `${(distanceInMeters / 1000).toFixed(1)}km`;
}

/**
 * Get place type icon name for display
 */
export function getPlaceTypeIcon(types: string[]): string {
  // Map Google Places types to SF Symbol names
  const typeIconMap: Record<string, string> = {
    museum: 'building.columns.fill',
    restaurant: 'fork.knife',
    cafe: 'cup.and.saucer.fill',
    park: 'tree.fill',
    tourist_attraction: 'star.fill',
    church: 'building.fill',
    shopping_mall: 'bag.fill',
    store: 'storefront.fill',
    hotel: 'bed.double.fill',
    hospital: 'cross.fill',
    school: 'graduationcap.fill',
    university: 'building.2.fill',
    library: 'books.vertical.fill',
    bank: 'building.columns.fill',
    gas_station: 'fuelpump.fill',
    pharmacy: 'cross.case.fill'
  };
  
  // Find the most specific type
  for (const type of types) {
    if (typeIconMap[type]) {
      return typeIconMap[type];
    }
  }
  
  // Fallback icon
  return 'mappin.and.ellipse';
}