import surah1 from './surah_1';
import surah2 from './surah_2';

// Registry Map
const SURAH_REGISTRY = {
  1: surah1,
  2: surah2,
};

export const getSurahData = (id) => {
  return SURAH_REGISTRY[id] || null;
};

// 👇 1. Helper to calculate the visual number (e.g. Isti'adha = -1)
export const getVerseNumber = (surahId, verseId) => {
  if (surahId === 1) {
    return verseId - 2; 
  }
  return verseId - 1; 
};

// 👇 2. THIS IS THE MISSING FUNCTION CAUSING THE CRASH
export const getAyahLabel = (surahId, verseId) => {
  const num = getVerseNumber(surahId, verseId);
  if (num <= 0) return "Intro";
  return `Ayah ${num}`;
};