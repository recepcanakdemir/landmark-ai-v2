import React from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CameraOverlayProps {
  isScanning?: boolean;
  scanText?: string;
  style?: ViewStyle;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  isScanning = false,
  scanText = "Position plant in the frame",
  style,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Calculate scan area (square in center of screen)
  const scanAreaSize = screenWidth * 0.8;
  const scanAreaTop = (screenHeight - scanAreaSize) / 2 - 100; // Offset upward slightly

  const renderCorner = (position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
    const cornerSize = 24;
    const cornerWidth = 4;
    
    const cornerStyles = {
      topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: cornerWidth,
        borderLeftWidth: cornerWidth,
        borderTopColor: '#FFFFFF',
        borderLeftColor: '#FFFFFF',
      },
      topRight: {
        top: 0,
        right: 0,
        borderTopWidth: cornerWidth,
        borderRightWidth: cornerWidth,
        borderTopColor: '#FFFFFF',
        borderRightColor: '#FFFFFF',
      },
      bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: cornerWidth,
        borderLeftWidth: cornerWidth,
        borderBottomColor: '#FFFFFF',
        borderLeftColor: '#FFFFFF',
      },
      bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: cornerWidth,
        borderRightWidth: cornerWidth,
        borderBottomColor: '#FFFFFF',
        borderRightColor: '#FFFFFF',
      },
    };

    return (
      <View 
        style={[
          styles.corner,
          {
            width: cornerSize,
            height: cornerSize,
          },
          cornerStyles[position],
        ]} 
      />
    );
  };

  const renderScanAnimation = () => {
    if (!isScanning) return null;

    return (
      <View style={styles.scanLine} />
    );
  };

  return (
    <View style={[styles.overlay, style]}>
      {/* Darkened Areas */}
      {/* Top */}
      <View 
        style={[
          styles.darkenedArea, 
          { 
            height: scanAreaTop,
            backgroundColor: colors.overlay,
          }
        ]} 
      />
      
      {/* Middle Row */}
      <View style={[styles.middleRow, { height: scanAreaSize }]}>
        {/* Left */}
        <View 
          style={[
            styles.darkenedArea, 
            { 
              width: (screenWidth - scanAreaSize) / 2,
              backgroundColor: colors.overlay,
            }
          ]} 
        />
        
        {/* Scan Area */}
        <View style={[styles.scanArea, { width: scanAreaSize, height: scanAreaSize }]}>
          {renderCorner('topLeft')}
          {renderCorner('topRight')}
          {renderCorner('bottomLeft')}
          {renderCorner('bottomRight')}
          {renderScanAnimation()}
        </View>
        
        {/* Right */}
        <View 
          style={[
            styles.darkenedArea, 
            { 
              width: (screenWidth - scanAreaSize) / 2,
              backgroundColor: colors.overlay,
            }
          ]} 
        />
      </View>
      
      {/* Bottom */}
      <View 
        style={[
          styles.darkenedArea, 
          { 
            flex: 1,
            backgroundColor: colors.overlay,
          }
        ]} 
      />

      {/* Instruction Text */}
      <View style={[styles.instructionContainer, { top: 600 }]}>
        <View style={[styles.instructionBubble, { backgroundColor: colors.surface }]}>
          <ThemedText style={[styles.instructionText, { color: colors.textPrimary }]}>
            {scanText}
          </ThemedText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  darkenedArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  scanArea: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    borderRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    opacity: 0.8,
  },
  instructionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});