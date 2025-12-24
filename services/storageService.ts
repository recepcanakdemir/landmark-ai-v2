import AsyncStorage from '@react-native-async-storage/async-storage';
import { LandmarkAnalysis } from '@/types';

/**
 * Robust Storage Service for managing saved landmarks with corruption protection
 * Handles data migration from Plant identifier to Landmark format
 */

const STORAGE_KEY = 'saved_landmarks';
const SCAN_HISTORY_KEY = 'scan_history'; // For recent scans/analysis history
const LEGACY_STORAGE_KEY = 'saved_plants'; // For plant->landmark migration
const MAX_SCAN_HISTORY = 15; // Maximum number of recent scans to keep

interface SavedLandmarkMeta {
  landmark: LandmarkAnalysis;
  savedAt: string; // ISO timestamp when landmark was saved
}

interface ScanHistoryMeta {
  landmark: LandmarkAnalysis;
  scannedAt: string; // ISO timestamp when landmark was scanned/analyzed
}

// Legacy plant data structure for migration
interface LegacyPlantData {
  id?: string;
  name?: string;
  description?: string;
  [key: string]: any;
}

/**
 * Validation helper to check if a landmark object is valid
 */
function isValidLandmark(landmark: any): landmark is LandmarkAnalysis {
  if (!landmark || typeof landmark !== 'object') {
    return false;
  }
  
  // Must have required fields
  if (!landmark.id || typeof landmark.id !== 'string') {
    return false;
  }
  
  if (!landmark.name || typeof landmark.name !== 'string') {
    return false;
  }
  
  // Must have analyzed timestamp (even if malformed, we can fix it)
  if (!landmark.analyzedAt) {
    landmark.analyzedAt = new Date().toISOString();
  }
  
  return true;
}

/**
 * Validation helper to check if saved metadata is valid
 */
function isValidSavedMeta(meta: any): meta is SavedLandmarkMeta {
  if (!meta || typeof meta !== 'object') {
    return false;
  }
  
  if (!meta.landmark || !isValidLandmark(meta.landmark)) {
    return false;
  }
  
  if (!meta.savedAt || typeof meta.savedAt !== 'string') {
    // Try to fix missing savedAt
    meta.savedAt = new Date().toISOString();
  }
  
  return true;
}

/**
 * Clean and validate stored data, removing corrupted entries
 */
function cleanupCorruptedData(rawData: any[]): SavedLandmarkMeta[] {
  if (!Array.isArray(rawData)) {
    console.warn('Storage data is not an array, returning empty array');
    return [];
  }
  
  const cleanData: SavedLandmarkMeta[] = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    
    // Skip null, undefined, or non-objects
    if (!item || typeof item !== 'object') {
      console.warn(`Skipping corrupted item at index ${i}: not an object`);
      continue;
    }
    
    // Handle direct landmark objects (legacy format)
    if (item.id && item.name && !item.landmark) {
      // This is a direct landmark object, wrap it in SavedLandmarkMeta
      if (isValidLandmark(item)) {
        cleanData.push({
          landmark: item,
          savedAt: item.analyzedAt || new Date().toISOString()
        });
        console.log(`Migrated direct landmark: ${item.name}`);
      } else {
        console.warn(`Skipping invalid direct landmark at index ${i}: ${item.name || 'unknown'}`);
      }
      continue;
    }
    
    // Handle SavedLandmarkMeta objects
    if (isValidSavedMeta(item)) {
      cleanData.push(item);
    } else {
      console.warn(`Skipping corrupted saved meta at index ${i}: ${item.landmark?.name || 'unknown'}`);
    }
  }
  
  console.log(`Data cleanup: ${rawData.length} → ${cleanData.length} items (removed ${rawData.length - cleanData.length} corrupted)`);
  return cleanData;
}

/**
 * Migrate legacy plant data to landmark format
 */
