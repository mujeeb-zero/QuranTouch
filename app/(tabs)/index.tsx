import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../context/AudioContext';
import { staticSurahList } from '../data/surahList';



export default function HomeScreen() {
  const router = useRouter();
  const [filteredSurahs, setFilteredSurahs] = useState(staticSurahList);
  const [searchQuery, setSearchQuery] = useState('');

  const { favorites, currentSurah, isPlaying, togglePlay, playSurah } = useAudio();
  const [lastRead, setLastRead] = useState<any>(null);

  useEffect(() => {
    const initializeSync = async () => {
      // 1. ADD THIS LINE:
      await AsyncStorage.clear();

      // 2. RUN THE APP ONCE
      // 3. DELETE THE LINE ABOVE AFTER THE APP LOADS

      const lastIdStr = await AsyncStorage.getItem('last_bg_download_id');
      // ... rest of your code
    };
    initializeSync();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('last_read');
          if (jsonValue != null) setLastRead(JSON.parse(jsonValue));
        } catch (e) { }
      };
      loadData();
    }, [])
  );

  // 🔥 HELPER: Remove Tashkeel (diacritics) from Arabic text for easier searching
  const normalizeArabic = (text: string) => {
    return text.replace(/[\u064B-\u065F]/g, '');
  };

  // 🔥 UPDATED SEARCH LOGIC
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (!text) {
      setFilteredSurahs(staticSurahList);
      return;
    }

    const lowerText = text.toLowerCase();
    const normalizedInput = normalizeArabic(text); // Handle Arabic input

    const filtered = staticSurahList.filter(s => {
      const englishMatch = s.englishName.toLowerCase().includes(lowerText);
      const numberMatch = s.number.toString().includes(lowerText);

      // Check Arabic Name (ignoring tashkeel)
      const arabicNameNormalized = normalizeArabic(s.name);
      const arabicMatch = arabicNameNormalized.includes(normalizedInput);

      return englishMatch || numberMatch || arabicMatch;
    });

    setFilteredSurahs(filtered);
  };

  const skipSurah = (direction: 'next' | 'prev') => {
    if (!currentSurah) return;
    const newId = direction === 'next' ? currentSurah.id + 1 : currentSurah.id - 1;
    if (newId > 0 && newId <= 114) playSurah(newId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.fixedHeader}>
        {/* Header Section */}
<View style={styles.brandingContainer}>
  <Text style={styles.brandingTitle}>The Noble Quran</Text>

  <TouchableOpacity onPress={() => router.push('/credits')}>
          <Ionicons name="information-circle-outline" size={28} color="#000" />
        </TouchableOpacity>
  
</View>

        {/* 🔥 UPDATED SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#fee08c" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Surah or Number..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={filteredSurahs}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity
                style={[styles.miniCard, { backgroundColor: '#252525', marginRight: 10 }]}
                onPress={() => lastRead && router.push({ pathname: '/player', params: { surahId: lastRead.surahId, initialAyah: lastRead.verseNum } })}
              >
                <Text style={styles.cardLabel}>LAST READ</Text>
                <Text style={styles.cardMainText} numberOfLines={1}>{lastRead?.nameAr || "Al-Fatiha"}</Text>

                {/* 🔥 FIX: Display Verse NUMBER (relative) not ID (global) */}
                <Text style={[styles.cardSubText, { color: '#FFF' }]}>Ayah {lastRead?.verseNum || "1"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.miniCard, { backgroundColor: '#252525' }]} onPress={() => router.push('/favorites')}>
                <Text style={styles.cardLabel}>FAVORITES</Text>
                <Text style={styles.cardMainText}>{favorites?.length || 0} Saved</Text>
                <Text style={[styles.cardSubText, { color: '#FFF' }]}>View All</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
          keyExtractor={(item) => item.number.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.surahCard}
              onPress={() => router.push({ pathname: '/player', params: { surahId: item.number } })}
            >
              <View style={styles.numberCircle}><Text style={styles.numberText}>{item.number}</Text></View>
              <View style={{ flex: 1, marginLeft: 15, justifyContent: 'center' }}>
  {/* Top: Surah Name */}
  <Text style={styles.surahTitle}>{item.englishName}</Text>

  {/* Middle: Translation (BrunoAceSC Font) */}
  <Text style={styles.surahSubtitle}>
    {item.englishNameTranslation}
  </Text>

  {/* Bottom: Verse Count (Smaller & Different Color) */}
  <Text style={styles.versesText}>
    {item.numberOfAyahs} Verses
  </Text>
