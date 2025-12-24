import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase configuration
// These should be added to your Expo app config or environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.warn('Supabase URL not configured. Please add it to your app.config.js');
}

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn('Supabase Anon Key not configured. Please add it to your app.config.js');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We're not using Supabase auth for this app, just the database
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Database helper functions
export const supabaseHelpers = {
  /**
   * Check daily usage limit for a device
   */
  async checkDailyLimit(deviceId: string, date: string) {
    const { data, error } = await supabase
      .from('daily_limits')
      .select('*')
      .eq('device_id', deviceId)
      .eq('date', date)
      .single();

    return { data, error };
  },

  /**
   * Insert or update daily limit record
   */
  async upsertDailyLimit(deviceId: string, date: string, scansUsed: number) {
    const { data, error } = await supabase
      .from('daily_limits')
      .upsert(
        {
          device_id: deviceId,
          date: date,
          scans_used: scansUsed,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'device_id,date',
        }
      );

    return { data, error };
  },

  /**
   * Call the RPC function to check and increment limit atomically
   */
  async checkAndIncrementLimit(deviceId: string, limitDate: string, maxScans: number = 3) {
    const { data, error } = await supabase.rpc('check_and_increment_limit', {
      device_id: deviceId,
      limit_date: limitDate,
      max_scans: maxScans,
    });

    return { data, error };
  },

  /**
   * Get analytics data for admin purposes (optional)
   */
  async getUsageAnalytics(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('daily_limits')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    return { data, error };
  },
};

// Types for Supabase tables
export interface DailyLimitRow {
  id: number;
  device_id: string;
  date: string;
  scans_used: number;
  created_at: string;
  updated_at: string;
}

// RPC function response type
export interface CheckLimitResponse {
  can_scan: boolean;
  scans_used: number;
  scans_remaining: number;
}

// Error handling helper
export function handleSupabaseError(error: any): string {
  if (!error) return '';
  
  // Common Supabase error codes
  switch (error.code) {
    case 'PGRST116':
      return 'No data found';
    case '23505':
      return 'Duplicate entry';
    case '23503':
      return 'Invalid reference';
    case '42501':
      return 'Insufficient permissions';
    default:
      return error.message || 'An unknown error occurred';
  }
}