async function migrateLegacyData(): Promise<SavedLandmarkMeta[]> {
  try {
    console.log('Checking for legacy plant data to migrate...');
    
    const legacyData = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) {
      return [];
    }
    
    const plants: LegacyPlantData[] = JSON.parse(legacyData);
    const migratedLandmarks: SavedLandmarkMeta[] = [];
    
    for (const plant of plants) {
      if (plant && plant.id && plant.name) {
        // Convert plant data to landmark format
        const landmark: LandmarkAnalysis = {
          id: plant.id,
          name: plant.name,
          description: plant.description || '',
          history: plant.history || `Historical information about ${plant.name}.`,
          funFacts: plant.funFacts || [],
          analyzedAt: plant.analyzedAt || new Date().toISOString(),
          imageUrl: plant.imageUrl,
          // Add any other plant properties that map to landmarks
          ...plant
        };
        
        if (isValidLandmark(landmark)) {
          migratedLandmarks.push({
            landmark,
            savedAt: plant.savedAt || landmark.analyzedAt
          });
        }
      }
    }
    
    if (migratedLandmarks.length > 0) {
      console.log(`Migrated ${migratedLandmarks.length} plants to landmarks`);
      
      // Save migrated data to new format
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedLandmarks));
      
      // Remove legacy data
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    
    return migratedLandmarks;
    
  } catch (error) {
    console.error('Error migrating legacy data:', error);
    return [];
  }
}

/**
 * Validate and clean storage data, recovering from corruption
 */
async function validateAndCleanStorage(): Promise<SavedLandmarkMeta[]> {
  try {
    console.log('Validating and cleaning storage data...');
    
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    let rawData: any[] = [];
    
    if (stored) {
      try {
        rawData = JSON.parse(stored);
      } catch (parseError) {
        console.error('Failed to parse stored data, treating as empty:', parseError);
        rawData = [];
      }
    }
    
    // Clean existing data
    const cleanedData = cleanupCorruptedData(rawData);
    
    // Try to migrate legacy data if no clean data found
    if (cleanedData.length === 0) {
      const migratedData = await migrateLegacyData();
      if (migratedData.length > 0) {
        return migratedData;
      }
    }
    
    // Save cleaned data back to storage
    if (rawData.length !== cleanedData.length && cleanedData.length >= 0) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedData));
      console.log('Saved cleaned data back to storage');
    }
    
    return cleanedData;
    
  } catch (error) {
    console.error('Error validating storage:', error);
    return [];
  }
}

/**
 * Save a landmark to the user's passport collection
 */
export async function saveLandmark(landmark: LandmarkAnalysis): Promise<void> {
  try {
    // Validate input landmark
    if (!isValidLandmark(landmark)) {
      throw new Error('Invalid landmark data provided for saving');
    }
    
    console.log('Saving landmark to passport:', landmark.name);
    
    // Get existing saved landmarks with validation
    const existingLandmarks = await getSavedLandmarks();
    
    // Check if already saved (prevent duplicates) with safe property access
    const isAlreadySaved = existingLandmarks.some(saved => {
      return saved && saved.id && saved.id === landmark.id;
    });
    
    if (isAlreadySaved) {
      console.log('Landmark already saved, skipping:', landmark.name);
      return;
    }
    
    // Create saved landmark metadata
    const savedLandmark: SavedLandmarkMeta = {
      landmark,
      savedAt: new Date().toISOString()
    };
    
    // Get validated existing meta data
    const existingMeta = await getSavedLandmarksWithMeta();
    
    // Add to existing landmarks
    const updatedLandmarks = [savedLandmark, ...existingMeta];
    
    // Save back to storage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLandmarks));
    
    console.log('Successfully saved landmark to passport:', landmark.name);
    
  } catch (error) {
    console.error('Error saving landmark:', error);
    throw new Error('Failed to save landmark to passport');
  }
}

/**
 * Get all saved landmarks from storage, sorted by save date (newest first)
 * Includes automatic data validation and corruption recovery
 */
