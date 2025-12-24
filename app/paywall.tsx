import { StyleSheet, Pressable, Alert, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PaywallScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const [selectedPlan, setSelectedPlan] = useState('weekly');
  const [purchasing, setPurchasing] = useState(false);

  const plans = [
    {
      id: 'weekly',
      name: 'Weekly Premium',
      price: '$4.99',
      period: '/week',
      trial: '3-day free trial',
      savings: null,
      recommended: true,
    },
    {
      id: 'monthly',
      name: 'Monthly Premium',
      price: '$14.99',
      period: '/month',
      trial: '3-day free trial',
      savings: 'Save 25%',
      recommended: false,
    },
  ];

  const features = [
    {
      icon: 'infinity',
      title: 'Unlimited Scans',
      description: 'Scan as many landmarks as you want, no daily limits',
    },
    {
      icon: 'message.fill',
      title: 'AI Chat',
      description: 'Chat with landmarks to learn deeper insights and stories',
    },
    {
      icon: 'location.fill',
      title: 'Nearby Places',
      description: 'Discover must-see places and restaurants near landmarks',
    },
    {
      icon: 'star.fill',
      title: 'Premium Support',
      description: 'Get priority customer support and feature requests',
    },
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handlePurchase = async () => {
    if (purchasing) return;

    setPurchasing(true);
    
    try {
      // TODO: Implement RevenueCat purchase flow
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate purchase
      
      Alert.alert(
        'Success!',
        'Welcome to LandmarkAI Premium! You now have unlimited access to all features.',
        [
          {
            text: 'Start Exploring',
            onPress: () => router.dismissAll()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
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
    if (source === 'scan_limit') {
      // If came from scan limit, don't allow dismissal
      Alert.alert(
        'Upgrade Required',
        'You\'ve reached your daily scan limit. Upgrade to continue scanning landmarks.',
        [{ text: 'OK' }]
      );
    } else {
      router.back();
    }
  };

  const getHeaderMessage = () => {
    switch (source) {
      case 'scan_limit':
        return {
          title: 'Daily Limit Reached',
          subtitle: 'Upgrade for unlimited landmark scans'
        };
      case 'chat_feature':
        return {
          title: 'Chat with Landmarks',
          subtitle: 'Unlock AI conversations about history and architecture'
        };
      default:
        return {
          title: 'Unlock LandmarkAI Premium',
          subtitle: 'Discover unlimited stories and secrets'
        };
    }
  };

  const headerMessage = getHeaderMessage();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <ThemedView style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.background }]}>
        {source !== 'scan_limit' && (
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <IconSymbol name="xmark" size={20} color={Colors[colorScheme ?? 'light'].text} />
          </Pressable>
        )}
        
        <ThemedText type="title" style={styles.title}>
          {headerMessage.title}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {headerMessage.subtitle}
        </ThemedText>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Features */}
        <ThemedView style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <ThemedView key={index} style={styles.featureItem}>
              <IconSymbol 
                name={feature.icon} 
                size={24} 
                color={Colors[colorScheme ?? 'light'].tint} 
              />
              <ThemedView style={styles.featureTexts}>
                <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
                <ThemedText style={styles.featureDescription}>
                  {feature.description}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>

        {/* Pricing Plans */}
        <ThemedView style={styles.plansContainer}>
          {plans.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                {
                  borderColor: selectedPlan === plan.id 
                    ? Colors[colorScheme ?? 'light'].tint 
                    : Colors[colorScheme ?? 'light'].icon,
                  backgroundColor: selectedPlan === plan.id 
                    ? `${Colors[colorScheme ?? 'light'].tint}10` 
                    : 'transparent'
                }
              ]}
              onPress={() => handlePlanSelect(plan.id)}
            >
              {plan.recommended && (
                <ThemedView style={[styles.recommendedBadge, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
                  <ThemedText style={styles.recommendedText}>Most Popular</ThemedText>
                </ThemedView>
              )}
              
              <ThemedView style={styles.planHeader}>
                <ThemedText style={styles.planName}>{plan.name}</ThemedText>
                {plan.savings && (
                  <ThemedText style={[styles.savingsText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                    {plan.savings}
                  </ThemedText>
                )}
              </ThemedView>
              
              <ThemedView style={styles.priceContainer}>
                <ThemedText style={styles.price}>{plan.price}</ThemedText>
                <ThemedText style={styles.period}>{plan.period}</ThemedText>
              </ThemedView>
              
              <ThemedText style={styles.trial}>{plan.trial}</ThemedText>
              
              <ThemedView style={[styles.selectIndicator, {
                backgroundColor: selectedPlan === plan.id 
                  ? Colors[colorScheme ?? 'light'].tint 
                  : 'transparent',
                borderColor: Colors[colorScheme ?? 'light'].tint
              }]}>
                {selectedPlan === plan.id && (
                  <IconSymbol name="checkmark" size={16} color="white" />
                )}
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>
      </ScrollView>

      {/* Bottom Actions */}
      <ThemedView style={styles.bottomActions}>
        <Pressable
          style={[styles.purchaseButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          <ThemedText style={styles.purchaseButtonText}>
            {purchasing ? 'Processing...' : 'Start Free Trial'}
          </ThemedText>
        </Pressable>
        
        <Pressable style={styles.restoreButton} onPress={handleRestore}>
          <ThemedText style={styles.restoreButtonText}>Restore Purchases</ThemedText>
        </Pressable>
        
        <ThemedText style={styles.disclaimer}>
          Free trial automatically converts to subscription. Cancel anytime.
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 8,
  },
  content: {
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureTexts: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
    lineHeight: 20,
  },
  plansContainer: {
    marginBottom: 20,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 16,
    opacity: 0.7,
    marginLeft: 2,
  },
  trial: {
    fontSize: 14,
    opacity: 0.8,
  },
  selectIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  purchaseButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    opacity: 0.7,
  },
  disclaimer: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});