import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface TabHeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
  alignment?: 'left' | 'center';
  titleStyle?: ViewStyle;
}

export const TabHeader: React.FC<TabHeaderProps> = ({
  title,
  subtitle,
  rightComponent,
  style,
  alignment = 'center',
  titleStyle,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const isLeftAligned = alignment === 'left';

  return (
    <View style={[
      styles.header, 
      { 
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: Spacing.xl,
        backgroundColor: colors.background,
        alignItems: isLeftAligned ? 'flex-start' : 'center',
        flexDirection: isLeftAligned ? 'column' : 'row',
      }, 
      style
    ]}>
      <View style={[
        styles.headerContent,
        { 
          flex: isLeftAligned ? undefined : 1,
          paddingTop: 8,
          paddingBottom: 8,
        }
      ]}>
        <ThemedText style={[
          styles.title, 
          { 
            color: colors.textPrimary,
            textAlign: isLeftAligned ? 'left' : 'center',
            fontSize: 34,
            fontWeight: 'bold',
            lineHeight: 41,
          },
          titleStyle
        ]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[
            styles.subtitle, 
            { 
              color: colors.textSecondary,
              textAlign: isLeftAligned ? 'left' : 'center',
            }
          ]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {rightComponent && !isLeftAligned && (
        <View style={styles.rightComponent}>
          {rightComponent}
        </View>
      )}
      {rightComponent && isLeftAligned && (
        <View style={styles.rightComponentLeft}>
          {rightComponent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
  },
  headerContent: {
    width: '100%',
  },
  title: {
    // Dynamic styles applied in component
  },
  subtitle: {
    fontSize: 16,
    marginTop: Spacing.xs,
    opacity: 0.8,
  },
  rightComponent: {
    marginTop: Spacing.xs,
  },
  rightComponentLeft: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});