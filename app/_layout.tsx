import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import { useFonts } from 'expo-font'; // 👈 Added
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen'; // 👈 Added
import * as TaskManager from 'expo-task-manager';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native'; // 👈 Added
import { cacheSurahData } from '../api/quranApi';
import { AudioProvider } from './context/AudioContext';

// 1. Prevent the splash screen from hiding automatically
SplashScreen.preventAutoHideAsync();

const BACKGROUND_DOWNLOAD_TASK = 'background-quran-download';

// Define the background task (Keep your existing logic)
TaskManager.defineTask(BACKGROUND_DOWNLOAD_TASK, async () => {
  try {
    const lastIdStr = await AsyncStorage.getItem('last_bg_download_id');
    const nextId = lastIdStr ? parseInt(lastIdStr) + 1 : 1;

    if (nextId <= 114) {
      const success = await cacheSurahData(nextId);
      if (success) {
        await AsyncStorage.setItem('last_bg_download_id', nextId.toString());
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function RootLayout() {
  // 2. Load Fonts Hook
  const [fontsLoaded] = useFonts({
    // ⚠️ Ensure these paths match your actual folder structure!
    'AlMushaf': require('../assets/fonts/AlMushaf.ttf'), 
    'AlmendraSC': require('../assets/fonts/AlmendraSC.ttf'),
    'BrunoAceSC': require('../assets/fonts/BrunoAceSC.ttf'),
    'BrunoAceSC': require('../assets/fonts/Jura.ttf'),
  });

  // 3. Hide Splash Screen when fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // 4. Background Task Registration (Your existing logic)
  useEffect(() => {
    const registerTask = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_DOWNLOAD_TASK);
        if (!isRegistered) {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_DOWNLOAD_TASK, {
            minimumInterval: 60 * 15,
            stopOnTerminate: false,
            startOnBoot: true,
          });
        }
      } catch (err) {
        console.log("Task Error:", err);
      }
    };
    registerTask();
  }, []);

  // 5. Loading State: Don't render the app until fonts are loaded
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#BFA868" />
      </View>
    );
  }

  return (
    <AudioProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" />
        <Stack.Screen name="favorites" options={{ presentation: 'modal' }} />
      </Stack>
    </AudioProvider>
  );
}