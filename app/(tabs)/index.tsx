import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
        <View style={styles.brandingContainer}><Text style={styles.brandingTitle}>THE NOBLE QURAN</Text></View>

        {/* 🔥 UPDATED SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#BFA868" style={{ marginRight: 10 }} />
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
                <Text style={styles.cardSubText}>Ayah {lastRead?.verseNum || "1"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.miniCard, { backgroundColor: '#BFA868' }]} onPress={() => router.push('/favorites')}>
                <Text style={[styles.cardLabel, { color: '#FFF' }]}>FAVORITES</Text>
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
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.surahTitle}>{item.englishName}</Text>
                <Text style={styles.surahSubtitle}>{item.numberOfAyahs} Verses</Text>
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
              <Ionicons name="play-skip-back" size={24} color="#BFA868" />
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
              <Ionicons name="play-skip-forward" size={24} color="#BFA868" />
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
  brandingContainer: { alignItems: 'center', marginBottom: 15 },
  brandingTitle: { fontSize: 22, fontWeight: 'bold', color: '#BFA868', fontFamily: 'AlmendraSC' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#BFA868' },
  searchInput: { flex: 1, fontSize: 16, textAlign: 'left', marginRight: 10 },
  miniCard: { flex: 1, padding: 15, borderRadius: 12, height: 110, elevation: 4, justifyContent: 'center' },
  cardLabel: { color: '#BFA868', fontSize: 10, fontWeight: 'bold' },
  cardMainText: { color: '#FFF', fontSize: 18, marginTop: 5, fontFamily: 'AlMushaf' },
  cardSubText: { color: '#CCC', fontSize: 12, marginTop: 2 },
  surahCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  numberCircle: { width: 35, height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#BFA868', justifyContent: 'center', alignItems: 'center' },
  numberText: { color: '#BFA868', fontSize: 12 },
  surahTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  surahSubtitle: { fontSize: 11, color: '#888' },
  arabicName: { fontSize: 18, fontFamily: 'AlMushaf' },

  // MINI PLAYER
  miniPlayerContainer: {
    position: 'absolute', bottom: 15, left: 15, right: 15,
    backgroundColor: '#1A1A1A', borderRadius: 15, padding: 12,
    flexDirection: 'row', alignItems: 'center', elevation: 10, zIndex: 100
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center' },
  skipBtn: { padding: 10 },
  miniPlayButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#BFA868', justifyContent: 'center',
    alignItems: 'center', marginHorizontal: 5
  },
  textColumn: { flex: 1, alignItems: 'flex-end', paddingLeft: 10 },
  miniPlayerLabel: { color: '#888', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  miniPlayerTitle: { color: '#BFA868', fontSize: 18, fontFamily: 'AlMushaf', marginTop: -2 },
  miniPlayerSub: { color: '#FFF', fontSize: 11, marginTop: -2 }
});