</View>
              <Text style={styles.arabicName}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </KeyboardAvoidingView>

      {/* MINI PLAYER */}
      {currentSurah && (
        <View style={styles.miniPlayerContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => skipSurah('next')} style={styles.skipBtn}>
              <Ionicons name="play-skip-back" size={24} color="#fee08c" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.miniPlayButton}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={26}
                color="#000"
                style={!isPlaying ? { marginLeft: 4 } : {}}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => skipSurah('prev')} style={styles.skipBtn}>
              <Ionicons name="play-skip-forward" size={24} color="#fee08c" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.textColumn} onPress={() => router.push({ pathname: '/player', params: { surahId: currentSurah.id } })}>
            <Text style={styles.miniPlayerLabel}>CONTINUE READING</Text>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentSurah.nameAr}</Text>
            <Text style={styles.miniPlayerSub}>{currentSurah.nameEn}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  fixedHeader: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: '#FDFBF7' },
  brandingContainer: { alignItems: 'center', marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20, paddingHorizontal: 25,},
  brandingTitle: { fontSize: 25, fontWeight: 'bold', color: '#847347', fontFamily: 'Cinzel' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#fee08c' },
  searchInput: { flex: 1, fontSize: 16, textAlign: 'left', color: '#333', marginRight: 10, fontFamily: 'Jura' },
  miniCard: { flex: 1, padding: 15, borderRadius: 12, height: 120, elevation: 4, justifyContent: 'center' },
  cardLabel: { color: '#ffffff', fontSize: 14, fontFamily: 'Jura' },
  cardMainText: { color: '#fee08c', fontSize: 16, marginTop: 10, fontFamily: 'Cinzel' },
  cardSubText: { color: '#CCC', fontSize: 15, marginTop: 5, fontFamily: 'Jura' },
  surahCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  numberCircle: {width: 43, height: 43, borderRadius: 19, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  numberText: { color: '#333', fontSize: 19, fontFamily: 'AlmendraSC', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, lineHeight: 19 },
  surahTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', fontFamily: 'Cinzel' },
  surahSubtitle: { fontSize: 12, color: '#333', fontFamily: 'BrunoAceSC' },
  versesText: { fontSize: 10, color: '#333', marginTop: 2, fontFamily: 'Jura' },
  arabicName: { fontSize: 26, fontFamily: 'AlMushaf' },
  
  

  // MINI PLAYER
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: '#333', // Darker black background
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 }
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15, // Space between buttons
  },
  skipBtn: {
    padding: 5,
  },
  miniPlayButton: {
    width: 55,  // Bigger circle
    height: 55,
    borderRadius: 27.5, // Perfect circle
    backgroundColor: '#fee08c', // Gold color
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  textColumn: {
    flex: 1,
    alignItems: 'flex-end', // Align text to the right
    justifyContent: 'center',
    marginRight: 10, // 👈 Fixes text stuck at the corner
  },
  miniPlayerLabel: {
    color: '#ffffff',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontFamily: 'Jura'
  },
  miniPlayerTitle: {
    color: '#fee08c',
    fontFamily: 'AlMushaf', // Arabic Font
    fontSize: 26,
    textAlign: 'right',
  },
  miniPlayerSub: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    fontFamily: 'Cinzel'
  },
});