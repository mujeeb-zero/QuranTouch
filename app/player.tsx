import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFonts } from 'expo-font';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image // 🆕 Added Image import
  ,













  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { fetchSurah } from '../api/quranApi';
import { useAudio } from './context/AudioContext';

const LIGHT_THEME = { background: '#FDFBF7', text: '#2D2D2D', primary: '#BFA868', highlight: '#FFF9E6', brackets: '#BFA868', controlBg: '#FFF', headerBorder: '#EEE', panelBg: '#FFF', panelBorder: '#BFA868', modalBg: '#FFF' };
const DARK_THEME = { background: '#1A1A1A', text: '#E0E0E0', primary: '#D4AF37', highlight: '#2A2A2A', brackets: '#D4AF37', controlBg: '#252525', headerBorder: '#333', panelBg: '#252525', panelBorder: '#D4AF37', modalBg: '#252525' };

const AyahItem = React.memo(({
  item,
  index,
  isActive,
  isFav,
  isLastRead,
  fontSize,
  theme,
  showTranslation,
  onPress,
  onLongPress,
  duration,
  position,
  seekTo
}: any) => {

  return (
    <View style={[styles.ayahContainer, { backgroundColor: isActive ? theme.highlight : 'transparent' }]}>
      <Pressable onPress={() => onPress(index)} onLongPress={() => onLongPress(item)} delayLongPress={300}>
        <Text style={[styles.arabicText, { fontFamily: 'AlMushaf', fontSize: fontSize, color: theme.text, lineHeight: fontSize * 2.2 }]}>
          {item.text}
          <Text style={{ fontFamily: 'AlmendraSC', fontSize: fontSize * 0.7, color: theme.brackets }}> ﴿{item.numberInSurah}﴾ </Text>
          {isLastRead && <Ionicons name="book" size={fontSize * 0.6} color={theme.primary} style={{ marginLeft: 5 }} />}
          {isFav && <Ionicons name="star" size={fontSize * 0.6} color={theme.primary} style={{ marginLeft: 5 }} />}
        </Text>
        {showTranslation && item.translation && (
          <Text style={[styles.translationText, { color: theme.text, fontSize: fontSize * 0.55, opacity: 0.7 }]}>{item.translation}</Text>
        )}
      </Pressable>
      {isActive && (
        <View key={item.id} style={[styles.timelineWrapper, { transform: [{ scaleX: -1 }] }]}>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position || 0}
            onSlidingComplete={seekTo}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor={theme.primary}
          />
        </View>
      )}
    </View>
  );
}, (prev, next) =>
  prev.isActive === next.isActive &&
  prev.isFav === next.isFav &&
  prev.isLastRead === next.isLastRead &&
  prev.position === next.position &&
  prev.fontSize === next.fontSize &&
  prev.showTranslation === next.showTranslation &&
  prev.theme === next.theme
);

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isPlaying, position, currentAyahId, togglePlay, currentSurah, skipAyah, duration, seekTo, themeMode, setThemeMode, playAyah, favorites, toggleFavorite, saveLastRead, activeReciter, changeReciter, RECITERS } = useAudio();

  const surahId = parseInt(Array.isArray(params.surahId) ? params.surahId[0] : params.surahId) || 1;
  const [fontsLoaded] = useFonts({ 'AlMushaf': require('../assets/fonts/AlMushaf.ttf'), 'AlmendraSC': require('../assets/fonts/AlmendraSC.ttf') });

  const [viewingSurah, setViewingSurah] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fontSize, setFontSize] = useState(28);
  const [showSettings, setShowSettings] = useState(false);
  const [showReciterList, setShowReciterList] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [longPressedAyah, setLongPressedAyah] = useState<any>(null);
  const [currentLastRead, setCurrentLastRead] = useState<any>(null);

  const systemScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const isDarkMode = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const COLORS = isDarkMode ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsFetching(true);
      const data = await fetchSurah(surahId);
      const saved = await AsyncStorage.getItem('last_read');
      if (isMounted && data) {
        setViewingSurah(data);
        if (saved) setCurrentLastRead(JSON.parse(saved));
        setIsFetching(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [surahId]);

  useEffect(() => {
    if (!isFetching && viewingSurah && viewingSurah.id === surahId) {
      const rawAyah = params.initialAyah || params.verseNum;
      const targetAyah = rawAyah ? parseInt(Array.isArray(rawAyah) ? rawAyah[0] : rawAyah) : null;

      if (targetAyah) {
        const idx = viewingSurah.verses.findIndex((v: any) => v.numberInSurah === targetAyah);
        if (idx !== -1) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
          }, 800);
        }
      } else if (params.autoplay === 'true') {
        playAyah(viewingSurah, 0);
      }
    }
  }, [isFetching, viewingSurah, params.initialAyah, params.verseNum]);

  useEffect(() => {
    if (viewingSurah && currentAyahId && currentSurah?.id === viewingSurah.id) {
      const index = viewingSurah.verses.findIndex((v: any) => v.id === currentAyahId);
      if (index !== -1) flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }
  }, [currentAyahId]);

  const handleOptionSelect = async (action: 'bookmark' | 'favorite') => {
    if (!longPressedAyah || !viewingSurah) return;
    if (action === 'bookmark') {
      await saveLastRead(viewingSurah.id, longPressedAyah.id, longPressedAyah.numberInSurah, viewingSurah.nameEn, viewingSurah.nameAr);
      setCurrentLastRead({ surahId: viewingSurah.id, verseId: longPressedAyah.id });
    } else {
      toggleFavorite(viewingSurah, longPressedAyah);
    }
    setLongPressedAyah(null);
  };

  const goToSurah = (dir: 'next' | 'prev') => {
    const nid = dir === 'next' ? surahId + 1 : surahId - 1;
    if (nid >= 1 && nid <= 114) router.replace({ pathname: '/player', params: { surahId: nid, autoplay: 'true' } });
  };

  if (!fontsLoaded || isFetching || !viewingSurah) return <View style={styles.center}><ActivityIndicator size="large" color="#BFA868" /></View>;

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* 🆕 UPDATED HEADER */}
      <View style={[styles.header, { borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={40} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Reciter Image Trigger */}
        <TouchableOpacity
          onPress={() => setShowReciterList(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Text style={[styles.surahName, { color: COLORS.primary }]}>{viewingSurah.nameAr}</Text>

          {/* 🆕 CIRCULAR IMAGE */}
          <Image
            source={activeReciter.image}  // 👈 CHANGED: Removed { uri: ... }
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 1.5,
              borderColor: COLORS.primary
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.aaButton}>
          <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Aa</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={viewingSurah.verses}
        keyExtractor={(item) => item.id.toString()}
        removeClippedSubviews={false}
        windowSize={10}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => { flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 }); }, 100);
        }}
        renderItem={({ item, index }) => (
          <AyahItem
            item={item}
            index={index}
            isActive={currentSurah?.id === viewingSurah.id && currentAyahId === item.id}
            isFav={favorites?.some((f: any) => f.surahId === viewingSurah.id && f.verseId === item.id)}
            isLastRead={currentLastRead?.surahId === viewingSurah.id && currentLastRead?.verseId === item.id}
            fontSize={fontSize} theme={COLORS} showTranslation={showTranslation}
            onPress={(idx: number) => playAyah(viewingSurah, idx)}
            onLongPress={setLongPressedAyah} duration={duration} position={position} seekTo={seekTo}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}
      />

      <View style={[styles.controlBar, { backgroundColor: COLORS.controlBg }]}>
        <TouchableOpacity onPress={() => goToSurah('next')} disabled={surahId >= 114}><Ionicons name="play-skip-back-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => skipAyah('next')}><Ionicons name="play-back" size={30} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity style={[styles.playBtn, { backgroundColor: COLORS.primary }]} onPress={togglePlay}><Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#FFF" /></TouchableOpacity>
        <TouchableOpacity onPress={() => skipAyah('prev')}><Ionicons name="play-forward" size={30} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => goToSurah('prev')} disabled={surahId <= 1}><Ionicons name="play-skip-forward-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSettings(false)}>
          <View style={[styles.settingsPanel, { backgroundColor: COLORS.panelBg, borderColor: COLORS.panelBorder }]}>
            <Slider style={{ width: '100%', height: 40 }} minimumValue={20} maximumValue={48} step={2} value={fontSize} onValueChange={setFontSize} minimumTrackTintColor={COLORS.primary} thumbTintColor={COLORS.primary} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 }}>
              {['system', 'light', 'dark'].map((m) => (
                <TouchableOpacity key={m} onPress={() => setThemeMode(m as any)} style={[styles.themeBtn, { backgroundColor: themeMode === m ? COLORS.primary : 'transparent', borderColor: COLORS.primary }]}><Text style={{ color: themeMode === m ? '#FFF' : COLORS.text, fontSize: 11 }}>{m.toUpperCase()}</Text></TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowTranslation(!showTranslation)} style={[styles.transBtn, { backgroundColor: showTranslation ? COLORS.primary : 'transparent', borderColor: COLORS.primary }]}><Text style={{ color: showTranslation ? '#FFF' : COLORS.text }}>{showTranslation ? "Hide Translation" : "Show Translation"}</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* 🆕 UPDATED RECITER MODAL WITH IMAGES */}
      <Modal visible={showReciterList} transparent animationType="fade" onRequestClose={() => setShowReciterList(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowReciterList(false)}>
          <View style={[styles.settingsPanel, { backgroundColor: COLORS.panelBg, borderColor: COLORS.panelBorder, maxHeight: '60%' }]}>
            <Text style={{ textAlign: 'center', fontFamily: 'AlmendraSC', fontSize: 30, color: '#847347', marginBottom: 15 }}>
              Reciters
            </Text>
            <FlatList
              data={RECITERS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.headerBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    changeReciter(item);
                    setShowReciterList(false);
                  }}
                >
                  {/* List Image */}
                  <Image
                    source={item.image}  // 👈 CHANGED: Removed { uri: ... }
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      marginRight: 15,
                      borderWidth: 1,
                      borderColor: '#DDD'
                    }}
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 18,
                      color: activeReciter.id === item.id ? COLORS.primary : COLORS.text,
                      fontWeight: activeReciter.id === item.id ? 'bold' : 'normal'
                    }}>
                      {item.name}
                    </Text>
                  </View>

                  {activeReciter.id === item.id && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Action Modal */}
      <Modal visible={!!longPressedAyah} transparent animationType="fade" onRequestClose={() => setLongPressedAyah(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLongPressedAyah(null)}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.modalBg, borderColor: COLORS.panelBorder }]}>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleOptionSelect('bookmark')}><Ionicons name="book-outline" size={20} color={COLORS.primary} /><Text style={[styles.modalText, { color: COLORS.text }]}>Set as Last Read</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleOptionSelect('favorite')}><Ionicons name="star-outline" size={20} color={COLORS.primary} /><Text style={[styles.modalText, { color: COLORS.text }]}>Add to Favorites</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  aaButton: { padding: 6, borderWidth: 1, borderRadius: 8, borderColor: '#EEE', width: 40, alignItems: 'center' },
  surahName: { fontFamily: 'AlMushaf', fontSize: 24 },
  ayahContainer: { paddingVertical: 20, marginVertical: 2 },
  arabicText: { textAlign: 'center' },
  translationText: { textAlign: 'center', marginTop: 10, paddingHorizontal: 20, lineHeight: 22 },
  timelineWrapper: { height: 40, width: '90%', alignSelf: 'center', marginTop: 10 },
  controlBar: { position: 'absolute', bottom: 30, left: 15, right: 15, height: 80, borderRadius: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  playBtn: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: '85%', padding: 25, borderRadius: 15, borderWidth: 1 },
  themeBtn: { padding: 8, borderRadius: 6, borderWidth: 1 },
  transBtn: { padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalContent: { width: '60%', borderRadius: 12, padding: 10, borderWidth: 1 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  modalText: { marginLeft: 15, fontSize: 16 }
});