import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const fetchSurah = async (surahId: number) => {
  try {
    const cacheKey = `cache_surah_${surahId}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    // If cache exists, return it
    if (cached) return JSON.parse(cached);

    // 1. Fetch Arabic (Critical)
    const arRes = await fetch(`${BASE_URL}/surah/${surahId}/ar.alafasy`);
    const arJson = await arRes.json();
    if (!arJson.data) throw new Error("Arabic data not found");

    // 2. Fetch English (Optional - in its own try/catch)
    let enJson = null;
    try {
      const enRes = await fetch(`${BASE_URL}/surah/${surahId}/en.sahih`);
      enJson = await enRes.json();
    } catch (e) {
      console.log("Translation fetch failed, continuing with Arabic only.");
    }

    const surahData = {
      id: arJson.data.number,
      nameAr: arJson.data.name,
      nameEn: arJson.data.englishName,
      verses: arJson.data.ayahs.map((ayah: any, index: number) => ({
        id: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        audio: ayah.audio,
        // Add translation if it exists, otherwise empty string
        translation: enJson?.data?.ayahs?.[index]?.text || "" 
      })),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(surahData));
    return surahData;
  } catch (error) {
    console.error("Critical Fetch Error:", error);
    return null; 
  }
};

export const cacheSurahData = async (surahId: number) => {
  return await fetchSurah(surahId); // Reuses the logic above
};