import React from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { Colors, Shadows, BorderRadius, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonShape = 'rectangle' | 'pill';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  icon?: string;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  shape = 'rectangle',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Size configurations
  const sizeConfig = {
    small: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: 14,
      iconSize: 16,
    },
    medium: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      iconSize: 20,
    },
    large: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
      fontSize: 18,
      iconSize: 24,
    },
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      backgroundColor: disabled ? colors.buttonDisabled : colors.buttonPrimary,
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      shadow: disabled ? null : Shadows.small,
    },
    secondary: {
      backgroundColor: disabled ? colors.buttonDisabled : colors.buttonSecondary,
      textColor: disabled ? colors.textTertiary : colors.textPrimary,
      borderColor: colors.cardBorder,
      shadow: disabled ? null : Shadows.small,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: disabled ? colors.textTertiary : colors.primary,
      borderColor: 'transparent',
      shadow: null,
    },
    danger: {
      backgroundColor: disabled ? colors.buttonDisabled : colors.error,
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      shadow: disabled ? null : Shadows.small,
    },
  };

  const config = {
    ...sizeConfig[size],
    ...variantConfig[variant],
  };

  const buttonStyles: ViewStyle[] = [
    styles.button,
    {
      backgroundColor: config.backgroundColor,
      paddingHorizontal: config.paddingHorizontal,
      paddingVertical: config.paddingVertical,
      borderRadius: shape === 'pill' ? BorderRadius.pill : BorderRadius.md,
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: config.borderColor,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
      opacity: disabled || loading ? 0.6 : 1,
    },
    config.shadow,
    style,
  ].filter(Boolean);

  const textStyles: TextStyle[] = [
    Typography.button,
    {
      color: config.textColor,
      fontSize: config.fontSize,
    },
    textStyle,
  ].filter(Boolean);

  const renderIcon = () => {
    if (!icon || loading) return null;
    
    return (
      <IconSymbol
        name={icon}
        size={config.iconSize}
        color={config.textColor}
        style={iconPosition === 'left' ? { marginRight: Spacing.sm } : { marginLeft: Spacing.sm }}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return <ThemedText style={textStyles}>Loading...</ThemedText>;
    }

    return (
      <>
        {icon && iconPosition === 'left' && renderIcon()}
        <ThemedText style={textStyles}>{title}</ThemedText>
        {icon && iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyles,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{
        color: colors.ripple,
        borderless: false,
      }}
    >
      {renderContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Minimum touch target
  },
  pressed: {
    opacity: 0.8,
  },
});