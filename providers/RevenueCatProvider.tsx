import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import {
  RevenueCatContextValue,
  RevenueCatCustomerInfo,
  RevenueCatOfferings,
  RevenueCatOffering,
  RevenueCatPackage,
} from '@/types';

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

interface RevenueCatProviderProps {
  children: ReactNode;
}

const PRO_ENTITLEMENT_ID = 'premium';

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const [customerInfo, setCustomerInfo] = useState<RevenueCatCustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<RevenueCatOfferings | null>(null);
  const [currentOffering, setCurrentOffering] = useState<RevenueCatOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize RevenueCat
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      console.log('🚀 RevenueCat Provider: Starting initialization...');
      setIsLoading(true);
      setError(null);

      // Get iOS API key from app config (iOS-only app)
      const iosApiKey = Constants.expoConfig?.extra?.revenueCatApiKeyIos;
      console.log('🔑 RevenueCat API Key found:', iosApiKey ? 'Yes' : 'No');

      if (!iosApiKey) {
        throw new Error('iOS RevenueCat API key not found in app configuration');
      }
      
      if (iosApiKey === 'YOUR_IOS_API_KEY_HERE') {
        console.warn('⚠️ RevenueCat iOS API key not properly configured, running in test mode');
        setIsLoading(false);
        return;
      }

      console.log('⚙️ Configuring RevenueCat with API key...');
      await Purchases.configure({ apiKey: iosApiKey });
      console.log('✅ RevenueCat configuration complete');

      // Set up listener for customer info updates
      Purchases.addCustomerInfoUpdateListener((info) => {
        console.log('🔄 RevenueCat customer info updated:', JSON.stringify({
          originalAppUserId: info.originalAppUserId,
          activeEntitlements: Object.keys(info.entitlements.active),
          allEntitlements: Object.keys(info.entitlements.all),
          latestExpirationDate: info.latestExpirationDate,
          isProActive: info.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive
        }, null, 2));
        setCustomerInfo(info);
      });

      // Get initial customer info and offerings
      console.log('📡 Fetching initial customer info and offerings...');
      await Promise.all([
        refreshCustomerInfo(),
        fetchOfferings()
      ]);
      
      console.log('✅ RevenueCat Provider initialization complete');

    } catch (err) {
      console.error('💥 Failed to initialize RevenueCat:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCustomerInfo = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing RevenueCat customer info...');
      const info = await Purchases.getCustomerInfo();
      
      console.log('📊 RevenueCat customer info refreshed:', JSON.stringify({
        originalAppUserId: info.originalAppUserId,
        activeEntitlements: Object.keys(info.entitlements.active),
        allEntitlements: Object.keys(info.entitlements.all),
        latestExpirationDate: info.latestExpirationDate,
        isProActive: info.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive,
        proEntitlementDetails: info.entitlements.active[PRO_ENTITLEMENT_ID] || info.entitlements.all[PRO_ENTITLEMENT_ID]
      }, null, 2));
      
      setCustomerInfo(info);
    } catch (err) {
      console.error('💥 Failed to refresh customer info:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh customer info');
    }
  };

  const fetchOfferings = async (): Promise<void> => {
    try {
      const fetchedOfferings = await Purchases.getOfferings();
      console.log('RevenueCat offerings fetched:', fetchedOfferings);
      setOfferings(fetchedOfferings);
      setCurrentOffering(fetchedOfferings.current);
    } catch (err) {
      console.error('Failed to fetch offerings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription plans');
    }
  };

  const purchasePackage = async (packageToPurchase: RevenueCatPackage): Promise<boolean> => {
    try {
      setError(null);
      console.log('Attempting to purchase package:', packageToPurchase.identifier);
      
      const { customerInfo: updatedCustomerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      console.log('Purchase successful:', updatedCustomerInfo);
      setCustomerInfo(updatedCustomerInfo);
      
      // Check if the purchase activated the pro entitlement
      const isPurchaseSuccessful = updatedCustomerInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive === true;
      
      if (isPurchaseSuccessful) {
        Alert.alert(
          'Purchase Successful! 🎉',
          'Welcome to LandmarkAI Pro! You now have unlimited scans and access to all features.',
          [{ text: 'Continue', style: 'default' }]
        );
      }
      
      return isPurchaseSuccessful;
    } catch (err) {
      console.error('Purchase failed:', err);
      
      // Handle user cancellation gracefully
      if (err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled) {
        console.log('User cancelled the purchase');
        return false;
      }
      
      // Handle other purchase errors
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
      setError(errorMessage);
      
      Alert.alert(
        'Purchase Failed',
        'There was an issue processing your purchase. Please try again or contact support if the problem persists.',
        [{ text: 'OK', style: 'default' }]
      );
      
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      setError(null);
      console.log('🔄 RevenueCat: Attempting to restore purchases...');
      
      const restoredInfo = await Purchases.restorePurchases();
      
      console.log('📊 RevenueCat: Restore response received:');
      console.log('- Original App User ID:', restoredInfo.originalAppUserId);
      console.log('- Active Entitlements:', Object.keys(restoredInfo.entitlements.active));
      console.log('- All Entitlements:', Object.keys(restoredInfo.entitlements.all));
      console.log('- Latest Expiration Date:', restoredInfo.latestExpirationDate);
      
      setCustomerInfo(restoredInfo);
      
      // Check if any active entitlements were restored
      const hasActiveEntitlements = Object.keys(restoredInfo.entitlements.active).length > 0;
      const isProRestored = restoredInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive === true;
      
      console.log('🔍 RevenueCat: Checking restored entitlements:');
      console.log('- Has Active Entitlements:', hasActiveEntitlements);
      console.log('- Premium Entitlement Active:', isProRestored);
      
      if (isProRestored) {
        const proEntitlement = restoredInfo.entitlements.active[PRO_ENTITLEMENT_ID];
        console.log('✅ RevenueCat: Premium entitlement details:');
        console.log('- Product ID:', proEntitlement.productIdentifier);
        console.log('- Will Renew:', proEntitlement.willRenew);
        console.log('- Period Type:', proEntitlement.periodType);
        console.log('- Expiration Date:', proEntitlement.expirationDate);
        console.log('- Store:', proEntitlement.store);
      }
      
      if (hasActiveEntitlements) {
        console.log('🎉 RevenueCat: Showing restore success alert');
        Alert.alert(
          'Purchases Restored! ✅',
          isProRestored 
            ? 'Your premium subscription has been restored. You now have unlimited access to all features.'
            : 'Your previous purchases have been restored.',
          [{ text: 'Continue', style: 'default' }]
        );
      } else {
        console.log('❌ RevenueCat: No purchases found - showing alert');
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found for this account.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      console.log(`📊 RevenueCat: Restore completed - ${hasActiveEntitlements ? 'SUCCESS' : 'NO_PURCHASES'}`);
      return hasActiveEntitlements;
    } catch (err) {
      console.error('💥 RevenueCat: Failed to restore purchases:', err);
      console.error('💥 RevenueCat: Error details:', JSON.stringify(err, null, 2));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      setError(errorMessage);
      
      console.log('🚨 RevenueCat: Showing restore error alert');
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please check your internet connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
      
      return false;
    }
  };

  // Calculate if user has pro access based on entitlements
  const isPro = customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive === true;
  
  // Log when isPro status changes
  useEffect(() => {
    console.log('🎯 RevenueCat Provider: isPro status changed to:', isPro);
    console.log('🎯 Customer info details:', {
      hasCustomerInfo: !!customerInfo,
      activeEntitlements: customerInfo ? Object.keys(customerInfo.entitlements.active) : [],
      proEntitlementActive: customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive,
      proEntitlementExists: !!customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]
    });
  }, [isPro, customerInfo]);

  const value: RevenueCatContextValue = {
    customerInfo,
    offerings,
    currentOffering,
    isPro,
    isLoading,
    error,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat(): RevenueCatContextValue {
  const context = useContext(RevenueCatContext);
  
  if (!context) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  
  return context;
}

// Export the provider as default for convenience
export default RevenueCatProvider;