export async function getSavedLandmarks(): Promise<LandmarkAnalysis[]> {
  try {
    // Get validated and cleaned data
    const savedLandmarks = await validateAndCleanStorage();
    
    // Sort by save date (newest first) and return just the landmark data
    return savedLandmarks
      .filter(meta => meta && meta.landmark && isValidLandmark(meta.landmark))
      .sort((a, b) => {
        const dateA = new Date(a.savedAt || 0).getTime();
        const dateB = new Date(b.savedAt || 0).getTime();
        return dateB - dateA;
      })
      .map(saved => saved.landmark);
      
  } catch (error) {
    console.error('Error getting saved landmarks:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get saved landmarks with metadata (including save date)
 * Includes automatic data validation and corruption recovery
 */
export async function getSavedLandmarksWithMeta(): Promise<SavedLandmarkMeta[]> {
  try {
    // Get validated and cleaned data
    const savedLandmarks = await validateAndCleanStorage();
    
    // Sort by save date (newest first)
    return savedLandmarks
      .filter(meta => isValidSavedMeta(meta))
      .sort((a, b) => {
        const dateA = new Date(a.savedAt || 0).getTime();
        const dateB = new Date(b.savedAt || 0).getTime();
        return dateB - dateA;
      });
      
  } catch (error) {
    console.error('Error getting saved landmarks with metadata:', error);
    return []; // Return empty array on error
  }
}

/**
 * Remove a landmark from the saved collection
 */
export async function removeLandmark(landmarkId: string): Promise<void> {
  try {
    if (!landmarkId || typeof landmarkId !== 'string') {
      throw new Error('Invalid landmark ID provided for removal');
    }
    
    console.log('Removing landmark from passport:', landmarkId);
    
    // Get existing saved landmarks with validation
    const existingLandmarks = await getSavedLandmarksWithMeta();
    
    // Filter out the landmark to remove with safe property access
    const filteredLandmarks = existingLandmarks.filter(saved => {
      return saved && 
             saved.landmark && 
             saved.landmark.id && 
             saved.landmark.id !== landmarkId;
    });
    
    // Save back to storage
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLandmarks));
    
    console.log('Successfully removed landmark from passport:', landmarkId);
    
  } catch (error) {
    console.error('Error removing landmark:', error);
    throw new Error('Failed to remove landmark from passport');
  }
}

/**
 * Check if a landmark is already saved in the collection
 */
export async function isLandmarkSaved(landmarkId: string): Promise<boolean> {
  try {
    if (!landmarkId || typeof landmarkId !== 'string') {
      console.warn('Invalid landmark ID provided for saved check');
      return false;
    }
    
    const savedLandmarks = await getSavedLandmarks();
    
    return savedLandmarks.some(landmark => {
      return landmark && 
             landmark.id && 
             typeof landmark.id === 'string' && 
             landmark.id === landmarkId;
    });
    
  } catch (error) {
    console.error('Error checking if landmark is saved:', error);
    return false; // Return false on error (safer default)
  }
}

/**
 * Get a specific saved landmark by ID
 */
export async function getSavedLandmark(landmarkId: string): Promise<LandmarkAnalysis | null> {
  try {
    if (!landmarkId || typeof landmarkId !== 'string') {
      console.warn('Invalid landmark ID provided for lookup');
      return null;
    }
    
    const savedLandmarks = await getSavedLandmarks();
    
    const found = savedLandmarks.find(landmark => {
      return landmark && 
             landmark.id && 
             typeof landmark.id === 'string' && 
             landmark.id === landmarkId;
    });
    
    return found || null;
    
  } catch (error) {
    console.error('Error getting saved landmark by ID:', error);
    return null;
  }
}

/**
 * Get the number of saved landmarks
 */
export async function getSavedLandmarksCount(): Promise<number> {
  try {
    const savedLandmarks = await getSavedLandmarks();
    return savedLandmarks.length;
    
  } catch (error) {
    console.error('Error getting saved landmarks count:', error);
    return 0;
  }
}

/**
 * Clear all saved landmarks (for debugging or reset)
 * Optionally backup data before clearing
 */
export async function clearAllSavedLandmarks(createBackup: boolean = false): Promise<string | null> {
  try {
    let backupData: string | null = null;
    
    if (createBackup) {
      backupData = await exportSavedLandmarks();
      console.log('Created backup before clearing data');
    }
    
    // Clear both new and legacy storage keys
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    
    console.log('Cleared all saved landmarks');
    
    return backupData;
    
  } catch (error) {
    console.error('Error clearing saved landmarks:', error);
    throw new Error('Failed to clear saved landmarks');
  }
}

/**
 * Force cleanup of corrupted data without backup
 */
export async function forceCleanupCorruptedData(): Promise<{
  originalCount: number;
  cleanedCount: number;
  removed: number;
}> {
  try {
    console.log('Force cleaning corrupted data...');
    
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    let originalData: any[] = [];
    
    if (stored) {
      try {
        originalData = JSON.parse(stored);
      } catch (e) {
        console.warn('Could not parse stored data, treating as empty');
        originalData = [];
      }
    }
    
    const originalCount = originalData.length;
    const cleanedData = cleanupCorruptedData(originalData);
    const cleanedCount = cleanedData.length;
    
    // Save cleaned data
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedData));
    
    const result = {
      originalCount,
      cleanedCount,
      removed: originalCount - cleanedCount
    };
    
    console.log('Force cleanup completed:', result);
    return result;
    
  } catch (error) {
    console.error('Error during force cleanup:', error);
    throw new Error('Failed to cleanup corrupted data');
  }
}

