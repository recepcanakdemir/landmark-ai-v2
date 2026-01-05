import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { LimitCheckResult, SubscriptionStatus, TrialState, UserAccessState, UserAccessType } from '@/types';

const DEVICE_ID_KEY = 'landmark_device_id';
const TRIAL_STATE_KEY = 'landmark_trial_state';
const FREE_DAILY_LIMIT = 0;
const TRIAL_DURATION_DAYS = 3;

/**
 * Generate or retrieve persistent device ID for tracking usage
 * Uses hardware-based IDs to prevent uninstall/reinstall loophole
 */
async function getDeviceId(): Promise<string> {
  try {
    // First, check if we already have a stored device ID
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Try to get hardware-based ID
      try {
        let hardwareId: string | null = null;
        
        if (Platform.OS === 'ios') {
          // iOS: Use Vendor ID (persists until all apps from vendor are deleted)
          hardwareId = await Application.getIosIdForVendorAsync();
          if (hardwareId) {
            deviceId = `ios_vendor_${hardwareId}`;
          }
        } else if (Platform.OS === 'android') {
          // Android: Use Android ID (persists until factory reset)
          hardwareId = Application.getAndroidId();
          if (hardwareId) {
            deviceId = `android_id_${hardwareId}`;
          }
        }
        
        // Fallback to random ID if hardware ID fails or returns null
        if (!deviceId) {
          console.warn('Hardware ID not available, falling back to random ID');
          deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }
        
        // Store the device ID for future use
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        console.log('Generated new device ID:', deviceId.substring(0, 20) + '...');
        
      } catch (hardwareError) {
        console.error('Error getting hardware ID:', hardwareError);
        // Final fallback to random ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error managing device ID:', error);
    
    // Fallback to AsyncStorage if SecureStore fails completely
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        // Try hardware ID as fallback
        try {
          let hardwareId: string | null = null;
          
          if (Platform.OS === 'ios') {
            hardwareId = await Application.getIosIdForVendorAsync();
            if (hardwareId) {
              deviceId = `ios_vendor_${hardwareId}`;
            }
          } else if (Platform.OS === 'android') {
            hardwareId = Application.getAndroidId();
            if (hardwareId) {
              deviceId = `android_id_${hardwareId}`;
            }
          }
          
          if (!deviceId) {
            deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          }
        } catch (hardwareError) {
          deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }
        
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (asyncError) {
      console.error('All storage methods failed, using temporary ID:', asyncError);
      // Last resort: temporary ID (will reset on app restart)
      return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
}

/**
 * Get current trial state from storage
 */
async function getTrialState(): Promise<TrialState> {
  try {
    const stored = await AsyncStorage.getItem(TRIAL_STATE_KEY);
    if (!stored) {
      return {
        isActive: false,
        startDate: '',
        endDate: '',
        hasUsedTrial: false
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting trial state:', error);
    return {
      isActive: false,
      startDate: '',
      endDate: '',
      hasUsedTrial: false
    };
  }
}

/**
 * Check if trial is currently active (not expired)
 */
async function isTrialActive(): Promise<boolean> {
  const trialState = await getTrialState();
  if (!trialState.isActive || !trialState.endDate) {
    return false;
  }
  
  const now = new Date();
  const endDate = new Date(trialState.endDate);
  return now < endDate;
}

/**
 * Start a new trial period
 */
async function startTrial(): Promise<TrialState> {
  try {
    const currentState = await getTrialState();
    
    // Prevent multiple trials per device
    if (currentState.hasUsedTrial) {
      throw new Error('Trial has already been used on this device');
    }
    
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
    
    const newTrialState: TrialState = {
      isActive: true,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      hasUsedTrial: true
    };
    
    await AsyncStorage.setItem(TRIAL_STATE_KEY, JSON.stringify(newTrialState));
    console.log('Trial started:', newTrialState);
    
    return newTrialState;
  } catch (error) {
    console.error('Error starting trial:', error);
    throw error;
  }
}

/**
 * Get comprehensive user access state
 */
export async function getUserAccessState(): Promise<UserAccessState> {
  // Check premium status first
  const subscriptionStatus = await checkPremiumStatus();
  if (subscriptionStatus.isPremium) {
    return {
      type: 'premium',
      unlimited: true
    };
  }
  
  // Check trial status
  const trialActive = await isTrialActive();
  if (trialActive) {
    const trialState = await getTrialState();
    return {
      type: 'trial',
      unlimited: true,
      trialEndDate: trialState.endDate
    };
  }
  
  // Default to free tier
  const deviceId = await getDeviceId();
  const limitResult = await checkSupabaseLimit(deviceId, false);
  
  return {
    type: 'free',
    unlimited: false,
    scansRemaining: Math.max(0, limitResult.scansAllowed - limitResult.scansUsed)
  };
}

/**
 * Check RevenueCat subscription status
 * Integrates with the RevenueCat context provider for real-time subscription status
 */
async function checkPremiumStatus(): Promise<SubscriptionStatus> {
  try {
    // Import RevenueCat provider dynamically to avoid circular dependencies
    const { default: Purchases } = await import('react-native-purchases');
    
    console.log('🔍 Checking RevenueCat subscription status...');
    
    // Get current customer info
    const customerInfo = await Purchases.getCustomerInfo();
    
    console.log('📊 RevenueCat CustomerInfo received:');
    console.log('- Original App User ID:', customerInfo.originalAppUserId);
    console.log('- Active Entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('- All Entitlements:', Object.keys(customerInfo.entitlements.all));
    console.log('- Latest Expiration Date:', customerInfo.latestExpirationDate);
    
    // Check all available entitlements first
    const allEntitlements = customerInfo.entitlements.all;
    const activeEntitlements = customerInfo.entitlements.active;
    
    console.log('🔍 Looking for "premium" entitlement...');
    
    // Check if 'premium' entitlement exists and is active
    const proEntitlement = activeEntitlements['premium'];
    const isPremium = proEntitlement?.isActive === true;
    
    if (proEntitlement) {
      console.log('✅ Found "premium" entitlement:');
      console.log('- Is Active:', proEntitlement.isActive);
      console.log('- Product ID:', proEntitlement.productIdentifier);
      console.log('- Will Renew:', proEntitlement.willRenew);
      console.log('- Period Type:', proEntitlement.periodType);
      console.log('- Expiration Date:', proEntitlement.expirationDate);
      console.log('- Store:', proEntitlement.store);
    } else {
      console.log('❌ No "premium" entitlement found in active entitlements');
      
      // Check if it exists in all entitlements but not active
      const allProEntitlement = allEntitlements['premium'];
      if (allProEntitlement) {
        console.log('⚠️ Found "premium" entitlement in all entitlements but not active:');
        console.log('- Is Active:', allProEntitlement.isActive);
        console.log('- Expiration Date:', allProEntitlement.expirationDate);
      }
    }
    
    console.log(`🎯 Final Premium Status: ${isPremium ? 'PREMIUM' : 'FREE'}`);
    
    return {
      isPremium,
      productId: proEntitlement?.productIdentifier,
      purchaseDate: proEntitlement?.latestPurchaseDate,
      expirationDate: proEntitlement?.expirationDate || undefined,
      isTrialPeriod: proEntitlement?.periodType === 'trial',
      autoRenewStatus: proEntitlement?.willRenew,
      platform: 'ios', // iOS-only app
    };
  } catch (error) {
    console.error('💥 Error checking premium status via RevenueCat:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Fallback: return non-premium status
    return {
      isPremium: false,
      platform: 'ios', // iOS-only app
    };
  }
}

/**
 * Check and potentially increment usage limit via Supabase
 */
async function checkSupabaseLimit(deviceId: string, increment: boolean = false): Promise<{
  scansUsed: number;
  scansAllowed: number;
  canScan: boolean;
}> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (increment) {
      // First, get current usage before incrementing
      let currentScansUsed = 0;
      const { data: currentData, error: currentError } = await supabase
        .from('daily_limits')
        .select('scans_used')
        .eq('device_id', deviceId)
        .eq('date', today)
        .single();
      
      if (currentError && currentError.code !== 'PGRST116') {
        console.error('Error getting current usage:', currentError);
      } else {
        currentScansUsed = currentData?.scans_used || 0;
      }
      
      // Call Supabase RPC to check and increment limit
      const { data, error } = await supabase.rpc('check_and_increment_limit', {
        p_device_id: deviceId,
        p_limit_date: today,
        p_max_scans: FREE_DAILY_LIMIT
      });
      
      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }
      
      // Debug: Log the actual response type and value
      console.log('RPC Response type:', typeof data);
      console.log('RPC Response value:', data);
      
      // Handle boolean response from RPC function
      let canScan: boolean;
      let scansUsedAfter: number;
      
      if (typeof data === 'boolean') {
        // RPC returns true/false indicating if scan was allowed
        canScan = data;
        // If scan was allowed, increment our counter; if not, keep same count
        scansUsedAfter = canScan ? currentScansUsed + 1 : currentScansUsed;
      } else if (data && typeof data === 'object') {
        // Fallback: Handle JSON object response
        canScan = data.can_scan === true || data.can_scan === 'true';
        scansUsedAfter = parseInt(data.scans_used) || currentScansUsed;
      } else {
        // Fallback: Unexpected response format
        console.warn('Unexpected RPC response format:', data);
        canScan = currentScansUsed < FREE_DAILY_LIMIT;
        scansUsedAfter = canScan ? currentScansUsed + 1 : currentScansUsed;
      }
      
      return {
        scansUsed: scansUsedAfter,
        scansAllowed: FREE_DAILY_LIMIT,
        canScan
      };
    } else {
      // Just check current usage without incrementing
      const { data, error } = await supabase
        .from('daily_limits')
        .select('scans_used')
        .eq('device_id', deviceId)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Supabase usage check error:', error);
        throw error;
      }
      
      const scansUsed = data?.scans_used || 0;
      
      return {
        scansUsed,
        scansAllowed: FREE_DAILY_LIMIT,
        canScan: scansUsed < FREE_DAILY_LIMIT
      };
    }
  } catch (error) {
    console.error('Error checking Supabase limits:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Return safe defaults on error - allow the scan so app doesn't break
    return {
      scansUsed: 0,
      scansAllowed: FREE_DAILY_LIMIT,
      canScan: true // Allow scan on error to prevent app from breaking
    };
  }
}

/**
 * Calculate next reset time (midnight in user's timezone)
 */
function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Main function to check if user can perform a scan
 * This is the primary function that should be called from the UI
 */
export async function checkScanLimit(performScan: boolean = false): Promise<LimitCheckResult> {
  try {
    // Step 1: Get user access state (premium, trial, or free)
    const accessState = await getUserAccessState();
    
    // Step 2: Handle premium users
    if (accessState.type === 'premium') {
      return {
        allowed: true,
        remaining: -1, // Unlimited
        isPremium: true,
        isTrialActive: false,
        scansUsed: 0,
        scansAllowed: -1
      };
    }
    
    // Step 3: Handle trial users (unlimited scans, bypass Supabase)
    if (accessState.type === 'trial') {
      return {
        allowed: true,
        remaining: -1, // Unlimited during trial
        isPremium: false,
        isTrialActive: true,
        scansUsed: 0,
        scansAllowed: -1,
        trialEndDate: accessState.trialEndDate
      };
    }
    
    // Step 4: Handle free tier users (call Supabase for limit checking)
    const deviceId = await getDeviceId();
    const limitResult = await checkSupabaseLimit(deviceId, performScan);
    
    const allowed = performScan ? limitResult.canScan : limitResult.scansUsed < limitResult.scansAllowed;
    
    const calculatedRemaining = limitResult.scansAllowed - limitResult.scansUsed;
    const remaining = Math.max(0, calculatedRemaining);
    
    // Log potential negative values for debugging
    if (calculatedRemaining < 0) {
      console.warn(`Negative remaining detected: ${calculatedRemaining} (used: ${limitResult.scansUsed}, allowed: ${limitResult.scansAllowed})`);
    }
    
    return {
      allowed,
      remaining,
      isPremium: false,
      isTrialActive: false,
      scansUsed: limitResult.scansUsed,
      scansAllowed: limitResult.scansAllowed,
      resetTime: getNextResetTime()
    };
    
  } catch (error) {
    console.error('Error in checkScanLimit:', error);
    
    // Return safe defaults on error (hard paywall - no free scans)
    return {
      allowed: false,
      remaining: 0,
      isPremium: false,
      isTrialActive: false,
      scansUsed: 0,
      scansAllowed: FREE_DAILY_LIMIT,
      resetTime: getNextResetTime()
    };
  }
}

/**
 * Get current usage stats for display purposes
 */
export async function getCurrentUsageStats(): Promise<LimitCheckResult> {
  return await checkScanLimit(false);
}

/**
 * Perform a scan (increments usage counter)
 */
export async function performScan(): Promise<LimitCheckResult> {
  return await checkScanLimit(true);
}

/**
 * Cache subscription status locally for quick access
 */
const SUBSCRIPTION_CACHE_KEY = 'subscription_status_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  try {
    const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cached) {
      const { status, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_DURATION;
      
      if (!isExpired) {
        return status;
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading subscription cache:', error);
    return null;
  }
}

export async function setCachedSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
  try {
    const cacheData = {
      status,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching subscription status:', error);
  }
}

/**
 * Force refresh subscription status from RevenueCat
 */
export async function refreshSubscriptionStatus(): Promise<SubscriptionStatus> {
  const status = await checkPremiumStatus();
  await setCachedSubscriptionStatus(status);
  return status;
}

/**
 * Helper function to check if user has premium access
 * This can be used in components that don't have access to the RevenueCat context
 */
export async function checkIsPremium(): Promise<boolean> {
  try {
    const subscriptionStatus = await checkPremiumStatus();
    return subscriptionStatus.isPremium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Helper function to get current subscription info for display
 */
export async function getSubscriptionInfo(): Promise<SubscriptionStatus> {
  return await checkPremiumStatus();
}

// Export trial management functions
export { startTrial, isTrialActive, getTrialState, getUserAccessState };