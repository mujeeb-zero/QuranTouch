import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudio } from '../context/AudioContext';
import { staticSurahList } from '../data/surahList';

// 🔥 THE OFFICIAL 30 JUZ MAPPING
const juzList = [
  { number: 1, name: 'آلم', englishName: 'Alif Lam Meem', surahId: 1, verseNum: 1 },
  { number: 2, name: 'سيقول', englishName: 'Sayaqool', surahId: 2, verseNum: 142 },
  { number: 3, name: 'تلك الرسل', englishName: 'Tilkal Rusull', surahId: 2, verseNum: 253 },
  { number: 4, name: 'لن تنالوا', englishName: 'Lan Tana Loo', surahId: 3, verseNum: 93 },
  { number: 5, name: 'والمحصنات', englishName: 'Wal Mohsanat', surahId: 4, verseNum: 24 },
  { number: 6, name: 'لا يحب الله', englishName: 'La Yuhibbullah', surahId: 4, verseNum: 148 },
  { number: 7, name: 'واذا سمعوا', englishName: 'Wa Iza Samiu', surahId: 5, verseNum: 82 },
  { number: 8, name: 'ولو اننا', englishName: 'Wa Lau Annana', surahId: 6, verseNum: 111 },
  { number: 9, name: 'قال الملأ', englishName: 'Qalal Malao', surahId: 7, verseNum: 88 },
  { number: 10, name: 'واعلموا', englishName: 'Wa A\'lamu', surahId: 8, verseNum: 41 },
  { number: 11, name: 'يعتذرون', englishName: 'Yatazeroon', surahId: 9, verseNum: 93 },
  { number: 12, name: 'وما من دابة', englishName: 'Wa Mamin Da\'abat', surahId: 11, verseNum: 6 },
  { number: 13, name: 'وما ابرئ', englishName: 'Wa Ma Ubarri\'u', surahId: 12, verseNum: 53 },
  { number: 14, name: 'ربما', englishName: 'Rubama', surahId: 15, verseNum: 1 },
  { number: 15, name: 'سبحان الذي', englishName: 'Subhanallazi', surahId: 17, verseNum: 1 },
  { number: 16, name: 'قال ألم', englishName: 'Qal Alam', surahId: 18, verseNum: 75 },
  { number: 17, name: 'اقترب للناس', englishName: 'Iqtaraba Lin Nasi', surahId: 21, verseNum: 1 },
  { number: 18, name: 'قد أفلح', englishName: 'Qad Aflaha', surahId: 23, verseNum: 1 },
  { number: 19, name: 'وقال الذين', englishName: 'Wa Qalal Lazina', surahId: 25, verseNum: 21 },
  { number: 20, name: 'أمن خلق', englishName: 'A\'man Khalaqa', surahId: 27, verseNum: 56 },
  { number: 21, name: 'اتل ما اوحي', englishName: 'Utlu Ma Oohi', surahId: 29, verseNum: 46 },
  { number: 22, name: 'ومن يقنت', englishName: 'Wa Manyaqnut', surahId: 33, verseNum: 31 },
  { number: 23, name: 'وما انزلنا', englishName: 'Wa Ma Anzalna', surahId: 36, verseNum: 28 },
  { number: 24, name: 'فمن أظلم', englishName: 'Faman Azlamu', surahId: 39, verseNum: 32 },
  { number: 25, name: 'إليه يرد', englishName: 'Ilayhi Yuraddu', surahId: 41, verseNum: 47 },
  { number: 26, name: 'حم', englishName: 'Ha Meem', surahId: 46, verseNum: 1 },
  { number: 27, name: 'قال فما خطبكم', englishName: 'Qala Fama Khatbukum', surahId: 51, verseNum: 31 },
  { number: 28, name: 'قد سمع الله', englishName: 'Qadd Sami Allah', surahId: 58, verseNum: 1 },
  { number: 29, name: 'تبارك الذي', englishName: 'Tabarakallazi', surahId: 67, verseNum: 1 },
  { number: 30, name: 'عم يتساءلون', englishName: 'Amma Yatasa\'aloon', surahId: 78, verseNum: 1 },
];

