import { StyleSheet, Alert, View, Dimensions, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startTrial, getTrialState } from '@/services/limitService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type PlanType = 'weekly' | 'yearly';

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams<{ source?: string }>();
  
  const [isTrialEnabled, setIsTrialEnabled] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('weekly');
  const [purchasing, setPurchasing] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  useEffect(() => {
    checkTrialAvailability();
  }, []);

  const checkTrialAvailability = async () => {
    try {
      const trialState = await getTrialState();
      setHasUsedTrial(trialState.hasUsedTrial);
      
      // If trial has been used, disable trial toggle and default to yearly plan
      if (trialState.hasUsedTrial) {
        setIsTrialEnabled(false);
        setSelectedPlan('yearly');
      }
    } catch (error) {
      console.error('Error checking trial availability:', error);
    }
  };

  // Trial Toggle Logic
  const handlePlanSelect = (plan: PlanType) => {
    if (plan === 'yearly') {
      setIsTrialEnabled(false);
      setSelectedPlan('yearly');
    } else {
      setIsTrialEnabled(true);
      setSelectedPlan('weekly');
    }
  };

  const handleTrialToggle = (value: boolean) => {
    // Prevent enabling trial if it's already been used
    if (value && hasUsedTrial) {
      Alert.alert(
        'Trial Used',
        'You have already used your free trial on this device.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setIsTrialEnabled(value);
    if (value) {
      setSelectedPlan('weekly');
    }
  };

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    
    try {
      // Handle trial activation
      if (isTrialEnabled && selectedPlan === 'weekly') {
        const trialState = await startTrial();
        
        Alert.alert(
          'Trial Started!',
          `Enjoy 3 days of unlimited scans! Your trial ends on ${new Date(trialState.endDate).toLocaleDateString()}.`,
          [{ text: 'Start Exploring', onPress: () => router.back() }]
        );
        return;
      }
      
      // Handle subscription purchase (placeholder)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success!',
        'Welcome to LandmarkAI Premium! You now have unlimited access.',
        [{ text: 'Start Exploring', onPress: () => router.dismissAll() }]
      );
    } catch (error: any) {
      console.error('Purchase/Trial error:', error);
      
      if (error?.message?.includes('already been used')) {
        Alert.alert(
          'Trial Already Used',
          'You have already used your free trial. Please subscribe to continue with unlimited access.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'We\'ll check for any existing purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => console.log('Restore purchases') },
      ]
    );
  };

  const handleClose = () => {
    router.back();
  };

  const getButtonText = () => {
    return isTrialEnabled ? 'Start Free Trial' : 'Subscribe';
  };

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
        {/* Hero Section - Placeholder */}
        <View style={[styles.heroSection, { backgroundColor: colors.backgroundSecondary }]}>
          {/* Image placeholder */}
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
              Unlimited landmark identification
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
            {hasUsedTrial ? 'Trial Already Used' : 'Free Trial Enabled'}
          </ThemedText>
          <Switch
            value={isTrialEnabled}
            onValueChange={handleTrialToggle}
            trackColor={{ false: colors.textTertiary, true: colors.primary }}
            thumbColor={colors.surface}
            disabled={hasUsedTrial}
          />
        </View>

        {/* Plan Selection Cards */}
        <View style={styles.plansContainer}>
          {/* Weekly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                borderColor: selectedPlan === 'weekly' ? colors.primary : colors.cardBorder,
                backgroundColor: selectedPlan === 'weekly' ? `${colors.primary}15` : colors.card,
              }
            ]}
            onPress={() => handlePlanSelect('weekly')}
          >
            <View style={styles.planContent}>
              <View style={styles.planInfo}>
                <ThemedText style={[styles.planName, { color: colors.textPrimary }]}>
                  Weekly
                </ThemedText>
                {isTrialEnabled && (
                  <ThemedText style={[styles.trialBadge, { color: colors.primary }]}>
                    3 Days Free
                  </ThemedText>
                )}
              </View>
              <View style={styles.planPricing}>
                <ThemedText style={[styles.planPrice, { color: colors.textPrimary }]}>
                  ₺49.99
                </ThemedText>
                <ThemedText style={[styles.planPeriod, { color: colors.textSecondary }]}>
                  / week
                </ThemedText>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              {
                borderColor: colors.primary,
                backgroundColor: selectedPlan === 'weekly' ? colors.primary : 'transparent'
              }
            ]}>
              {selectedPlan === 'weekly' && (
                <IconSymbol name="checkmark" size={10} color={colors.surface} />
              )}
            </View>
          </TouchableOpacity>

          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                borderColor: selectedPlan === 'yearly' ? colors.warning : colors.cardBorder,
                backgroundColor: selectedPlan === 'yearly' ? `${colors.warning}15` : colors.card,
              }
            ]}
            onPress={() => handlePlanSelect('yearly')}
          >
            <View style={[styles.bestOfferTag, { backgroundColor: colors.warning }]}>
              <ThemedText style={styles.bestOfferText}>BEST OFFER</ThemedText>
            </View>
            <View style={styles.planContent}>
              <View style={styles.planInfo}>
                <ThemedText style={[styles.planName, { color: colors.textPrimary }]}>
                  Yearly
                </ThemedText>
                <ThemedText style={[styles.yearlySubtext, { color: colors.textSecondary }]}>
                  ₺499.99 / year
                </ThemedText>
              </View>
              <View style={styles.planPricing}>
                <ThemedText style={[styles.planPrice, { color: colors.textPrimary }]}>
                  ₺9.61
                </ThemedText>
                <ThemedText style={[styles.planPeriod, { color: colors.textSecondary }]}>
                  / week
                </ThemedText>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              {
                borderColor: colors.warning,
                backgroundColor: selectedPlan === 'yearly' ? colors.warning : 'transparent'
              }
            ]}>
              {selectedPlan === 'yearly' && (
                <IconSymbol name="checkmark" size={10} color={colors.surface} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          <ThemedText style={styles.continueButtonText}>
            {purchasing ? 'Processing...' : getButtonText()}
          </ThemedText>
        </TouchableOpacity>

        {/* Bottom Footer with Legal Links and Security Note */}
        <View style={styles.bottomFooter}>
          <TouchableOpacity style={styles.footerLeft}>
            <ThemedText style={[styles.legalLink, { color: colors.textTertiary }]}>
              Terms
            </ThemedText>
          </TouchableOpacity>
          
          {isTrialEnabled && (
            <View style={styles.footerCenter}>
              <IconSymbol name="checkmark.shield.fill" size={16} color={colors.success} />
              <ThemedText style={[styles.securityText, { color: colors.textSecondary }]}>
                No payment required now
              </ThemedText>
            </View>
          )}
          
          <TouchableOpacity style={styles.footerRight}>
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
});