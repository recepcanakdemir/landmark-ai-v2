import React, { useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle, Modal } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';
import { Colors, Shadows, BorderRadius, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveImageSource } from '@/services/storageService';

interface LandmarkCardProps {
  id: string;
  name: string;
  location?: string;
  imageUrl?: string;
  dateAdded: Date;
  confidence?: number;
  tags?: string[];
  onPress: () => void;
  onFavorite?: () => void;
  onDelete?: () => void;
  isFavorite?: boolean;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

export const LandmarkCard: React.FC<LandmarkCardProps> = ({
  id,
  name,
  location,
  imageUrl,
  dateAdded,
  confidence,
  tags = [],
  onPress,
  onFavorite,
  onDelete,
  isFavorite = false,
  style,
  size = 'medium',
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showMenu, setShowMenu] = useState(false);

  const sizeConfig = {
    small: {
      cardHeight: 180,
      imageHeight: 120,
      padding: Spacing.sm,
    },
    medium: {
      cardHeight: 220,
      imageHeight: 150,
      padding: Spacing.md,
    },
    large: {
      cardHeight: 260,
      imageHeight: 180,
      padding: Spacing.lg,
    },
  };

  const config = sizeConfig[size];

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    if (action === 'remove' && onDelete) {
      onDelete();
    }
  };

  const renderMenu = () => {
    if (!showMenu || !onDelete) return null;

    return (
      <Modal
        transparent
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
        animationType="fade"
      >
        <Pressable 
          style={styles.menuOverlay} 
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: colors.surface }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => handleMenuAction('remove')}
            >
              <IconSymbol name="trash" size={16} color={colors.error} />
              <ThemedText style={[styles.menuItemText, { color: colors.error }]}>
                Remove
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderConfidenceBadge = () => {
    if (!confidence) return null;
    
    const confidenceColor = confidence >= 90 ? colors.success : confidence >= 70 ? colors.warning : colors.error;
    
    return (
      <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
        <ThemedText style={styles.confidenceText}>
          {Math.round(confidence)}%
        </ThemedText>
      </View>
    );
  };

  const renderTags = () => {
    const hasContent = tags.length > 0 || confidence;
    if (!hasContent) return null;
    
    return (
      <View style={styles.tagsContainer}>
        {tags.slice(0, 2).map((tag, index) => (
          <View key={index} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
            <ThemedText style={[styles.tagText, { color: colors.textSecondary }]}>
              {tag}
            </ThemedText>
          </View>
        ))}
        {tags.length > 2 && (
          <ThemedText style={[styles.moreTagsText, { color: colors.textTertiary }]}>
            +{tags.length - 2}
          </ThemedText>
        )}
        {confidence && (
          <View style={[styles.bottomConfidenceBadge, { backgroundColor: confidence >= 90 ? colors.success : confidence >= 70 ? colors.warning : colors.error }]}>
            <ThemedText style={styles.confidenceText}>
              {Math.round(confidence)}%
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          minHeight: config.cardHeight,
          padding: config.padding,
          opacity: pressed ? 0.95 : 1.0,
        },
        style,
      ]}
      onPress={onPress}
      android_ripple={{
        color: colors.ripple,
        borderless: false,
      }}
    >
      {/* Image Section */}
      <View style={[styles.imageContainer, { height: config.imageHeight }]}>
        {(() => {
          const resolvedImageUri = resolveImageSource(imageUrl);
          return resolvedImageUri ? (
            <Image 
              source={{ uri: resolvedImageUri }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol 
                name="building.columns.fill" 
                size={32} 
                color={colors.primary} 
              />
            </View>
          );
        })()}
        
        {/* Overlay Elements */}
        
        <View style={styles.overlayButtons}>
          {onDelete && (
            <Pressable 
              style={[styles.menuButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowMenu(true)}
            >
              <IconSymbol 
                name="ellipsis" 
                size={16} 
                color={colors.textSecondary} 
              />
            </Pressable>
          )}
          
          {onFavorite && (
            <Pressable 
              style={[styles.favoriteButton, { backgroundColor: colors.surface }]}
              onPress={onFavorite}
            >
              <IconSymbol 
                name={isFavorite ? "heart.fill" : "heart"} 
                size={16} 
                color={isFavorite ? colors.error : colors.textTertiary} 
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <ThemedText 
          style={[styles.landmarkName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {name}
        </ThemedText>
        
        {location && (
          <ThemedText 
            style={[styles.locationName, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {location}
          </ThemedText>
        )}
        
        <ThemedText 
          style={[styles.dateText, { color: colors.textTertiary }]}
        >
          Discovered {formatDate(dateAdded)}
        </ThemedText>
        
        {renderTags()}
      </View>
      
      {renderMenu()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlayButtons: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minWidth: 140,
    ...Shadows.large,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuItemText: {
    marginLeft: Spacing.md,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  landmarkName: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  locationName: {
    ...Typography.caption,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  dateText: {
    ...Typography.small,
    marginBottom: Spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    ...Typography.small,
    fontWeight: '600',
  },
  moreTagsText: {
    ...Typography.small,
    fontWeight: '600',
  },
  bottomConfidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: 'auto', // Push to the right
  },
});