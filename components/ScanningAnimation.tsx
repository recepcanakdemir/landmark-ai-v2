import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  runOnJS
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { resolveImageSource } from '@/services/storageService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ScanningAnimationProps {
  imageUri: string;
  scanType?: 'landmark' | 'museum';
}

export function ScanningAnimation({ imageUri, scanType = 'landmark' }: ScanningAnimationProps) {
  const { t } = useTranslation();
  
  const LANDMARK_MESSAGES = [
    t('scanning.landmark.analyzing'),
    t('scanning.landmark.detecting'),
    t('scanning.landmark.processing'),
    t('scanning.landmark.identifying'),
    t('scanning.landmark.matching'),
    t('scanning.landmark.finalizing')
  ];

  const MUSEUM_MESSAGES = [
    t('scanning.museum.analyzing'),
    t('scanning.museum.identifying'),
    t('scanning.museum.processing'),
    t('scanning.museum.context'),
    t('scanning.museum.matching'),
    t('scanning.museum.finalizing')
  ];

  const STATUS_MESSAGES = scanType === 'museum' ? MUSEUM_MESSAGES : LANDMARK_MESSAGES;
  const [statusText, setStatusText] = useState(STATUS_MESSAGES[0]);
  const scannerPosition = useSharedValue(0);
  
  // Resolve image URI for persistent images
  const resolvedImageUri = resolveImageSource(imageUri) || imageUri;

  useEffect(() => {
    // Start the scanner line animation
    scannerPosition.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );

    // Cycle through status messages
    const interval = setInterval(() => {
      setStatusText(prev => {
        const currentIndex = STATUS_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % STATUS_MESSAGES.length;
        return STATUS_MESSAGES[nextIndex];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const scannerLineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: scannerPosition.value * (screenHeight * 0.4 - 4)
        }
      ]
    };
  });

  return (
    <View style={styles.container}>
      {/* Layer 1: Full-screen Background Image */}
      <Image 
        source={{ uri: resolvedImageUri }} 
        style={StyleSheet.absoluteFill} 
        contentFit="cover" 
      />
      
      {/* Layer 2: Blur Overlay */}
      <BlurView 
        intensity={80} 
        style={StyleSheet.absoluteFill}
        tint="dark"
      />
      
      {/* Layer 3: Focused Center Image with Scanner */}
      <View style={styles.centerContainer}>
        <View style={styles.focusedImageContainer}>
          {/* Focused Image */}
          <Image 
            source={{ uri: resolvedImageUri }} 
            style={styles.focusedImage} 
            contentFit="cover" 
          />
          
          {/* Scanner Line Container */}
          <View style={styles.scannerContainer}>
            <Animated.View style={[styles.scannerLine, scannerLineStyle]} />
          </View>
          
          {/* Border Frame */}
          <View style={styles.borderFrame} />
        </View>
        
        {/* Status Text */}
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  focusedImageContainer: {
    width: screenWidth * 0.7,
    height: screenHeight * 0.4,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  focusedImage: {
    width: '100%',
    height: '100%',
  },
  scannerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  scannerLine: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  borderFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
  },
  statusText: {
    marginTop: 32,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});