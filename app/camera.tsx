import React, { useState, useRef } from 'react';
import { StyleSheet, View, Pressable, Alert, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CameraOverlay } from '@/components/CameraOverlay';
import { CustomButton } from '@/components/CustomButton';
import { Colors, Shadows, BorderRadius, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { performScan } from '@/services/limitService';

const { width: screenWidth } = Dimensions.get('window');

// Removed diagnose mode - only scan landmarks

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: ScanMode }>();
  
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Simplified to single scan mode for landmarks
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={[styles.permissionContent, { backgroundColor: colors.background }]}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.primary }]}>
            <IconSymbol name="camera.fill" size={40} color="#FFFFFF" />
          </View>
          
          <ThemedText style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Camera Access Required
          </ThemedText>
          
          <ThemedText style={[styles.permissionText, { color: colors.textSecondary }]}>
            LandmarkAI needs access to your camera to scan and identify landmarks around you.
          </ThemedText>
          
          <CustomButton
            title="Grant Camera Permission"
            onPress={requestPermission}
            variant="primary"
            size="large"
            icon="camera.fill"
            style={styles.permissionButton}
          />
          
          <CustomButton
            title="Go Back"
            onPress={() => router.back()}
            variant="ghost"
            size="medium"
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (capturing || !cameraRef.current || scanning) return;

    try {
      setCapturing(true);
      setScanning(true);

      // Check scan limits
      const limitResult = await performScan();
      if (!limitResult.allowed) {
        setScanning(false);
        setCapturing(false);
        router.push('/paywall?source=scan_limit');
        return;
      }

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      console.log('Photo captured:', photo.uri);

      // Navigate to result screen (replace camera completely)
      router.replace({
        pathname: '/result',
        params: { 
          imageUri: photo.uri,
          source: 'new'
        }
      });

    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setCapturing(false);
      setScanning(false);
    }
  };

  const handleGalleryPick = async () => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('Image selected from gallery:', selectedImage.uri);

        // Check scan limits
        const limitResult = await performScan();
        if (!limitResult.allowed) {
          router.push('/paywall?source=scan_limit');
          return;
        }

        // Navigate to result screen (replace camera completely)
        router.replace({
          pathname: '/result',
          params: { 
            imageUri: selectedImage.uri,
            source: 'new'
          }
        });
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(!flash);
  };

  // Mode toggle removed - single scan mode for landmarks

  const handleBack = () => {
    router.back();
  };

  // Simplified config for landmark scanning
  const scanConfig = {
    title: 'Scan',
    subtitle: 'Discover landmark history',
    color: colors.primary,
    icon: 'camera.fill' as const,
    instruction: 'Center the landmark in the frame'
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash ? 'on' : 'off'}
      />

      {/* Camera Overlay */}
      <CameraOverlay 
        isScanning={scanning}
        scanText={scanConfig.instruction}
      />

      {/* Top Controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="xmark" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.topRightControls}>
          <Pressable 
            style={[styles.controlButton, flash && styles.activeControlButton]}
            onPress={toggleFlash}
          >
            <IconSymbol 
              name={flash ? "bolt.fill" : "bolt.slash.fill"} 
              size={20} 
              color="#FFFFFF" 
            />
          </Pressable>
        </View>
      </View>

      {/* Mode selector removed - single landmark scan mode */}

      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {/* Gallery Button */}
        <Pressable style={styles.galleryButton} onPress={handleGalleryPick}>
          <IconSymbol name="photo.fill" size={28} color="#FFFFFF" />
        </Pressable>

        {/* Capture Button */}
        <Pressable
          style={[
            styles.captureButton,
            capturing && styles.capturingButton,
            { borderColor: scanConfig.color }
          ]}
          onPress={handleCapture}
          disabled={capturing || scanning}
        >
          <View style={[styles.captureButtonInner, { backgroundColor: scanConfig.color }]}>
            {capturing || scanning ? (
              <ThemedText style={styles.capturingText}>
                {scanning ? 'Analyzing...' : 'Capturing...'}
              </ThemedText>
            ) : (
              <IconSymbol name={scanConfig.icon} size={32} color="#FFFFFF" />
            )}
          </View>
        </Pressable>

        {/* Flip Camera Button */}
        <Pressable style={styles.flipButton} onPress={toggleCameraFacing}>
          <IconSymbol name="arrow.triangle.2.circlepath.camera.fill" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },

  // Permission Screen
  permissionContainer: {
    flex: 1,
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.large,
  },
  permissionTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  permissionText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    marginBottom: Spacing.lg,
  },

  // Top Controls
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  activeControlButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.8)',
  },

  // Mode Selector
  modeSelectorContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -200, // Position above scan area
  },
  modeSelector: {
    flexDirection: 'row',
    borderRadius: BorderRadius.pill,
    padding: Spacing.xs,
    ...Shadows.medium,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs,
  },
  activeModeOption: {
    ...Shadows.small,
  },
  modeText: {
    ...Typography.captionBold,
  },

  // Bottom Controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.large,
  },
  capturingButton: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
});