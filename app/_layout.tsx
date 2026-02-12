// app/_layout.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import { Stack } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect } from 'react';
import { cacheSurahData } from '../api/quranApi';

// 👇 Import your AudioProvider
import { AudioProvider } from './context/AudioContext';

const BACKGROUND_DOWNLOAD_TASK = 'background-quran-download';

// Define the background task for Islam 360 style downloading
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

  return (
    // 👇 WRAP EVERYTHING IN AUDIOPROVIDER
    <AudioProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" />
        <Stack.Screen name="favorites" options={{ presentation: 'modal' }} />
      </Stack>
    </AudioProvider>
  );
}