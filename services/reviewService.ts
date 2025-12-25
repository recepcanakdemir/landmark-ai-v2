import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// AsyncStorage keys for tracking review state
const REVIEW_STORAGE_KEYS = {
  FIRST_LAUNCH_COMPLETED: 'review_first_launch_completed',
  SUCCESSFUL_SCANS_COUNT: 'review_successful_scans_count',
  LAST_REVIEW_REQUEST_DATE: 'review_last_request_date',
  REVIEW_REQUESTS_COUNT: 'review_requests_count',
} as const;

// Review timing configuration
const REVIEW_CONFIG = {
  FIRST_LAUNCH_DELAY_MS: 5000, // 5 seconds after first launch
  FIRST_SCAN_TRIGGER: 1,       // After 1st successful scan
  FIFTH_SCAN_TRIGGER: 5,       // After 5th successful scan
  TENTH_SCAN_INTERVAL: 10,     // Every 10th scan after that (10, 20, 30...)
  MIN_DAYS_BETWEEN_REQUESTS: 30, // Minimum 30 days between review requests
  MAX_REQUESTS_PER_YEAR: 3,    // Apple's limit (though they control actual display)
} as const;

/**
 * Comprehensive Review Service for LandmarkAI
 * 
 * Handles native Apple In-App Review prompts at strategic moments:
 * 1. First app launch (with delay)
 * 2. After successful scans (1st, 5th, then every 10th)
 * 
 * Important: Apple controls the actual display frequency of review prompts.
 * They limit it to maximum 3 times per year per user, so the prompt might
 * not show every time even when we request it in production.
 */
export class ReviewService {
  
