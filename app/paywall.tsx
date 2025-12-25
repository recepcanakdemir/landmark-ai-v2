import { StyleSheet, Alert, View, Dimensions, Switch, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { RevenueCatPackage } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams<{ source?: string }>();
  
  // RevenueCat integration
  const { 
    currentOffering, 
    isPro, 
    isLoading: revenueCatLoading, 
    error: revenueCatError,
    purchasePackage,
    restorePurchases 
  } = useRevenueCat();
  
  const [selectedPackage, setSelectedPackage] = useState<RevenueCatPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [isTrialEnabled, setIsTrialEnabled] = useState(false); // Default to lifetime (trial OFF)

  useEffect(() => {
    initializeSelectedPackage();
  }, [currentOffering]);

  useEffect(() => {
    // Redirect if user is already pro
    if (isPro) {
      router.back();
    }
  }, [isPro]);

  const initializeSelectedPackage = () => {
    if (!currentOffering) return;
    
    // Default to lifetime package (trial OFF), fallback to first available
    const defaultPackage = currentOffering.lifetime || 
                          currentOffering.availablePackages.find(pkg => 
                            pkg.packageType === 'LIFETIME'
                          ) ||
                          currentOffering.availablePackages[0] || 
                          null;
    setSelectedPackage(defaultPackage);
  };

  // Trial Toggle Logic - Toggle between Weekly (trial ON) and Lifetime (trial OFF)
  const handleTrialToggle = (value: boolean) => {
    setIsTrialEnabled(value);
    
    if (currentOffering) {
      if (value) {
        // Trial enabled: Select weekly package
        const weeklyPackage = currentOffering.weekly || 
                             currentOffering.availablePackages.find(pkg => 
                               pkg.packageType === 'WEEKLY' || 
                               pkg.packageType.includes('WEEKLY')
                             );
        if (weeklyPackage) {
          setSelectedPackage(weeklyPackage);
        }
      } else {
        // Trial disabled: Select lifetime package  
        const lifetimePackage = currentOffering.lifetime || 
                               currentOffering.availablePackages.find(pkg => 
                                 pkg.packageType === 'LIFETIME'
                               );
        if (lifetimePackage) {
          setSelectedPackage(lifetimePackage);
        }
      }
    }
  };

  // Package Selection Logic - Also update toggle state
  const handlePackageSelect = (pkg: RevenueCatPackage) => {
    setSelectedPackage(pkg);
    
    // Update trial toggle based on package type
    if (pkg.packageType === 'WEEKLY') {
      setIsTrialEnabled(true);
    } else if (pkg.packageType === 'LIFETIME' || pkg.packageType === 'ANNUAL') {
      setIsTrialEnabled(false);
    }
  };

  const handlePurchase = async () => {
    if (purchasing) return;
    
    // Ensure a package is selected
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan.');
      return;
    }
    
    setPurchasing(true);
    
    try {
      console.log('Purchasing package:', selectedPackage.identifier);
      const success = await purchasePackage(selectedPackage);
      
      if (success) {
        // Success handling is done in the RevenueCat provider
        handleSmartNavigation();
      }
      // Error handling is also done in the RevenueCat provider
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      // Generic error handling (specific errors are handled in RevenueCat provider)
      if (!error?.userCancelled) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setPurchasing(true);
      console.log('🔄 Paywall: Starting restore purchases...');
      
      const restoreSuccess = await restorePurchases();
      console.log('📊 Paywall: Restore result -', restoreSuccess ? 'SUCCESS' : 'NO_PURCHASES');
      
      // If restore was successful, navigate away from paywall
      if (restoreSuccess) {
        console.log('✅ Paywall: Restore successful - navigating away');
        handleSmartNavigation();
      }
      // If no purchases found, user stays on paywall (RevenueCat shows alert)
      
    } catch (error) {
      console.error('💥 Paywall: Restore error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleClose = () => {
    handleSmartNavigation();
  };

  const handleSmartNavigation = () => {
    // Smart navigation based on how the paywall was opened
    if (source === 'app_launch') {
      // If opened from app launch, navigate to main tabs
      // since there's no previous screen to go back to
      console.log('🏠 Paywall: Navigating to main tabs (app launch source)');
      router.replace('/(tabs)');
    } else {
      // For other sources (settings, scan_limit), go back normally
      console.log('🔙 Paywall: Going back to previous screen');
      router.back();
    }
  };

  const handleTermsPress = async () => {
    const termsUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
    try {
      await Linking.openURL(termsUrl);
    } catch (error) {
      console.error('Failed to open Terms URL:', error);
      Alert.alert('Error', 'Unable to open Terms of Use. Please try again later.');
    }
  };

  const handlePrivacyPress = async () => {
    const privacyUrl = 'https://www.freeprivacypolicy.com/live/d267bff4-586c-40d4-a03f-e425112f455d';
    try {
      await Linking.openURL(privacyUrl);
    } catch (error) {
      console.error('Failed to open Privacy URL:', error);
      Alert.alert('Error', 'Unable to open Privacy Policy. Please try again later.');
    }
  };

  const getButtonText = () => {
    if (purchasing) return 'Processing...';
    
    // Show "Start Free Trial" if trial is enabled and weekly package selected
    if (isTrialEnabled && selectedPackage?.packageType === 'WEEKLY') {
      return 'Start Free Trial';
    }
    
    return 'Subscribe';
  };

  // Show loading screen while RevenueCat is initializing
  if (revenueCatLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading subscription plans...
        </ThemedText>
      </View>
    );
  }

  // Show error state if RevenueCat failed to load
  if (revenueCatError) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <IconSymbol name="xmark" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <IconSymbol name="wifi.slash" size={64} color={colors.textTertiary} />
        <ThemedText style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Unable to Load Plans
        </ThemedText>
        <ThemedText style={[styles.errorText, { color: colors.textSecondary }]}>
          Please check your internet connection and try again.
        </ThemedText>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.continueButtonText}>Try Again Later</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  // Get available packages for rendering
  const availablePackages = currentOffering?.availablePackages || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header with Restore and Close Buttons */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <ThemedText style={[styles.restoreText, { color: colors.textTertiary }]}>
            Restore
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <IconSymbol name="xmark" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 80, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Paywall Icon */}
        <View style={styles.heroSection}>
          <Image
            source={require('../assets/images/paywall-icon.png')}
            style={styles.heroImage}
            contentFit="contain"
          />
        </View>

        {/* Main Title */}
        <View style={styles.titleSection}>
          <ThemedText style={[styles.mainTitle, { color: colors.textPrimary }]}>
            Get Unlimited Access
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your personal travel historian
          </ThemedText>
        </View>

        {/* Features List - Compact */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <IconSymbol name="camera.viewfinder" size={18} color={colors.primary} />
            <ThemedText style={[styles.featureText, { color: colors.textPrimary }]}>
              Unlimited landmark & Art identification
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="sparkles" size={18} color={colors.primary} />
            <ThemedText style={[styles.featureText, { color: colors.textPrimary }]}>
              Detailed AI analysis & history
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="globe" size={18} color={colors.primary} />
            <ThemedText style={[styles.featureText, { color: colors.textPrimary }]}>
              Save & collect places
            </ThemedText>
          </View>
        </View>

        {/* Trial Toggle */}
        <View style={styles.trialSection}>
          <ThemedText style={[styles.trialLabel, { color: colors.textPrimary }]}>
            Enable Free Trial
          </ThemedText>
          <Switch
            value={isTrialEnabled}
            onValueChange={handleTrialToggle}
            trackColor={{ false: colors.textTertiary, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        {/* Plan Selection Cards */}
        <View style={styles.plansContainer}>
          {availablePackages.length > 0 ? (
            availablePackages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const isAnnual = pkg.packageType === 'ANNUAL';
              const isLifetime = pkg.packageType === 'LIFETIME';
              const isPopular = isAnnual || isLifetime; // Mark annual and lifetime plans as popular
              const cardColor = (isAnnual || isLifetime) ? colors.warning : colors.primary;
              
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.planCard,
                    {
                      borderColor: isSelected ? cardColor : colors.cardBorder,
                      backgroundColor: isSelected ? `${cardColor}15` : colors.card,
                    }
                  ]}
                  onPress={() => handlePackageSelect(pkg)}
                >
                  {isPopular && (
                    <View style={[styles.bestOfferTag, { backgroundColor: cardColor }]}>
                      <ThemedText style={styles.bestOfferText}>BEST OFFER</ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.planContent}>
                    <View style={styles.planInfo}>
                      <ThemedText style={[styles.planName, { color: colors.textPrimary }]}>
                        {pkg.product.title || pkg.packageType}
                      </ThemedText>
                      {/* Show auto-renewal under plan name for subscription packages */}
                      {pkg.packageType !== 'LIFETIME' && (
                        <ThemedText style={[styles.autoRenewText, { color: colors.textTertiary }]}>
                          Auto-renews
                        </ThemedText>
                      )}
                    </View>
                    
                    <View style={styles.planPricing}>
                      {/* Show trial info for weekly packages when trial is enabled */}
                      {pkg.packageType === 'WEEKLY' && isTrialEnabled ? (
                        <View style={styles.trialPricing}>
                          <ThemedText style={[styles.trialText, { color: colors.success }]}>
                            3 days free
                          </ThemedText>
                          <ThemedText style={[styles.thenText, { color: colors.textSecondary }]}>
                            then {pkg.product.priceString}/week
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.regularPricing}>
                          <ThemedText style={[styles.planPrice, { color: colors.textPrimary }]}>
                            {pkg.product.priceString}
                          </ThemedText>
                          <ThemedText style={[styles.planPeriod, { color: colors.textSecondary }]}>
                            {pkg.packageType === 'LIFETIME' ? 'one-time' : 
                             pkg.packageType === 'ANNUAL' ? '/ year' : '/ week'}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={[
                    styles.radioButton,
                    {
                      borderColor: cardColor,
                      backgroundColor: isSelected ? cardColor : 'transparent'
                    }
                  ]}>
                    {isSelected && (
                      <IconSymbol name="checkmark" size={10} color={colors.surface} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            // Fallback for when no packages are available (should only happen in development)
            <View style={styles.noPlansContainer}>
              <ThemedText style={[styles.noPlansText, { color: colors.textSecondary }]}>
                {revenueCatError 
                  ? 'Unable to load subscription plans'
                  : 'No subscription plans available'
                }
              </ThemedText>
              <ThemedText style={[styles.noPlansSubtext, { color: colors.textTertiary }]}>
                Please check your internet connection and try again later.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Continue Button - Only show if packages available */}
        {availablePackages.length > 0 && (
          <TouchableOpacity
            style={[
              styles.continueButton, 
              { 
                backgroundColor: colors.primary,
                opacity: (purchasing || !selectedPackage) ? 0.6 : 1 
              }
            ]}
            onPress={handlePurchase}
            disabled={purchasing || !selectedPackage}
          >
            <ThemedText style={styles.continueButtonText}>
              {getButtonText()}
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Bottom Footer with Legal Links and Security Note */}
        <View style={styles.bottomFooter}>
          <TouchableOpacity style={styles.footerLeft} onPress={handleTermsPress}>
            <ThemedText style={[styles.legalLink, { color: colors.textTertiary }]}>
              Terms
            </ThemedText>
          </TouchableOpacity>
          
          <View style={styles.footerCenter}>
            <IconSymbol name="checkmark.shield.fill" size={16} color={colors.success} />
            <ThemedText style={[styles.securityText, { color: colors.textSecondary }]}>
              {isTrialEnabled && selectedPackage?.packageType === 'WEEKLY' 
                ? 'Cancel anytime during trial' 
                : 'Secure payments'}
            </ThemedText>
          </View>
          
          <TouchableOpacity style={styles.footerRight} onPress={handlePrivacyPress}>
            <ThemedText style={[styles.legalLink, { color: colors.textTertiary }]}>
              Privacy
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  restoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Hero Section
  heroSection: {
    height: SCREEN_HEIGHT * 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 12,
    marginHorizontal: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    maxWidth: 200,
    maxHeight: 160,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  
  // Title Section
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  
  // Features
  featuresContainer: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  
  // Trial Toggle
  trialSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  trialLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Plans
  plansContainer: {
    marginBottom: 24,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  planContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  trialBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearlySubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
  planPricing: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  trialPricing: {
    alignItems: 'flex-end',
  },
  regularPricing: {
    alignItems: 'flex-end',
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
  },
  thenText: {
    fontSize: 12,
    marginTop: 2,
  },
  autoRenewText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 1,
    opacity: 0.8,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 12,
    opacity: 0.7,
  },
  bestOfferTag: {
    position: 'absolute',
    top: -12,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestOfferText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Continue Button
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Bottom Footer
  bottomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  footerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  footerCenter: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  securityText: {
    fontSize: 13,
    marginLeft: 8,
  },
  legalLink: {
    fontSize: 12,
  },
  
  // Loading States
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Error States
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  
  // No Plans Container
  noPlansContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPlansText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  noPlansSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
});