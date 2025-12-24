import React from 'react';
import { Pressable, StyleSheet, ViewStyle, View } from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { Colors, Shadows, BorderRadius, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: string;
  iconColor?: string;
  backgroundColor?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  badge?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  backgroundColor,
  onPress,
  disabled = false,
  style,
  badge,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: backgroundColor || colors.card,
          borderColor: colors.cardBorder,
          opacity: disabled ? 0.6 : pressed ? 0.95 : 1.0,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{
        color: colors.ripple,
        borderless: false,
      }}
    >
      <View style={styles.content}>
        {/* Icon Section */}
        <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol 
            name={icon} 
            size={32} 
            color={iconColor || colors.primary} 
          />
          {badge && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
            </View>
          )}
        </View>

        {/* Text Section */}
        <View style={styles.textContainer}>
          <ThemedText style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </ThemedText>
        </View>

        {/* Arrow Icon */}
        <View style={styles.arrowContainer}>
          <IconSymbol 
            name="chevron.right" 
            size={20} 
            color={colors.textTertiary} 
          />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3547',
    borderRadius: BorderRadius.pill,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});