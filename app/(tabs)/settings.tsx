import { StyleSheet, Pressable, Alert, ScrollView, View, ActionSheetIOS, Platform, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TabHeader } from '@/components/TabHeader';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme, ThemePreference } from '@/contexts/ThemeContext';
import { getCachedSubscriptionStatus, refreshSubscriptionStatus } from '@/services/limitService';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { SubscriptionStatus } from '@/types';
import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';
import { requestManualReview } from '@/services/reviewService';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { preference, setThemePreference } = useTheme();
  const { restorePurchases } = useRevenueCat();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  const getAppVersion = (): string => {
    const version = Constants.expoConfig?.version || '1.0.0';
    return `LandmarkAI v${version}`;
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      let status = await getCachedSubscriptionStatus();
      if (!status) {
        status = await refreshSubscriptionStatus();
      }
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePress = () => {
    router.push('/paywall?source=settings');
  };

  const handleRestorePurchases = async () => {
    Alert.alert(
      t('settings.restorePurchases'),
      t('settings.restoreConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.restoreButton'),
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🔄 Settings: Starting restore purchases...');
              
              // Use RevenueCat provider's restore method
              const restoreSuccess = await restorePurchases();
              
              // Refresh our local subscription status after restore
              const status = await refreshSubscriptionStatus();
              setSubscriptionStatus(status);
              
              console.log('📊 Settings: Restore result -', restoreSuccess ? 'SUCCESS' : 'NO_PURCHASES');
              console.log('📊 Settings: Updated status -', status.isPremium ? 'PREMIUM' : 'FREE');
              
              // Note: The RevenueCat provider already shows success/failure alerts
              // We just need to refresh our local state
              
            } catch (error) {
              console.error('💥 Settings: Restore error:', error);
              Alert.alert(t('common.error'), t('settings.restoreError'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };


  const handleNotificationsPress = () => {
    Alert.alert(
      t('settings.notifications'),
      t('settings.notificationsFuture'),
      [{ text: t('common.ok') }]
    );
  };

  const handleSupportPress = () => {
    Alert.alert(
      t('settings.support'),
      t('settings.supportMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.contactSupport'), onPress: handleEmailSupport },
      ]
    );
  };

  const handleEmailSupport = async () => {
    const emailUrl = 'mailto:landmarkaiguide@gmail.com?subject=LandmarkAI Support Request';
    try {
      await Linking.openURL(emailUrl);
    } catch (error) {
      console.error('Failed to open email client:', error);
      Alert.alert(t('common.error'), 'Unable to open email client. Please email us directly at landmarkaiguide@gmail.com');
    }
  };

  const handlePrivacyPress = async () => {
    const privacyUrl = 'https://www.freeprivacypolicy.com/live/d267bff4-586c-40d4-a03f-e425112f455d';
    try {
      await Linking.openURL(privacyUrl);
    } catch (error) {
      console.error('Failed to open Privacy URL:', error);
      Alert.alert(t('common.error'), 'Unable to open Privacy Policy. Please try again later.');
    }
  };

  const handleTermsPress = async () => {
    const termsUrl = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
    try {
      await Linking.openURL(termsUrl);
    } catch (error) {
      console.error('Failed to open Terms URL:', error);
      Alert.alert(t('common.error'), 'Unable to open Terms of Use. Please try again later.');
    }
  };

  const handleRateAppPress = async () => {
    try {
      await requestManualReview();
    } catch (error) {
      console.error('Failed to request app review:', error);
      Alert.alert(t('common.error'), 'Unable to open App Store review. Please try again later.');
    }
  };

  const getThemeDisplayText = (preference: ThemePreference): string => {
    switch (preference) {
      case 'system': return t('settings.system');
      case 'light': return t('settings.light');
      case 'dark': return t('settings.dark');
      default: return t('settings.system');
    }
  };

  const handleThemePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', '📱 System Default', '☀️ Light Mode', '🌙 Dark Mode'],
          cancelButtonIndex: 0,
          title: t('settings.chooseAppearance'),
          message: 'Select your preferred theme',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setThemePreference('system');
          else if (buttonIndex === 2) setThemePreference('light');
          else if (buttonIndex === 3) setThemePreference('dark');
        }
      );
    } else {
      // Android fallback using Alert
      Alert.alert(
        t('settings.chooseAppearance'),
        'Select your preferred theme',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: '📱 System Default', onPress: () => setThemePreference('system') },
          { text: '☀️ Light Mode', onPress: () => setThemePreference('light') },
          { text: '🌙 Dark Mode', onPress: () => setThemePreference('dark') },
        ]
      );
    }
  };

  const getCurrentLanguageDisplayText = (): string => {
    const currentLang = i18n.language?.split('-')[0] || 'en';
    return SUPPORTED_LANGUAGES[currentLang as SupportedLanguage] || 'English';
  };

  const handleLanguagePress = () => {
    const getLanguageFlag = (code: string): string => {
      switch (code) {
        case 'en': return '🇺🇸';
        case 'tr': return '🇹🇷';
        case 'es': return '🇪🇸';
        case 'fr': return '🇫🇷';
        case 'de': return '🇩🇪';
        case 'it': return '🇮🇹';
        case 'zh': return '🇨🇳';
        case 'ja': return '🇯🇵';
        case 'pl': return '🇵🇱';
        case 'ru': return '🇷🇺';
        case 'pt': return '🇵🇹';
        case 'ar': return '🇸🇦';
        case 'ko': return '🇰🇷';
        case 'nl': return '🇳🇱';
        case 'sv': return '🇸🇪';
        case 'no': return '🇳🇴';
        case 'da': return '🇩🇰';
        case 'cs': return '🇨🇿';
        default: return '🌍';
      }
    };

    const languageOptions = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => 
      `${getLanguageFlag(code)} ${name}`
    );

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...languageOptions],
          cancelButtonIndex: 0,
          title: t('settings.language'),
          message: 'Select your preferred language',
        },
        async (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedLanguageCode = Object.keys(SUPPORTED_LANGUAGES)[buttonIndex - 1] as SupportedLanguage;
            await changeLanguage(selectedLanguageCode);
          }
        }
      );
    } else {
      // Android fallback using Alert
      const buttons = Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
        text: `${getLanguageFlag(code)} ${name}`,
        onPress: async () => await changeLanguage(code as SupportedLanguage)
      }));

      Alert.alert(
        t('settings.language'),
        'Select your preferred language',
        [
          { text: 'Cancel', style: 'cancel' },
          ...buttons
        ]
      );
    }
  };

  const colors = Colors[colorScheme ?? 'light'];

  const renderCardSection = (title: string, children: React.ReactNode) => (
    <View style={styles.cardSection}>
      <ThemedText style={[styles.cardSectionTitle, { color: colors.textSecondary }]}>{title}</ThemedText>
      <View style={[styles.cardContainer, { backgroundColor: colors.card }, Shadows.small]}>
        {children}
      </View>
    </View>
  );

  const renderSettingItem = (
    title: string,
    subtitle: string,
    iconName: string,
    onPress: () => void,
    showArrow: boolean = true,
    rightComponent?: React.ReactNode,
    isLast: boolean = false
  ) => (
    <Pressable 
      style={[
        styles.settingItem,
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder }
      ]}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <IconSymbol name={iconName as any} size={24} color={colors.primary} />
        <View style={styles.settingTexts}>
          <ThemedText style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</ThemedText>
          {subtitle && <ThemedText style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</ThemedText>}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && (
          <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
        )}
      </View>
    </Pressable>
  );

  const renderSubscriptionSection = () => {
    if (subscriptionStatus?.isPremium) {
      return renderCardSection(t('settings.sectionSubscription'), (
        <View style={[styles.premiumStatus]}>
          <IconSymbol name="crown.fill" size={24} color={colors.premium} />
          <View style={styles.premiumTexts}>
            <ThemedText style={[styles.premiumTitle, { color: colors.premium }]}>{t('settings.premium')}</ThemedText>
            <ThemedText style={[styles.premiumSubtitle, { color: colors.textSecondary }]}>
              {t('settings.upgradeDesc')}
            </ThemedText>
          </View>
        </View>
      ));
    }
    
    return renderCardSection(t('settings.sectionSubscription'), (
      <>
        {renderSettingItem(
          t('settings.upgradeTitle'),
          t('settings.upgradeDesc'),
          'star.fill',
          handleUpgradePress,
          true,
          undefined,
          false
        )}
        {renderSettingItem(
          t('settings.restorePurchases'),
          t('settings.restoreDesc'),
          'arrow.clockwise',
          handleRestorePurchases,
          true,
          undefined,
          true
        )}
      </>
    ));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />
      
      <TabHeader title={t('settings.title')} alignment="left" />

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {renderSubscriptionSection()}

        {renderCardSection(t('settings.sectionPreferences'), (
          <>
            {renderSettingItem(
              t('settings.appearance'),
              getThemeDisplayText(preference),
              'paintpalette.fill',
              handleThemePress,
              true,
              undefined,
              false
            )}
            
            {renderSettingItem(
              t('settings.language'),
              getCurrentLanguageDisplayText(),
              'globe',
              handleLanguagePress,
              true,
              undefined,
              false
            )}
            
            {renderSettingItem(
              t('settings.notifications'),
              t('settings.notificationsDesc'),
              'bell.fill',
              handleNotificationsPress,
              true,
              undefined,
              true
            )}
          </>
        ))}

        {renderCardSection(t('settings.sectionSupport'), (
          <>
            {renderSettingItem(
              t('settings.rateApp'),
              t('settings.rateAppDescription'),
              'star.fill',
              handleRateAppPress,
              true,
              undefined,
              false
            )}

            {renderSettingItem(
              t('settings.support'),
              t('settings.supportDesc'),
              'questionmark.circle.fill',
              handleSupportPress,
              true,
              undefined,
              false
            )}
            
            {renderSettingItem(
              t('settings.privacy'),
              t('settings.privacyDesc'),
              'hand.raised.fill',
              handlePrivacyPress,
              true,
              undefined,
              false
            )}
            
            {renderSettingItem(
              t('settings.terms'),
              t('settings.termsDesc'),
              'doc.text.fill',
              handleTermsPress,
              true,
              undefined,
              true
            )}
          </>
        ))}

        <ThemedView style={styles.appInfo}>
          <ThemedText style={styles.appVersion}>{getAppVersion()}</ThemedText>
          <ThemedText style={styles.appCopyright}>© 2026 LandmarkAI</ThemedText>
        </ThemedView>
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
    paddingBottom: 100,
  },
  
  // Card Sections
  cardSection: {
    marginBottom: Spacing.xl,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTexts: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: Spacing.xs,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Premium Status
  premiumStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  premiumTexts: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  premiumSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  
  // App Info
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  appCopyright: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: Spacing.xs,
  },
});