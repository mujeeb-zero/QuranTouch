import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchSurah } from '../../api/quranApi';

const AudioContext = createContext<any>(null);

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }: any) => {
  // --- STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<any>(null);
  const [currentAyahId, setCurrentAyahId] = useState<number | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [isLoading, setIsLoading] = useState(false);

  // --- REFS ---
  const soundRef = useRef<Audio.Sound | null>(null);
  const nextPreloadedSoundRef = useRef<Audio.Sound | null>(null);
  const prevPreloadedSoundRef = useRef<Audio.Sound | null>(null);
  const surahRef = useRef<any>(null);
  const indexRef = useRef(0);
  const isBusy = useRef(false);
  const isPreloadingNext = useRef(false);
  const isPreloadingPrev = useRef(false);

  useEffect(() => {
    loadFavorites();
    setupAudioMode();

    return () => {
      // Cleanup on unmount
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        soundRef.current.unloadAsync();
      }
      if (nextPreloadedSoundRef.current) {
        nextPreloadedSoundRef.current.unloadAsync();
      }
      if (prevPreloadedSoundRef.current) {
        prevPreloadedSoundRef.current.unloadAsync();
      }
    };
  }, []);

  const setupAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.log('Audio Mode Error:', e);
    }
  };

  const loadFavorites = async () => {
    const stored = await AsyncStorage.getItem('favorites');
    if (stored) setFavorites(JSON.parse(stored));
  };

  // --- CLEANUP FUNCTIONS ---
  const killCurrentSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.setOnPlaybackStatusUpdate(null);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        // Ignore errors
      }
      soundRef.current = null;
    }
  };

  const killNextPreloadedSound = async () => {
    if (nextPreloadedSoundRef.current) {
      try {
        await nextPreloadedSoundRef.current.unloadAsync();
      } catch (error) {
        // Ignore errors
      }
      nextPreloadedSoundRef.current = null;
    }
  };

  const killPrevPreloadedSound = async () => {
    if (prevPreloadedSoundRef.current) {
      try {
        await prevPreloadedSoundRef.current.unloadAsync();
      } catch (error) {
        // Ignore errors
      }
      prevPreloadedSoundRef.current = null;
    }
  };

  // --- PRELOAD NEXT AND PREVIOUS AYAHS ---
  const preloadAdjacentAyahs = async (currentIndex: number) => {
    if (!surahRef.current) return;

    // Preload PREVIOUS first (for faster backward navigation)
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && !isPreloadingPrev.current) {
      isPreloadingPrev.current = true;
      try {
        await killPrevPreloadedSound();
        const { sound } = await Audio.Sound.createAsync(
          { uri: surahRef.current.verses[prevIndex].audio },
          { shouldPlay: false }
        );
        await sound.getStatusAsync(); // ensure it's loaded
        prevPreloadedSoundRef.current = sound;
      } catch (error) {
        console.log("Previous preload error:", error);
      } finally {
        isPreloadingPrev.current = false;
      }
    }

    // Then preload NEXT
    const nextIndex = currentIndex + 1;
    if (nextIndex < surahRef.current.verses.length && !isPreloadingNext.current) {
      isPreloadingNext.current = true;
      try {
        await killNextPreloadedSound();
        const { sound } = await Audio.Sound.createAsync(
          { uri: surahRef.current.verses[nextIndex].audio },
          { shouldPlay: false }
        );
        await sound.getStatusAsync();
        nextPreloadedSoundRef.current = sound;
      } catch (error) {
        console.log("Next preload error:", error);
      } finally {
        isPreloadingNext.current = false;
      }
    }
  };

  // --- PLAYBACK STATUS ---
  const onPlaybackStatusUpdate = async (status: any) => {
    if (!status.isLoaded) return;

    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);

    // Preload adjacent ayahs when current is 50% complete
    if (status.durationMillis &&
      status.positionMillis > status.durationMillis * 0.5) {
      preloadAdjacentAyahs(indexRef.current);
    }

    // AUTO-NEXT LOGIC
    if (status.didJustFinish) {
      const nextIndex = indexRef.current + 1;
      if (surahRef.current && nextIndex < surahRef.current.verses.length) {

        // Use preloaded next sound if available
        if (nextPreloadedSoundRef.current) {
          // Switch to preloaded sound
          soundRef.current = nextPreloadedSoundRef.current;
          nextPreloadedSoundRef.current = null;

          // Update state
          indexRef.current = nextIndex;
          setCurrentAyahId(surahRef.current.verses[nextIndex].id);
          setPosition(0);

          // Play and attach listener
          await soundRef.current.playAsync();
          soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

          // Preload next set
          preloadAdjacentAyahs(nextIndex);
        } else {
          // Fallback if preload failed
          await playAyah(nextIndex);
        }
      } else {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  // --- PLAY FUNCTIONS ---
  const playSurah = async (surahId: number) => {
    await killCurrentSound();
    await killNextPreloadedSound();
    await killPrevPreloadedSound();
    setIsLoading(true);

    try {
      const data = await fetchSurah(surahId);
      if (!data) return;

      surahRef.current = data;
      setCurrentSurah(data);
      await playAyah(0);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playAyah = async (index: number) => {
    if (!surahRef.current || !surahRef.current.verses[index]) return;

    // RESTART GUARD: If clicking the active Ayah, just rewind
    if (index === indexRef.current && soundRef.current) {
      if (isPlaying) {
        await soundRef.current.setPositionAsync(0);
      } else {
        await soundRef.current.playAsync();
      }
      return;
    }

    // BUSY GUARD: Prevent double-clicks
    if (isBusy.current) return;
    isBusy.current = true;

    try {
      // Kill current sound
      await killCurrentSound();

      // Clean up preloaded sounds if they're not for adjacent indices
      if (nextPreloadedSoundRef.current && index !== indexRef.current + 1) {
        await killNextPreloadedSound();
      }
      if (prevPreloadedSoundRef.current && index !== indexRef.current - 1) {
        await killPrevPreloadedSound();
      }

      // Update UI state
      setCurrentAyahId(surahRef.current.verses[index].id);
      indexRef.current = index;
      setPosition(0);
      setIsPlaying(true);

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: surahRef.current.verses[index].audio },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      // Preload adjacent ayahs
      preloadAdjacentAyahs(index);

    } catch (error) {
      console.log("Play Error:", error);
    } finally {
      isBusy.current = false;
    }
  };

  // --- SKIP AYAH ---
  // --- SKIP AYAH (Fully optimized for RTL & instant backward) ---
  const skipAyah = async (direction: 'next' | 'prev') => {
    if (!surahRef.current || isBusy.current) return;

    const newIndex = direction === 'next'
      ? indexRef.current + 1
      : indexRef.current - 1;

    if (newIndex < 0 || newIndex >= surahRef.current.verses.length) return;

    // --- Use preloaded sound if available ---
    if (direction === 'next' && nextPreloadedSoundRef.current) {
      try {
        isBusy.current = true;
        await killCurrentSound();

        soundRef.current = nextPreloadedSoundRef.current;
        nextPreloadedSoundRef.current = null;

        // Update state
        indexRef.current = newIndex;
        setCurrentAyahId(surahRef.current.verses[newIndex].id);
        setPosition(0);
        setIsPlaying(true);

        // Verify sound is loaded before playing
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.playAsync();
          soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          preloadAdjacentAyahs(newIndex); // preload next set
        } else {
          // Fallback if preloaded sound isn't ready
          await playAyah(newIndex);
        }
      } catch (error) {
        console.log("Skip Next Error:", error);
        await playAyah(newIndex);
      } finally {
        isBusy.current = false;
      }
    }
    // --- 🆕 PREVIOUS direction – uses preloaded sound with priority ---
    else if (direction === 'prev' && prevPreloadedSoundRef.current) {
      try {
        isBusy.current = true;
        await killCurrentSound();

        soundRef.current = prevPreloadedSoundRef.current;
        prevPreloadedSoundRef.current = null;

        // Update state
        indexRef.current = newIndex;
        setCurrentAyahId(surahRef.current.verses[newIndex].id);
        setPosition(0);
        setIsPlaying(true);

        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.playAsync();
          soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          preloadAdjacentAyahs(newIndex);
        } else {
          await playAyah(newIndex);
        }
      } catch (error) {
        console.log("Skip Prev Error:", error);
        await playAyah(newIndex);
      } finally {
        isBusy.current = false;
      }
    }
    else {
      // Fallback: no preload, use regular playAyah
      await playAyah(newIndex);
    }
  };

  // --- TOGGLE PLAY ---
  const togglePlay = async () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  // --- SEEK ---
  const seekTo = async (value: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(value);
    }
  };

  // --- FAVORITES ---
  const toggleFavorite = async (surah: any, verse: any) => {
    let newFavs = [...favorites];
    const exists = newFavs.some(f => f.surahId === surah.id && f.verseId === verse.id);

    if (exists) {
      newFavs = newFavs.filter(f => !(f.surahId === surah.id && f.verseId === verse.id));
    } else {
      newFavs.push({
        surahId: surah.id,
        verseId: verse.id,
        surahName: surah.nameEn,
        verseNum: verse.numberInSurah,
        text: verse.text
      });
    }

    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  // --- LAST READ ---
  const saveLastRead = async (surahId: number, verseId: number, verseNum: number, nameEn: string, nameAr: string) => {
    const data = {
      surahId,
      verseId,
      verseNum,
      nameEn,
      nameAr,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem('last_read', JSON.stringify(data));
  };

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        currentSurah,
        currentAyahId,
        position,
        duration,
        favorites,
        themeMode,
        isLoading,
        playSurah,
        playAyah: (surah: any, idx: number) => {
          if (surah.id !== surahRef.current?.id) {
            surahRef.current = surah;
            setCurrentSurah(surah);
          }
          playAyah(idx);
        },
        togglePlay,
        skipAyah,
        seekTo,
        setThemeMode,
        toggleFavorite,
        saveLastRead,
      }}>
      {children}
    </AudioContext.Provider>
  );
};