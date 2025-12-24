import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { LimitCheckResult, SubscriptionStatus } from '@/types';

const DEVICE_ID_KEY = 'landmark_device_id';
const FREE_DAILY_LIMIT = 3;

/**
 * Generate or retrieve device ID for tracking usage
 */
async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error managing device ID:', error);
    // Fallback to AsyncStorage if SecureStore fails
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }
}

/**
 * Check RevenueCat subscription status
 * TODO: Implement actual RevenueCat integration
 */
async function checkPremiumStatus(): Promise<SubscriptionStatus> {
  try {
    // Placeholder for RevenueCat integration
    // This will be implemented when RevenueCat is set up
    return {
      isPremium: false,
      platform: 'ios' // Will be detected from platform
    };
  } catch (error) {
    console.error('Error checking premium status:', error);
    return {
      isPremium: false,
      platform: 'ios'
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
    // Step 1: Check premium status first
    const subscriptionStatus = await checkPremiumStatus();
    
    if (subscriptionStatus.isPremium) {
      return {
        allowed: true,
        remaining: -1, // Unlimited
        isPremium: true,
        scansUsed: 0,
        scansAllowed: -1
      };
    }
    
    // Step 2: For free users, check daily limits
    const deviceId = await getDeviceId();
    const limitResult = await checkSupabaseLimit(deviceId, performScan);
    
    const allowed = performScan ? limitResult.canScan : limitResult.scansUsed < limitResult.scansAllowed;
    
    return {
      allowed,
      remaining: limitResult.scansAllowed - limitResult.scansUsed,
      isPremium: false,
      scansUsed: limitResult.scansUsed,
      scansAllowed: limitResult.scansAllowed,
      resetTime: getNextResetTime()
    };
    
  } catch (error) {
    console.error('Error in checkScanLimit:', error);
    
    // Return safe defaults on error
    return {
      allowed: true,
      remaining: FREE_DAILY_LIMIT,
      isPremium: false,
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