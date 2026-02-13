import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchSurah } from '../../api/quranApi';

// 1. Defined Reciters
// 🆕 UPDATED RECITERS LIST WITH IMAGES
export const RECITERS = [
  { 
    id: 'mishary', 
    name: 'Mishary Alafasy', 
    urlPath: 'Alafasy_128kbps',
    // ⬇️ Use require for local images
    image: require('../../assets/reciters/mishary.jpg') 
  },
  { 
    id: 'sudais', 
    name: 'Abdurrahmaan As-Sudais', 
    urlPath: 'Abdurrahmaan_As-Sudais_192kbps',
    image: require('../../assets/reciters/sudais.jpg')
  },
  { 
    id: 'basit', 
    name: 'Abdul Basit', 
    urlPath: 'Abdul_Basit_Murattal_192kbps',
    image: require('../../assets/reciters/basit.jpg')
  },
];

// 2. URL Generator
const getReciterUrl = (reciterPath: string, surahId: number, verseIndex: number) => {
  const s = String(surahId).padStart(3, '0');
  const v = String(verseIndex + 1).padStart(3, '0');
  return `https://everyayah.com/data/${reciterPath}/${s}${v}.mp3`;
};

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
  
  const [activeReciter, setActiveReciter] = useState(RECITERS[0]);

  // --- REFS ---
  // 🆕 Vital: We use a Ref to track the reciter instantly inside audio callbacks
  const activeReciterRef = useRef(RECITERS[0]); 
  
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
    loadReciter();
    setupAudioMode();

    return () => {
      killAllSounds();
    };
  }, []);

  // 🆕 CHANGING RECITER (Now cleans up old audio)
  const changeReciter = async (reciter: any) => {
    setActiveReciter(reciter);
    activeReciterRef.current = reciter; // Update Ref immediately
    await AsyncStorage.setItem('preferred_reciter', JSON.stringify(reciter));
    
    // 🛑 CRITICAL: Stop current AND kill preloaded next/prev files
    // otherwise the "Next" button will play the old voice from memory.
    await killAllSounds();
    setIsPlaying(false);
  };

  const loadReciter = async () => {
    const stored = await AsyncStorage.getItem('preferred_reciter');
    if (stored) {
        const parsed = JSON.parse(stored);
        setActiveReciter(parsed);
        activeReciterRef.current = parsed;
    }
  };

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

  const loadFavorites = async () => {
    const stored = await AsyncStorage.getItem('favorites');
    if (stored) setFavorites(JSON.parse(stored));
  };

  // --- KILLER FUNCTIONS ---
  const killAllSounds = async () => {
      await killCurrentSound();
      await killNextPreloadedSound();
      await killPrevPreloadedSound();
  };

  const killCurrentSound = async () => {
    if (soundRef.current) {
      try {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {}
      soundRef.current = null;
    }
  };

  const killNextPreloadedSound = async () => {
    if (nextPreloadedSoundRef.current) {
      try { await nextPreloadedSoundRef.current.unloadAsync(); } catch (error) {}
      nextPreloadedSoundRef.current = null;
    }
  };

  const killPrevPreloadedSound = async () => {
    if (prevPreloadedSoundRef.current) {
      try { await prevPreloadedSoundRef.current.unloadAsync(); } catch (error) {}
      prevPreloadedSoundRef.current = null;
    }
  };

  // --- PRELOAD ---
  const preloadAdjacentAyahs = async (currentIndex: number) => {
    if (!surahRef.current) return;

    // Preload Prev
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && !isPreloadingPrev.current) {
      isPreloadingPrev.current = true;
      try {
        await killPrevPreloadedSound();
        // 🆕 Use Ref here to get the LATEST reciter
        const audioUrl = getReciterUrl(activeReciterRef.current.urlPath, surahRef.current.id, prevIndex);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
        prevPreloadedSoundRef.current = sound;
      } catch (error) { console.log("Prev preload error", error); } 
      finally { isPreloadingPrev.current = false; }
    }

    // Preload Next
    const nextIndex = currentIndex + 1;
    if (nextIndex < surahRef.current.verses.length && !isPreloadingNext.current) {
      isPreloadingNext.current = true;
      try {
        await killNextPreloadedSound();
        // 🆕 Use Ref here too
        const audioUrl = getReciterUrl(activeReciterRef.current.urlPath, surahRef.current.id, nextIndex);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
        nextPreloadedSoundRef.current = sound;
      } catch (error) { console.log("Next preload error", error); } 
      finally { isPreloadingNext.current = false; }
    }
  };

  // --- PLAYBACK STATUS ---
  const onPlaybackStatusUpdate = async (status: any) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      const nextIndex = indexRef.current + 1;
      
      if (surahRef.current && nextIndex < surahRef.current.verses.length) {
        if (nextPreloadedSoundRef.current) {
          // Swap logic
          const nextSound = nextPreloadedSoundRef.current;
          nextPreloadedSoundRef.current = null;
          
          const oldSound = soundRef.current;
          soundRef.current = nextSound;
          if (oldSound) { oldSound.unloadAsync(); }

          indexRef.current = nextIndex;
          setCurrentAyahId(surahRef.current.verses[nextIndex].id);
          setPosition(0);

          await nextSound.playAsync();
          nextSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          preloadAdjacentAyahs(nextIndex);
        } else {
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
    await killAllSounds();
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

    if (index === indexRef.current && soundRef.current) {
      if (isPlaying) await soundRef.current.setPositionAsync(0);
      else await soundRef.current.playAsync();
      return;
    }

    if (isBusy.current) return;
    isBusy.current = true;

    try {
      if (soundRef.current) soundRef.current.setOnPlaybackStatusUpdate(null);
      await killCurrentSound();

      // Check preloads to avoid glitches, but ensure we kill if jumping non-sequentially
      if (nextPreloadedSoundRef.current && index !== indexRef.current + 1) await killNextPreloadedSound();
      if (prevPreloadedSoundRef.current && index !== indexRef.current - 1) await killPrevPreloadedSound();

      setCurrentAyahId(surahRef.current.verses[index].id);
      indexRef.current = index;
      setPosition(0);
      setIsPlaying(true);

      // 🆕 Use Ref for URL generation
      const audioUrl = getReciterUrl(activeReciterRef.current.urlPath, surahRef.current.id, index);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      preloadAdjacentAyahs(index);

    } catch (error) {
      console.log("Play Error:", error);
    } finally {
      isBusy.current = false;
    }
  };

  const skipAyah = async (direction: 'next' | 'prev') => {
    if (!surahRef.current || isBusy.current) return;
    const newIndex = direction === 'next' ? indexRef.current + 1 : indexRef.current - 1;
    if (newIndex < 0 || newIndex >= surahRef.current.verses.length) return;

    if (direction === 'next' && nextPreloadedSoundRef.current) {
        // Fast path for next
         isBusy.current = true;
         try {
            await killCurrentSound();
            soundRef.current = nextPreloadedSoundRef.current;
            nextPreloadedSoundRef.current = null;
            
            indexRef.current = newIndex;
            setCurrentAyahId(surahRef.current.verses[newIndex].id);
            setPosition(0);
            setIsPlaying(true);
            
            await soundRef.current.playAsync();
            soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
            preloadAdjacentAyahs(newIndex);
         } catch(e) { await playAyah(newIndex); } 
         finally { isBusy.current = false; }
    } else {
      await playAyah(newIndex);
    }
  };

  const togglePlay = async () => { if (soundRef.current) isPlaying ? await soundRef.current.pauseAsync() : await soundRef.current.playAsync(); };
  const seekTo = async (value: number) => { if (soundRef.current) await soundRef.current.setPositionAsync(value); };
  
  // --- FAVORITES & LAST READ (Unchanged) ---
  const toggleFavorite = async (surah: any, verse: any) => {
    let newFavs = [...favorites];
    const exists = newFavs.some(f => f.surahId === surah.id && f.verseId === verse.id);
    if (exists) newFavs = newFavs.filter(f => !(f.surahId === surah.id && f.verseId === verse.id));
    else newFavs.push({ surahId: surah.id, verseId: verse.id, surahName: surah.nameEn, verseNum: verse.numberInSurah, text: verse.text });
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
  };
  
  const saveLastRead = async (surahId: number, verseId: number, verseNum: number, nameEn: string, nameAr: string) => {
    const data = { surahId, verseId, verseNum, nameEn, nameAr, timestamp: Date.now() };
    await AsyncStorage.setItem('last_read', JSON.stringify(data));
  };

  return (
    <AudioContext.Provider
      value={{
        isPlaying, currentSurah, currentAyahId, position, duration, favorites, themeMode, isLoading,
        activeReciter, RECITERS, changeReciter,
        playSurah,
        playAyah: (surah: any, idx: number) => {
          if (surah.id !== surahRef.current?.id) {
            surahRef.current = surah;
            setCurrentSurah(surah);
          }
          playAyah(idx);
        },
        togglePlay, skipAyah, seekTo, setThemeMode, toggleFavorite, saveLastRead,
      }}>
      {children}
    </AudioContext.Provider>
  );
};