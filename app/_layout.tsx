import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native'; // 👈 Added imports
import { cacheSurahData } from '../api/quranApi';
import { AudioProvider } from './context/AudioContext';

// 1. Prevent auto hide (Safe version)
SplashScreen.preventAutoHideAsync().catch(() => {});

const BACKGROUND_DOWNLOAD_TASK = 'background-quran-download';

// Define Background Task
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
  useKeepAwake();
  
  const [fontsLoaded] = useFonts({
    'AlMushaf': require('../assets/fonts/AlMushaf.ttf'), 
    'AlmendraSC': require('../assets/fonts/AlmendraSC.ttf'),
    'BrunoAceSC': require('../assets/fonts/BrunoAceSC.ttf'),
    'Jura': require('../assets/fonts/Jura.ttf'),
    'Cinzel': require('../assets/fonts/Cinzel.ttf')
  });

  // 3. Register Background Task
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

  // 4. Hide Splash Screen ONLY when fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      // .catch() prevents the "No native splash screen registered" crash on reload
      SplashScreen.hideAsync().catch((e) => console.log("Splash error:", e));
    }
  }, [fontsLoaded]);

  // 5. Loading State
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFBF7' }}>
        <ActivityIndicator size="large" color="#BFA868" />
      </View>
    );
  }

  return (
    <AudioProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </AudioProvider>
  );
}