/**
 * Export saved landmarks as JSON (for backup/sharing)
 */
export async function exportSavedLandmarks(): Promise<string> {
  try {
    const savedLandmarks = await getSavedLandmarksWithMeta();
    return JSON.stringify(savedLandmarks, null, 2);
    
  } catch (error) {
    console.error('Error exporting saved landmarks:', error);
    throw new Error('Failed to export saved landmarks');
  }
}

/**
 * Get statistics about saved landmarks
 */
export async function getSavedLandmarksStats(): Promise<{
  totalCount: number;
  countries: string[];
  oldestSave: string | null;
  newestSave: string | null;
}> {
  try {
    const savedLandmarks = await getSavedLandmarksWithMeta();
    
    if (savedLandmarks.length === 0) {
      return {
        totalCount: 0,
        countries: [],
        oldestSave: null,
        newestSave: null
      };
    }
    
    // Extract unique countries/locations from landmark data
    const locations = savedLandmarks
      .map(saved => {
        const landmark = saved.landmark;
        if (!landmark) return null;
        
        // Try multiple sources for location
        return landmark.country || 
               landmark.location || 
               (landmark.coordinates ? 'Coordinates Available' : null);
      })
      .filter(location => location && location !== 'Unknown');
    
    const uniqueCountries = [...new Set(locations)];
    
    // Get date range with validation
    const dates = savedLandmarks
      .map(saved => saved.savedAt)
      .filter(date => date && typeof date === 'string')
      .sort();
      
    const oldestSave = dates[0] || null;
    const newestSave = dates[dates.length - 1] || null;
    
    return {
      totalCount: savedLandmarks.length,
      countries: uniqueCountries,
      oldestSave,
      newestSave
    };
    
  } catch (error) {
    console.error('Error getting saved landmarks stats:', error);
    return {
      totalCount: 0,
      countries: [],
      oldestSave: null,
      newestSave: null
    };
  }
}

/**
 * Diagnostic function to check storage health
 */
export async function diagnoseStorageHealth(): Promise<{
  hasData: boolean;
  hasLegacyData: boolean;
  dataValid: boolean;
  totalItems: number;
  validItems: number;
  corruptedItems: number;
  migrationNeeded: boolean;
}> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const legacyStored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    
    let rawData: any[] = [];
    let hasData = false;
    let dataValid = true;
    
    if (stored) {
      hasData = true;
      try {
        rawData = JSON.parse(stored);
        if (!Array.isArray(rawData)) {
          dataValid = false;
          rawData = [];
        }
      } catch (e) {
        dataValid = false;
        rawData = [];
      }
    }
    
    const cleanedData = cleanupCorruptedData(rawData);
    
    return {
      hasData,
      hasLegacyData: !!legacyStored,
      dataValid,
      totalItems: rawData.length,
      validItems: cleanedData.length,
      corruptedItems: rawData.length - cleanedData.length,
      migrationNeeded: !!legacyStored && !hasData
    };
    
  } catch (error) {
    console.error('Error diagnosing storage health:', error);
    return {
      hasData: false,
      hasLegacyData: false,
      dataValid: false,
      totalItems: 0,
      validItems: 0,
      corruptedItems: 0,
      migrationNeeded: false
    };
  }
}

