import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchSurah } from '../../api/quranApi';

const AudioContext = createContext<any>(null);

export const useAudio = () => useContext(AudioContext);

export const AudioProvider = ({ children }: any) => {
  // STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<any>(null);
  const [currentAyahId, setCurrentAyahId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');

  // ENGINE REFS
  const soundObject = useRef<Audio.Sound | null>(null);
  const nextSoundObject = useRef<Audio.Sound | null>(null);
  const surahRef = useRef<any>(null);
  const indexRef = useRef(0);
  const operationId = useRef(0);

  useEffect(() => {
    loadFavorites();
    setupAudioMode();
    return () => { unloadAll(); };
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
    } catch (e) { console.log('Audio Mode Error:', e); }
  };

  const unloadAll = async () => {
    if (soundObject.current) {
      try { await soundObject.current.stopAsync(); await soundObject.current.unloadAsync(); } catch (e) { }
      soundObject.current = null;
    }
    if (nextSoundObject.current) {
      try { await nextSoundObject.current.unloadAsync(); } catch (e) { }
      nextSoundObject.current = null;
    }
  };

  const loadFavorites = async () => {
    const stored = await AsyncStorage.getItem('favorites');
    if (stored) setFavorites(JSON.parse(stored));
  };

  const playSurah = async (surahId: number) => {
    operationId.current += 1;
    await unloadAll();
    setIsPlaying(false);
    setIsLoading(true);

    try {
      const data = await fetchSurah(surahId);
      if (!data || !data.verses) return;

      surahRef.current = data;
      setCurrentSurah(data);
      await playAyah(0);
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  const playAyah = async (index: number) => {
    const surah = surahRef.current;
    if (!surah || index >= surah.verses.length) return;

    const myTicket = ++operationId.current;

    setCurrentAyahId(surah.verses[index].id);
    setCurrentIndex(index);
    indexRef.current = index;
    setIsPlaying(true);

    try {
      if (soundObject.current) {
        try { await soundObject.current.stopAsync(); await soundObject.current.unloadAsync(); } catch (e) { }
        soundObject.current = null;
      }

      let newSound: Audio.Sound | null = null;
      if (nextSoundObject.current && index > 0) {
        newSound = nextSoundObject.current;
        nextSoundObject.current = null;
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: surah.verses[index].audio },
          { shouldPlay: false }
        );
        newSound = sound;
      }

      if (operationId.current !== myTicket) {
        await newSound.unloadAsync();
        return;
      }

      soundObject.current = newSound;
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      await newSound.playAsync();

      if (index + 1 < surah.verses.length) {
        preloadNextAyah(index + 1);
      }

    } catch (error) {
      console.log("Play Ayah Error:", error);
    }
  };

  const preloadNextAyah = async (nextIndex: number) => {
    try {
      const surah = surahRef.current;
      if (!surah) return;
      if (nextSoundObject.current) try { await nextSoundObject.current.unloadAsync(); } catch (e) { }

      const { sound } = await Audio.Sound.createAsync(
        { uri: surah.verses[nextIndex].audio },
        { shouldPlay: false }
      );
      nextSoundObject.current = sound;
    } catch (e) { console.log('Preload error', e); }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      const nextIndex = indexRef.current + 1;
      if (surahRef.current && nextIndex < surahRef.current.verses.length) {
        playAyah(nextIndex);
      } else {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const playAyahAdapter = (surah: any, index: number) => {
    if (surah && surah.id !== surahRef.current?.id) {
      surahRef.current = surah;
      setCurrentSurah(surah);
    }
    playAyah(index);
  };

  const togglePlay = async () => {
    if (!soundObject.current) return;
    if (isPlaying) await soundObject.current.pauseAsync();
    else await soundObject.current.playAsync();
  };

  const skipAyah = async (direction: 'next' | 'prev') => {
    if (!surahRef.current) return;
    const newIndex = direction === 'next' ? indexRef.current + 1 : indexRef.current - 1;
    if (newIndex >= 0 && newIndex < surahRef.current.verses.length) {
      await playAyah(newIndex);
    }
  };

  const seekTo = async (value: number) => {
    if (soundObject.current) await soundObject.current.setPositionAsync(value);
  };

  // 🔥 UPDATED: SAVES TEXT
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
        text: verse.text // Save text!
      });
    }
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  // 🔥 UPDATED: ACCEPTS VERSE NUM
  const saveLastRead = async (surahId: number, verseId: number, verseNum: number, nameEn: string, nameAr: string) => {
    const data = { surahId, verseId, verseNum, nameEn, nameAr, timestamp: Date.now() };
    await AsyncStorage.setItem('last_read', JSON.stringify(data));
  };

  return (
    <AudioContext.Provider value={{
      sound: soundObject.current,
      isPlaying, currentSurah, currentAyahId, position, duration,
      favorites, themeMode, isLoading,
      playSurah,
      playAyah: playAyahAdapter,
      togglePlay, skipAyah, seekTo, setThemeMode, toggleFavorite, saveLastRead
    }}>
      {children}
    </AudioContext.Provider>
  );
};