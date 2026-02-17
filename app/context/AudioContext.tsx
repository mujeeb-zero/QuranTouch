import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fetchSurah } from '../../api/quranApi';

// --- CONFIGURATION ---
export const RECITERS = [
  { id: 'mishary', name: 'Mishary Alafasy', urlPath: 'Alafasy_128kbps', image: require('../../assets/reciters/mishary.jpg') },
  { id: 'sudais', name: 'Abdurrahmaan As-Sudais', urlPath: 'Abdurrahmaan_As-Sudais_192kbps', image: require('../../assets/reciters/sudais.jpg') },
  { id: 'basit', name: 'Abdul Basit', urlPath: 'Abdul_Basit_Murattal_192kbps', image: require('../../assets/reciters/basit.jpg') },
];

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
  const [isLoading, setIsLoading] = useState(false);
  
  // --- PREFERENCES ---
  const [favorites, setFavorites] = useState<any[]>([]);
  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');
  const [fontSize, setFontSizeState] = useState(28);
  const [showTranslation, setShowTranslationState] = useState(false);
  const [activeReciter, setActiveReciter] = useState(RECITERS[0]);

  // --- REFS ---
  const activeReciterRef = useRef(RECITERS[0]); 
  const soundRef = useRef<Audio.Sound | null>(null);
  const nextPreloadedSoundRef = useRef<Audio.Sound | null>(null);
  const prevPreloadedSoundRef = useRef<Audio.Sound | null>(null);
  const surahRef = useRef<any>(null);
  const indexRef = useRef(0);
  const isBusy = useRef(false);
  const isPreloadingNext = useRef(false);
  const isPreloadingPrev = useRef(false);

  // --- 1. LOAD SETTINGS ---
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const keys = ['favorites', 'activeReciter', 'themeMode', 'fontSize', 'showTranslation'];
        const result = await AsyncStorage.multiGet(keys);

        if (result[0][1]) setFavorites(JSON.parse(result[0][1]));
        if (result[1][1]) {
          const r = JSON.parse(result[1][1]);
          setActiveReciter(r);
          activeReciterRef.current = r;
        }
        if (result[2][1]) setThemeModeState(result[2][1] as any);
        if (result[3][1]) setFontSizeState(parseInt(result[3][1]));
        if (result[4][1] !== null) setShowTranslationState(result[4][1] === 'true');
      } catch (e) { console.log("Error loading settings:", e); }
    };
    loadSettings();
    setupAudioMode();
    return () => { killAllSounds(); };
  }, []);

  // --- 2. SAVE FUNCTIONS ---
  const setThemeMode = async (mode: 'system' | 'light' | 'dark') => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  const setFontSize = async (size: number) => {
    setFontSizeState(size);
    await AsyncStorage.setItem('fontSize', size.toString());
  };

  const setShowTranslation = async (show: boolean) => {
    setShowTranslationState(show);
    await AsyncStorage.setItem('showTranslation', show ? 'true' : 'false');
  };

  const changeReciter = async (reciter: any) => {
    setActiveReciter(reciter);
    activeReciterRef.current = reciter;
    await AsyncStorage.setItem('activeReciter', JSON.stringify(reciter));
    await killAllSounds();
    setIsPlaying(false);
  };
  
  const toggleFavorite = async (surah: any, verse: any) => {
    if (!surah?.id || !verse?.id) return;
    let newFavs = [...favorites];
    const exists = newFavs.some(f => f.surahId === surah.id && f.verseId === verse.id);

    if (exists) newFavs = newFavs.filter(f => !(f.surahId === surah.id && f.verseId === verse.id));
    else newFavs.push({ surahId: surah.id, verseId: verse.id, surahName: surah.nameEn || surah.englishName, nameAr: surah.nameAr || surah.name, verseNum: verse.numberInSurah, text: verse.text });
    
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const saveLastRead = async (surahId: number, verseId: number, verseNum: number, nameEn: string, nameAr: string) => {
    const data = { surahId, verseId, verseNum, nameEn, nameAr, timestamp: Date.now() };
    await AsyncStorage.setItem('last_read', JSON.stringify(data));
  };

  // --- AUDIO LOGIC ---
  const setupAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {}
  };

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

  const preloadAdjacentAyahs = async (currentIndex: number) => {
    if (!surahRef.current) return;

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && !isPreloadingPrev.current) {
      isPreloadingPrev.current = true;
      try {
        await killPrevPreloadedSound();
        const audioUrl = getReciterUrl(activeReciterRef.current.urlPath, surahRef.current.id, prevIndex);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
        prevPreloadedSoundRef.current = sound;
      } catch (error) {} 
      finally { isPreloadingPrev.current = false; }
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < surahRef.current.verses.length && !isPreloadingNext.current) {
      isPreloadingNext.current = true;
      try {
        await killNextPreloadedSound();
        const audioUrl = getReciterUrl(activeReciterRef.current.urlPath, surahRef.current.id, nextIndex);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
        nextPreloadedSoundRef.current = sound;
      } catch (error) {} 
      finally { isPreloadingNext.current = false; }
    }
  };

  const onPlaybackStatusUpdate = async (status: any) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      const nextIndex = indexRef.current + 1;
      
      // 1. CHECK IF THERE IS A NEXT AYAH IN THIS SURAH
      if (surahRef.current && nextIndex < surahRef.current.verses.length) {
        if (nextPreloadedSoundRef.current) {
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
        // 2. 👇 FIX: END OF SURAH DETECTED
        // If we are here, we finished the last Ayah.
        setIsPlaying(false);
        setPosition(0);

        if (surahRef.current && surahRef.current.id < 114) {
           console.log("Auto-playing next Surah...");
           // Wait a tiny bit for UI to settle, then play next Surah
           setTimeout(() => {
             playSurah(surahRef.current.id + 1, 0, true);
           }, 500);
        }
      }
    }
  };

  const playSurah = async (surahId: number, startAyahIndex = 0, autoPlay = true) => {
    await killAllSounds();
    setIsLoading(true);
    try {
      const data = await fetchSurah(surahId);
      if (!data) return;
      surahRef.current = data;
      setCurrentSurah(data);
      // Wait for state to update before playing
      setTimeout(() => {
          playAyah(startAyahIndex); 
      }, 100);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const playAyah = async (index: number) => {
    if (!surahRef.current || !surahRef.current.verses[index]) return;

    // 👇 FIX: REPLAY LOGIC
    if (index === indexRef.current && soundRef.current) {
      if (isPlaying) {
         // If playing, restart ayah
         await soundRef.current.setPositionAsync(0);
      } else {
         // If paused or finished, REWIND then Play (Fixes the "Last Ayah" bug)
         await soundRef.current.setPositionAsync(0); 
         await soundRef.current.playAsync();
      }
      return;
    }

    if (isBusy.current) return;
    isBusy.current = true;

    try {
      if (soundRef.current) soundRef.current.setOnPlaybackStatusUpdate(null);
      await killCurrentSound();

      if (nextPreloadedSoundRef.current && index !== indexRef.current + 1) await killNextPreloadedSound();
      if (prevPreloadedSoundRef.current && index !== indexRef.current - 1) await killPrevPreloadedSound();

      setCurrentAyahId(surahRef.current.verses[index].id);
      indexRef.current = index;
      setPosition(0);
      setIsPlaying(true);

      const audioUrl = getReciterUrl(activeReciterRef.current.urlPath, surahRef.current.id, index);
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      preloadAdjacentAyahs(index);

    } catch (error) { console.log("Play Error:", error); } 
    finally { isBusy.current = false; }
  };

  const skipAyah = async (direction: 'next' | 'prev') => {
    if (!surahRef.current || isBusy.current) return;
    const newIndex = direction === 'next' ? indexRef.current + 1 : indexRef.current - 1;
    if (newIndex < 0 || newIndex >= surahRef.current.verses.length) return;

    if (direction === 'next' && nextPreloadedSoundRef.current) {
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

  return (
    <AudioContext.Provider
      value={{
        isPlaying, currentSurah, currentAyahId, position, duration, favorites, isLoading,
        activeReciter, RECITERS, themeMode, fontSize, showTranslation,
        changeReciter, setThemeMode, setFontSize, setShowTranslation,
        playSurah,
        playAyah: (surah: any, idx: number) => {
          if (surah.id !== surahRef.current?.id) {
            surahRef.current = surah;
            setCurrentSurah(surah);
          }
          playAyah(idx);
        },
        togglePlay, skipAyah, seekTo, toggleFavorite, saveLastRead,
      }}>
      {children}
    </AudioContext.Provider>
  );
};