import AsyncStorage from '@react-native-async-storage/async-storage';

// 👇 FIXED PATH: Go out of 'api', into 'app', then 'data'
import { staticSurahList } from '../app/data/surahList';

const BASE_URL = 'https://api.alquran.cloud/v1';

export const fetchSurahList = async () => {
  try {
    const cached = await AsyncStorage.getItem('cache_surah_list');
    if (cached) return JSON.parse(cached);
    return staticSurahList;
  } catch (error) {
    return staticSurahList;
  }
};

export const cacheSurahData = async (surahId: number) => {
  try {
    const response = await fetch(`${BASE_URL}/surah/${surahId}/ar.alafasy`);
    const json = await response.json();
    const data = json.data;

    const surahData = {
      id: data.number,
      nameAr: data.name,
      nameEn: data.englishName,
      verses: data.ayahs.map((ayah: any) => ({
        id: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        audio: ayah.audio,
      })),
    };

    await AsyncStorage.setItem(`cache_surah_${surahId}`, JSON.stringify(surahData));
    return true;
  } catch (e) { return false; }
};

export const fetchSurah = async (surahId: number) => {
  try {
    const cacheKey = `cache_surah_${surahId}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const response = await fetch(`${BASE_URL}/surah/${surahId}/ar.alafasy`);
    const json = await response.json();
    const data = json.data;

    const surahData = {
      id: data.number,
      nameAr: data.name,
      nameEn: data.englishName,
      verses: data.ayahs.map((ayah: any) => ({
        id: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        audio: ayah.audio,
      })),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(surahData));
    return surahData;
  } catch (error) { return null; }
};