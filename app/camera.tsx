import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, Alert, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CameraOverlay } from '@/components/CameraOverlay';
import { Colors, Shadows, BorderRadius, Typography, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
// Removed limit service imports - checks now happen after photo capture

const { width: screenWidth } = Dimensions.get('window');

// Removed diagnose mode - only scan landmarks

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { mode = 'landmark', scanAllowed } = useLocalSearchParams<{ 
    mode?: 'landmark' | 'museum'; 
    scanAllowed?: string;
  }>();
  
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  // Support both landmark and museum scan modes
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Configure scan mode
  const scanConfig = {
    landmark: {
      instruction: t('camera.landmarkInstruction'),
      color: colors.primary,
      title: t('camera.scanningLandmark'),
      icon: "building.columns.fill"
    },
    museum: {
      instruction: t('camera.artInstruction'),
      color: colors.sunsetOrange,
      title: t('camera.analyzingArtwork'),
      icon: "paintbrush.fill"
    }
  }[mode];

  useEffect(() => {
    loadLocationPreference();
  }, []);

  useEffect(() => {
    requestCameraPermissionIfNeeded();
  }, [permission]);

  const requestCameraPermissionIfNeeded = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        // If user denies permission, navigate back
        router.back();
      }
    }
  };

  const loadLocationPreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('location_enabled_preference');
      if (savedPreference !== null) {
        setLocationEnabled(savedPreference === 'true');
      }
    } catch (error) {
      console.log('Error loading location preference:', error);
    }
  };

  if (!permission) {
    return <View style={styles.loadingContainer} />;
  }

  if (!permission.granted) {
    // Show loading while permission is being requested or denied
    return <View style={styles.loadingContainer} />;
  }

  const handleCapture = async () => {
    if (capturing || !cameraRef.current || scanning) return;

    try {
      setCapturing(true);
      setScanning(true);

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      console.log('Photo captured:', photo.uri);

      // Photo captured successfully - proceed to analysis

      // Capture GPS coordinates if location is enabled
      let locationCoords: string | undefined;
      if (locationEnabled) {
        try {
          console.log('Attempting to get location...');
          const locationPromise = Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 1000,
            distanceInterval: 1 
          });
          
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location timeout')), 2000)
          );
          
          const location = await Promise.race([locationPromise, timeoutPromise]);
          locationCoords = JSON.stringify({
            lat: location.coords.latitude,
            lng: location.coords.longitude
          });
          console.log('Location captured:', locationCoords);
        } catch (error) {
          console.log('Failed to get location, proceeding without:', error);
          // Continue without location - don't block the user
        }
      }

      // Navigate to result screen (replace camera completely)
      router.replace({
        pathname: '/result',
        params: { 
          imageUri: photo.uri,
          source: 'new',
          scanType: mode,
          ...(locationCoords && { locationCoords })
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

        // Image selected successfully - proceed to analysis

        // Navigate to result screen (replace camera completely)
        router.replace({
          pathname: '/result',
          params: { 
            imageUri: selectedImage.uri,
            source: 'new',
            scanType: mode
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

  const toggleLocation = async () => {
    try {
      if (!locationEnabled) {
        // User wants to enable location - check permissions
        const { status } = await Location.getForegroundPermissionsAsync();
        
        if (status === 'granted') {
          setLocationEnabled(true);
          await AsyncStorage.setItem('location_enabled_preference', 'true');
        } else if (status === 'undetermined') {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus === 'granted') {
            setLocationEnabled(true);
            await AsyncStorage.setItem('location_enabled_preference', 'true');
          } else {
            Alert.alert(
              'Location Permission',
              'Location access helps improve landmark identification accuracy by providing geographical context.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Location Permission Required',
            'To improve scan accuracy, please enable location access in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // User wants to disable location
        setLocationEnabled(false);
        await AsyncStorage.setItem('location_enabled_preference', 'false');
      }
    } catch (error) {
      console.log('Error toggling location:', error);
    }
  };

  // Mode toggle removed - single scan mode for landmarks

  const handleBack = () => {
    router.back();
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
            style={[styles.controlButton, locationEnabled && styles.activeControlButton]}
            onPress={toggleLocation}
          >
            <IconSymbol 
              name={locationEnabled ? "location.fill" : "location.slash"} 
              size={20} 
              color={locationEnabled ? colors.primary : "#FFFFFF"} 
            />
          </Pressable>
          
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
                {scanning ? scanConfig.title : t('camera.capturing')}
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