/**
 * SCAN HISTORY FUNCTIONS
 * Separate from saved landmarks - tracks recent AI analysis regardless of save status
 */

/**
 * Validation helper for scan history metadata
 */
function isValidScanHistoryMeta(meta: any): meta is ScanHistoryMeta {
  if (!meta || typeof meta !== 'object') {
    return false;
  }
  
  if (!meta.landmark || !isValidLandmark(meta.landmark)) {
    return false;
  }
  
  if (!meta.scannedAt || typeof meta.scannedAt !== 'string') {
    meta.scannedAt = new Date().toISOString();
  }
  
  return true;
}

/**
 * Add a landmark to scan history (called after each AI analysis)
 */
export async function addToScanHistory(landmark: LandmarkAnalysis): Promise<void> {
  try {
    if (!isValidLandmark(landmark)) {
      throw new Error('Invalid landmark data for scan history');
    }
    
    console.log('Adding to scan history:', landmark.name);
    
    // Get existing scan history with metadata
    const existingHistory = await getScanHistoryWithMeta();
    
    // Create scan history entry
    const scanEntry: ScanHistoryMeta = {
      landmark,
      scannedAt: new Date().toISOString()
    };
    
    // Add to front of array (newest first) and limit to MAX_SCAN_HISTORY
    const updatedHistory = [scanEntry, ...existingHistory].slice(0, MAX_SCAN_HISTORY);
    
    // Save back to storage
    await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updatedHistory));
    
    console.log(`Added to scan history. Total entries: ${updatedHistory.length}`);
    
  } catch (error) {
    console.error('Error adding to scan history:', error);
    throw new Error('Failed to add to scan history');
  }
}

/**
 * Get recent scan history (last 15 scans)
 */
export async function getScanHistory(): Promise<LandmarkAnalysis[]> {
  try {
    const stored = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
    if (!stored) {
      return [];
    }
    
    let rawData: any[] = [];
    try {
      rawData = JSON.parse(stored);
    } catch (parseError) {
      console.error('Failed to parse scan history, returning empty array:', parseError);
      return [];
    }
    
    if (!Array.isArray(rawData)) {
      console.warn('Scan history is not an array, returning empty array');
      return [];
    }
    
    // Validate and clean the data
    const validHistory: ScanHistoryMeta[] = [];
    
    for (const item of rawData) {
      if (isValidScanHistoryMeta(item)) {
        validHistory.push(item);
      }
    }
    
    // Sort by scan date (newest first) and return landmarks
    return validHistory
      .sort((a, b) => {
        const dateA = new Date(a.scannedAt).getTime();
        const dateB = new Date(b.scannedAt).getTime();
        return dateB - dateA;
      })
      .map(entry => entry.landmark);
      
  } catch (error) {
    console.error('Error getting scan history:', error);
    return [];
  }
}

/**
 * Get scan history with metadata
 */
export async function getScanHistoryWithMeta(): Promise<ScanHistoryMeta[]> {
  try {
    const stored = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
    if (!stored) {
      return [];
    }
    
    let rawData: any[] = [];
    try {
      rawData = JSON.parse(stored);
    } catch (parseError) {
      console.error('Failed to parse scan history metadata:', parseError);
      return [];
    }
    
    if (!Array.isArray(rawData)) {
      return [];
    }
    
    // Validate and clean the data
    const validHistory: ScanHistoryMeta[] = [];
    
    for (const item of rawData) {
      if (isValidScanHistoryMeta(item)) {
        validHistory.push(item);
      }
    }
    
    // Sort by scan date (newest first)
    return validHistory.sort((a, b) => {
      const dateA = new Date(a.scannedAt).getTime();
      const dateB = new Date(b.scannedAt).getTime();
      return dateB - dateA;
    });
    
  } catch (error) {
    console.error('Error getting scan history with metadata:', error);
    return [];
  }
}

/**
 * Clear scan history (for debugging)
 */
export async function clearScanHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
    console.log('Scan history cleared');
  } catch (error) {
    console.error('Error clearing scan history:', error);
    throw new Error('Failed to clear scan history');
  }
}