  /**
   * Check if we should request a review on app launch
   * Called from app/_layout.tsx during initialization
   */
  static async checkAppLaunchReview(): Promise<void> {
    try {
      console.log('🔍 Review Service: Checking app launch review...');
      
      // Only proceed on iOS
      if (Platform.OS !== 'ios') {
        console.log('📱 Review Service: Skipping - not iOS platform');
        return;
      }

      // Check if this is the first launch
      const firstLaunchCompleted = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.FIRST_LAUNCH_COMPLETED);
      
      if (firstLaunchCompleted) {
        console.log('👋 Review Service: Not first launch - skipping app launch review');
        return;
      }

      // Check if we can show a review
      const canShowReview = await this.canRequestReview();
      if (!canShowReview) {
        console.log('⏰ Review Service: Cannot show review at this time');
        // Mark first launch as completed even if we can't show review
        await AsyncStorage.setItem(REVIEW_STORAGE_KEYS.FIRST_LAUNCH_COMPLETED, 'true');
        return;
      }

      console.log(`⏱️ Review Service: Scheduling first launch review in ${REVIEW_CONFIG.FIRST_LAUNCH_DELAY_MS}ms`);
      
      // Wait for the configured delay, then request review
      setTimeout(async () => {
        await this.requestReview('first_launch');
        // Mark first launch as completed
        await AsyncStorage.setItem(REVIEW_STORAGE_KEYS.FIRST_LAUNCH_COMPLETED, 'true');
      }, REVIEW_CONFIG.FIRST_LAUNCH_DELAY_MS);

    } catch (error) {
      console.error('💥 Review Service: Error in app launch review check:', error);
    }
  }

  /**
   * Check if we should request a review after a successful scan
   * Called from app/result.tsx after landmark analysis completes
   */
  static async checkScanSuccessReview(): Promise<void> {
    try {
      console.log('📸 Review Service: Checking scan success review...');
      
      // Only proceed on iOS
      if (Platform.OS !== 'ios') {
        console.log('📱 Review Service: Skipping - not iOS platform');
        return;
      }

      // Increment successful scans count
      const currentCount = await this.incrementScanCount();
      console.log(`🎯 Review Service: Total successful scans: ${currentCount}`);

      // Check if this scan count triggers a review
      const shouldTriggerReview = this.shouldTriggerReviewForScanCount(currentCount);
      
      if (!shouldTriggerReview) {
        console.log('📊 Review Service: Scan count does not trigger review');
        return;
      }

      // Check if we can show a review
      const canShowReview = await this.canRequestReview();
      if (!canShowReview) {
        console.log('⏰ Review Service: Cannot show review at this time');
        return;
      }

      console.log(`✨ Review Service: Triggering review for scan #${currentCount}`);
      await this.requestReview(`scan_${currentCount}`);

    } catch (error) {
      console.error('💥 Review Service: Error in scan success review check:', error);
    }
  }

  /**
   * Increment the successful scans count and return the new count
   */
  private static async incrementScanCount(): Promise<number> {
    try {
      const currentCountStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.SUCCESSFUL_SCANS_COUNT);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const newCount = currentCount + 1;
      
      await AsyncStorage.setItem(REVIEW_STORAGE_KEYS.SUCCESSFUL_SCANS_COUNT, newCount.toString());
      return newCount;
    } catch (error) {
      console.error('💥 Review Service: Error incrementing scan count:', error);
      return 1; // Default to 1 if there's an error
    }
  }

  /**
   * Determine if the current scan count should trigger a review
   * Logic: 1st scan, 5th scan, then every 10th scan (10, 20, 30...)
   */
  private static shouldTriggerReviewForScanCount(scanCount: number): boolean {
    // First scan
    if (scanCount === REVIEW_CONFIG.FIRST_SCAN_TRIGGER) {
      return true;
    }
    
    // Fifth scan
    if (scanCount === REVIEW_CONFIG.FIFTH_SCAN_TRIGGER) {
      return true;
    }
    
    // Every 10th scan after the 5th (10, 20, 30, 40...)
    if (scanCount > REVIEW_CONFIG.FIFTH_SCAN_TRIGGER && scanCount % REVIEW_CONFIG.TENTH_SCAN_INTERVAL === 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if we can request a review based on timing and frequency limits
   */
  private static async canRequestReview(): Promise<boolean> {
    try {
      // Check if StoreReview is available on this platform
      const hasAction = await StoreReview.hasAction();
      if (!hasAction) {
        console.log('📱 Review Service: StoreReview action not available');
        return false;
      }

      // Check request frequency limits
      const lastRequestDateStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.LAST_REVIEW_REQUEST_DATE);
      const requestCountStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.REVIEW_REQUESTS_COUNT);
      
      if (lastRequestDateStr && requestCountStr) {
        const lastRequestDate = new Date(lastRequestDateStr);
        const requestCount = parseInt(requestCountStr, 10);
        const daysSinceLastRequest = (Date.now() - lastRequestDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Check if we've hit the annual limit
        const isWithinSameYear = lastRequestDate.getFullYear() === new Date().getFullYear();
        if (isWithinSameYear && requestCount >= REVIEW_CONFIG.MAX_REQUESTS_PER_YEAR) {
          console.log(`⚠️ Review Service: Annual limit reached (${requestCount}/${REVIEW_CONFIG.MAX_REQUESTS_PER_YEAR})`);
          return false;
        }
        
        // Check minimum days between requests
        if (daysSinceLastRequest < REVIEW_CONFIG.MIN_DAYS_BETWEEN_REQUESTS) {
          console.log(`⏰ Review Service: Too soon since last request (${Math.round(daysSinceLastRequest)} days < ${REVIEW_CONFIG.MIN_DAYS_BETWEEN_REQUESTS})`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('💥 Review Service: Error checking review availability:', error);
      return false;
    }
  }

  /**
   * Request the native review prompt and update tracking data
   */
  private static async requestReview(trigger: string): Promise<void> {
    try {
      console.log(`⭐ Review Service: Requesting review (trigger: ${trigger})`);
      
      // Request the native review prompt
      await StoreReview.requestReview();
      
      // Update tracking data
      const now = new Date().toISOString();
      const requestCountStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.REVIEW_REQUESTS_COUNT);
      const currentCount = requestCountStr ? parseInt(requestCountStr, 10) : 0;
      
      // Reset count if it's a new year
      const lastRequestDateStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.LAST_REVIEW_REQUEST_DATE);
      let newCount = currentCount + 1;
      
      if (lastRequestDateStr) {
        const lastRequestDate = new Date(lastRequestDateStr);
        const isNewYear = lastRequestDate.getFullYear() !== new Date().getFullYear();
        if (isNewYear) {
          newCount = 1; // Reset count for new year
          console.log('🗓️ Review Service: New year detected - resetting request count');
        }
      }
      
      await AsyncStorage.setItem(REVIEW_STORAGE_KEYS.LAST_REVIEW_REQUEST_DATE, now);
      await AsyncStorage.setItem(REVIEW_STORAGE_KEYS.REVIEW_REQUESTS_COUNT, newCount.toString());
      
      console.log(`✅ Review Service: Review requested successfully (${newCount}/${REVIEW_CONFIG.MAX_REQUESTS_PER_YEAR} this year)`);
      
      // Note: Apple controls whether the prompt actually appears to the user
      console.log('ℹ️ Review Service: Note - Apple controls actual prompt display frequency (max 3/year)');
      
    } catch (error) {
      console.error('💥 Review Service: Error requesting review:', error);
    }
  }

  /**
   * Get current review statistics (useful for debugging)
   */
  static async getReviewStats(): Promise<{
    firstLaunchCompleted: boolean;
    successfulScansCount: number;
    lastRequestDate: string | null;
    requestsThisYear: number;
  }> {
    try {
      const firstLaunchCompleted = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.FIRST_LAUNCH_COMPLETED);
      const scanCountStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.SUCCESSFUL_SCANS_COUNT);
      const lastRequestDate = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.LAST_REVIEW_REQUEST_DATE);
      const requestCountStr = await AsyncStorage.getItem(REVIEW_STORAGE_KEYS.REVIEW_REQUESTS_COUNT);
      
      return {
        firstLaunchCompleted: !!firstLaunchCompleted,
        successfulScansCount: scanCountStr ? parseInt(scanCountStr, 10) : 0,
        lastRequestDate,
        requestsThisYear: requestCountStr ? parseInt(requestCountStr, 10) : 0,
      };
    } catch (error) {
      console.error('💥 Review Service: Error getting review stats:', error);
      return {
        firstLaunchCompleted: false,
        successfulScansCount: 0,
        lastRequestDate: null,
        requestsThisYear: 0,
      };
    }
  }

  /**
   * Reset all review data (useful for testing)
   * WARNING: Only use this for development/testing
   */
  static async resetReviewData(): Promise<void> {
    try {
      console.log('🔄 Review Service: Resetting all review data...');
      
      await AsyncStorage.multiRemove([
        REVIEW_STORAGE_KEYS.FIRST_LAUNCH_COMPLETED,
        REVIEW_STORAGE_KEYS.SUCCESSFUL_SCANS_COUNT,
        REVIEW_STORAGE_KEYS.LAST_REVIEW_REQUEST_DATE,
        REVIEW_STORAGE_KEYS.REVIEW_REQUESTS_COUNT,
      ]);
      
      console.log('✅ Review Service: All review data reset');
    } catch (error) {
      console.error('💥 Review Service: Error resetting review data:', error);
    }
  }
}

// Export individual functions for convenience
export const checkAppLaunchReview = ReviewService.checkAppLaunchReview.bind(ReviewService);
export const checkScanSuccessReview = ReviewService.checkScanSuccessReview.bind(ReviewService);
export const getReviewStats = ReviewService.getReviewStats.bind(ReviewService);
export const resetReviewData = ReviewService.resetReviewData.bind(ReviewService);