export default function HomeScreen() {
  const router = useRouter();
  
  // 🔥 NEW STATE: Track the active tab
  const [activeTab, setActiveTab] = useState<'surah' | 'juz'>('surah');
  
  const [filteredSurahs, setFilteredSurahs] = useState(staticSurahList);
  const [searchQuery, setSearchQuery] = useState('');

  const { favorites, currentSurah, isPlaying, togglePlay, playSurah } = useAudio();
  const [lastRead, setLastRead] = useState<any>(null);

  useEffect(() => {
    const initializeSync = async () => {
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

  const normalizeArabic = (text: string) => {
    return text.replace(/[\u064B-\u065F]/g, '');
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setActiveTab('surah'); // Auto-switch to Surah tab if they start searching

    if (!text) {
      setFilteredSurahs(staticSurahList);
      return;
    }

    const lowerText = text.toLowerCase();
    const normalizedInput = normalizeArabic(text); 

    const filtered = staticSurahList.filter(s => {
      const englishMatch = s.englishName.toLowerCase().includes(lowerText);
      const numberMatch = s.number.toString().includes(lowerText);
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
        <View style={styles.brandingContainer}>
          <Text style={styles.brandingTitle}>The Noble Quran</Text>
          <TouchableOpacity onPress={() => router.push('/credits')}>
            <Ionicons name="information-circle-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>

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
          // 🔥 DYNAMIC DATA: Swap between Surahs or Juz
          data={activeTab === 'surah' ? filteredSurahs : juzList}
          keyExtractor={(item) => item.number.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 130 }}
          
          ListHeaderComponent={
            <View>
              {/* TOP CARDS */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <TouchableOpacity
                  style={[styles.miniCard, { backgroundColor: '#252525', marginRight: 10 }]}
                  onPress={() => lastRead && router.push({ pathname: '/player', params: { surahId: lastRead.surahId, initialAyah: lastRead.verseNum } })}
                >
                  <Text style={styles.cardLabel}>LAST READ</Text>
                  <Text style={styles.cardMainText} numberOfLines={1}>{lastRead?.nameAr || "Al-Fatiha"}</Text>
                  <Text style={[styles.cardSubText, { color: '#FFF' }]}>Ayah {lastRead?.verseNum || "1"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.miniCard, { backgroundColor: '#252525' }]} onPress={() => router.push('/favorites')}>
                  <Text style={styles.cardLabel}>FAVORITES</Text>
                  <Text style={styles.cardMainText}>{favorites?.length || 0} Saved</Text>
                  <Text style={[styles.cardSubText, { color: '#FFF' }]}>View All</Text>
                </TouchableOpacity>
              </View>

              {/* 🔥 NEW: CHAPTER & JUZ NAVIGATION BUTTONS */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'surah' && styles.tabButtonActive]} 
                  onPress={() => setActiveTab('surah')}
                >
                  <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>Chapter (Surah)</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'juz' && styles.tabButtonActive]} 
                  onPress={() => setActiveTab('juz')}
                >
                  <Text style={[styles.tabText, activeTab === 'juz' && styles.tabTextActive]}>Juz (Parah)</Text>
                </TouchableOpacity>
              </View>
            </View>
          }

          // 🔥 DYNAMIC RENDER: Change how the card looks based on the tab
          renderItem={({ item }) => {
            if (activeTab === 'surah') {
              // --- RENDER SURAH CARD ---
              return (
                <TouchableOpacity
                  style={styles.surahCard}
                  onPress={() => router.push({ pathname: '/player', params: { surahId: item.number } })}
                >
                  <View style={styles.numberCircle}><Text style={styles.numberText}>{item.number}</Text></View>
                  <View style={{ flex: 1, marginLeft: 15, justifyContent: 'center' }}>
                    <Text style={styles.surahTitle}>{item.englishName}</Text>
                    <Text style={styles.surahSubtitle}>{(item as any).englishNameTranslation}</Text>
                    <Text style={styles.versesText}>{(item as any).numberOfAyahs} Verses</Text>
                  </View>
                  <Text style={styles.arabicName}>{item.name}</Text>
                </TouchableOpacity>
              );
            } else {
              // --- RENDER JUZ CARD ---
              
              return (
                <TouchableOpacity
                  style={styles.surahCard}
                  // 👇 THIS LINE IS THE MAGIC 👇
                  onPress={() => router.push({ pathname: '/player', params: { surahId: item.surahId, initialAyah: item.verseNum } })}
                >
                  <View style={styles.numberCircle}><Text style={styles.numberText}>{item.number}</Text></View>
                  <View style={{ flex: 1, marginLeft: 15, justifyContent: 'center' }}>
                    <Text style={styles.surahTitle}>{item.englishName}</Text>
                    {/* 👇 Updated to show exactly where it starts 👇 */}
                    <Text style={styles.surahSubtitle}>Starts at Surah {item.surahId}, Ayah {item.verseNum}</Text>
                  </View>
                  <Text style={styles.arabicName}>{item.name}</Text>
                </TouchableOpacity>
              );
            }
          }}
        />
      </KeyboardAvoidingView>

      {/* MINI PLAYER (Unchanged) */}
      {currentSurah && (
        <View style={styles.miniPlayerContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => skipSurah('next')} style={styles.skipBtn}>
              <Ionicons name="play-skip-back" size={24} color="#fee08c" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.miniPlayButton}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#000" style={!isPlaying ? { marginLeft: 4 } : {}} />
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
  brandingContainer: { alignItems: 'center', marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 25, },
  brandingTitle: { fontSize: 25, fontWeight: 'bold', color: '#847347', fontFamily: 'Cinzel' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#fee08c' },
  searchInput: { flex: 1, fontSize: 16, textAlign: 'left', color: '#333', marginRight: 10, fontFamily: 'Jura' },
  miniCard: { flex: 1, padding: 15, borderRadius: 12, height: 120, elevation: 4, justifyContent: 'center' },
  cardLabel: { color: '#ffffff', fontSize: 14, fontFamily: 'Jura' },
  cardMainText: { color: '#fee08c', fontSize: 16, marginTop: 10, fontFamily: 'Cinzel' },
  cardSubText: { color: '#CCC', fontSize: 15, marginTop: 5, fontFamily: 'Jura' },
  surahCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  numberCircle: { width: 43, height: 43, borderRadius: 19, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  numberText: { color: '#333', fontSize: 19, fontFamily: 'AlmendraSC', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, lineHeight: 19 },
  surahTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', fontFamily: 'Cinzel' },
  surahSubtitle: { fontSize: 12, color: '#333', fontFamily: 'BrunoAceSC' },
  versesText: { fontSize: 10, color: '#333', marginTop: 2, fontFamily: 'Jura' },
  arabicName: { fontSize: 26, fontFamily: 'AlMushaf' },

  // 🔥 NEW STYLES: Tab Buttons
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEA', // Light gray background
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#252525', // Black to match your cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Jura',
    fontWeight: 'bold',
    color: '#666',
  },
  tabTextActive: {
    color: '#fee08c', // Gold text
  },

  // MINI PLAYER
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: '#333',
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
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  skipBtn: { padding: 5 },
  miniPlayButton: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#fee08c', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  textColumn: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', marginRight: 10 },
  miniPlayerLabel: { color: '#ffffff', fontSize: 12, letterSpacing: 2, marginBottom: 2, textTransform: 'uppercase', fontFamily: 'Jura' },
  miniPlayerTitle: { color: '#fee08c', fontFamily: 'AlMushaf', fontSize: 26, textAlign: 'right' },
  miniPlayerSub: { color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'right', fontFamily: 'Cinzel' },
});