import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFonts } from 'expo-font';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { fetchSurah } from '../api/quranApi';
import { useAudio } from './context/AudioContext';

const LIGHT_THEME = {
  background: '#FDFBF7', text: '#2D2D2D', primary: '#BFA868',
  highlight: '#FFF9E6', brackets: '#BFA868', controlBg: '#FFF',
  headerBorder: '#EEE', panelBg: '#FFF', panelBorder: '#BFA868',
  modalBg: '#FFF'
};
const DARK_THEME = {
  background: '#1A1A1A', text: '#E0E0E0', primary: '#D4AF37',
  highlight: '#2A2A2A', brackets: '#D4AF37', controlBg: '#252525',
  headerBorder: '#333', panelBg: '#252525', panelBorder: '#D4AF37',
  modalBg: '#252525'
};

const AyahText = React.memo(({ item, fontSize, theme, isLastRead, isFav, onPress, onLongPress }: any) => {
  return (
    <Pressable
      onPress={onPress} onLongPress={onLongPress} delayLongPress={250}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.arabicText, { fontFamily: 'AlMushaf', fontSize: fontSize, color: theme.text, lineHeight: fontSize * 2.2 }]}>
        {item.text}
        <Text style={{ fontFamily: 'AlmendraSC', fontSize: fontSize * 0.7, color: theme.brackets }}> ﴿{item.numberInSurah}﴾ </Text>
        {isLastRead && <Ionicons name="book" size={fontSize * 0.6} color={theme.primary} style={{ marginLeft: 5 }} />}
        {isFav && <Ionicons name="star" size={fontSize * 0.6} color="#FFD700" style={{ marginLeft: 5 }} />}
      </Text>
    </Pressable>
  );
}, (prev, next) => prev.isLastRead === next.isLastRead && prev.isFav === next.isFav && prev.fontSize === next.fontSize && prev.theme === next.theme);

const AyahTimeline = React.memo(({ duration, position, seekTo, theme }: any) => {
  return (
    <View style={styles.timelineWrapper}>
      <Slider
        style={{ width: '100%', height: 40 }} minimumValue={0} maximumValue={duration || 1} value={duration - position}
        onSlidingComplete={(val) => seekTo(duration - val)}
        minimumTrackTintColor={'#E0E0E0'} maximumTrackTintColor={theme.primary} thumbTintColor={theme.primary}
      />
    </View>
  );
});

const AyahItem = React.memo(({ item, index, isActive, isFav, isLastRead, fontSize, theme, onPress, onLongPress, duration, position, seekTo }: any) => {
  return (
    <View style={[styles.ayahContainer, { backgroundColor: isActive ? theme.highlight : 'transparent' }]}>
      <AyahText
        item={item} fontSize={fontSize} theme={theme} isLastRead={isLastRead} isFav={isFav}
        onPress={() => onPress(index)} onLongPress={() => onLongPress(item)}
      />
      {isActive && <AyahTimeline duration={duration} position={position} seekTo={seekTo} theme={theme} />}
    </View>
  );
});

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    isPlaying, position, currentAyahId, togglePlay, currentSurah,
    isLoading, skipAyah, duration, seekTo, themeMode, setThemeMode,
    playAyah, favorites, toggleFavorite, saveLastRead
  } = useAudio();

  const surahId = parseInt(Array.isArray(params.surahId) ? params.surahId[0] : params.surahId) || 1;
  const initialAyah = params.initialAyah ? parseInt(Array.isArray(params.initialAyah) ? params.initialAyah[0] : params.initialAyah) : 1;

  const [fontsLoaded] = useFonts({ 'AlMushaf': require('../assets/fonts/AlMushaf.ttf'), 'AlmendraSC': require('../assets/fonts/AlmendraSC.ttf') });
  const [viewingSurah, setViewingSurah] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [currentLastRead, setCurrentLastRead] = useState<any>(null);
  const [fontSize, setFontSize] = useState(28);
  const [showSettings, setShowSettings] = useState(false);
  const [longPressedAyah, setLongPressedAyah] = useState<any>(null);
  const systemScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const isDarkMode = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const COLORS = isDarkMode ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsFetching(true);
      const data = (currentSurah?.id === surahId) ? currentSurah : await fetchSurah(surahId);
      if (isMounted) {
        setViewingSurah(data);
        const savedBookmark = await AsyncStorage.getItem('last_read');
        if (savedBookmark) setCurrentLastRead(JSON.parse(savedBookmark));
        setIsFetching(false);
        if (params.autoplay === 'true' && data) {
          setTimeout(() => { playAyah(data, 0, true); }, 300);
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [surahId]);

  useEffect(() => {
    if (viewingSurah && initialAyah && !isFetching) {
      const timer = setTimeout(() => {
        const index = viewingSurah.verses.findIndex((v: any) => v.numberInSurah === initialAyah || v.id === initialAyah);
        if (index !== -1 && flatListRef.current) flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [viewingSurah, initialAyah, isFetching]);

  const handleOptionSelect = async (action: 'bookmark' | 'favorite') => {
    if (!longPressedAyah || !viewingSurah) return;
    if (action === 'bookmark') {
      // 🔥 FIX: Saving numberInSurah (e.g., 1) instead of global ID (e.g., 8)
      await saveLastRead(viewingSurah.id, longPressedAyah.id, longPressedAyah.numberInSurah, viewingSurah.nameEn, viewingSurah.nameAr);
      setCurrentLastRead({ surahId: viewingSurah.id, verseId: longPressedAyah.id });
    } else {
      toggleFavorite(viewingSurah, longPressedAyah);
    }
    setLongPressedAyah(null);
  };

  const goToSurah = (direction: 'next' | 'prev') => {
    const newId = direction === 'next' ? surahId + 1 : surahId - 1;
    if (newId >= 1 && newId <= 114) {
      if (isPlaying) togglePlay();
      setIsFetching(true);
      router.replace({ pathname: '/player', params: { surahId: newId, autoplay: 'true' } });
    }
  };

  if (!fontsLoaded || isFetching) return <View style={styles.center}><ActivityIndicator size="large" color="#BFA868" /></View>;
  const isAyahFav = longPressedAyah ? favorites?.some((f: any) => f.surahId === viewingSurah?.id && f.verseId === longPressedAyah.id) : false;

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.header, { borderBottomColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={COLORS.primary} /></TouchableOpacity>
        <Text style={[styles.surahName, { color: COLORS.primary }]}>{viewingSurah?.nameAr}</Text>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={[styles.aaButton, { borderColor: COLORS.headerBorder }]}><Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Aa</Text></TouchableOpacity>
      </View>

      <Modal visible={showSettings} transparent={true} animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.settingsBackdrop} onPress={() => setShowSettings(false)}>
          <Pressable style={[styles.settingsPanel, { backgroundColor: COLORS.panelBg, borderColor: COLORS.panelBorder }]}>
            <Slider style={{ width: '100%', height: 40 }} minimumValue={22} maximumValue={48} step={2} value={fontSize} onValueChange={setFontSize} minimumTrackTintColor={COLORS.primary} thumbTintColor={COLORS.primary} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 }}>
              {['system', 'light', 'dark'].map((m) => (
                <TouchableOpacity key={m} onPress={() => setThemeMode(m as any)} style={[styles.themeBtn, { backgroundColor: themeMode === m ? COLORS.primary : 'transparent', borderColor: COLORS.primary }]}><Text style={{ color: themeMode === m ? '#FFF' : COLORS.text, fontSize: 12, fontWeight: 'bold' }}>{m.toUpperCase()}</Text></TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        ref={flatListRef} data={viewingSurah.verses} keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => <AyahItem item={item} index={index} isActive={currentSurah?.id === viewingSurah?.id && currentAyahId === item.id} isFav={favorites?.some((f: any) => f.surahId === viewingSurah?.id && f.verseId === item.id)} isLastRead={currentLastRead?.surahId === viewingSurah?.id && currentLastRead?.verseId === item.id} fontSize={fontSize} theme={COLORS} onPress={(idx: number) => viewingSurah && playAyah(viewingSurah, idx, true)} onLongPress={(ayah: any) => setLongPressedAyah(ayah)} duration={duration} position={position} seekTo={seekTo} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 150 }} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
      />

      <View style={[styles.controlBar, { backgroundColor: COLORS.controlBg, borderColor: COLORS.headerBorder }]}>
        <TouchableOpacity onPress={() => goToSurah('next')} disabled={surahId >= 114}><Ionicons name="play-skip-back-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => skipAyah('next')}><Ionicons name="play-back" size={30} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity style={[styles.playBtn, { backgroundColor: COLORS.primary }]} onPress={togglePlay}><Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#FFF" style={!isPlaying && { marginLeft: 4 }} /></TouchableOpacity>
        <TouchableOpacity onPress={() => skipAyah('prev')}><Ionicons name="play-forward" size={30} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity onPress={() => goToSurah('prev')} disabled={surahId <= 1}><Ionicons name="play-skip-forward-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
      </View>

      <Modal visible={!!longPressedAyah} transparent={true} animationType="fade" onRequestClose={() => setLongPressedAyah(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLongPressedAyah(null)}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.modalBg, borderColor: COLORS.panelBorder }]}>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleOptionSelect('bookmark')}>
              <Ionicons name="book-outline" size={24} color={COLORS.primary} />
              <Text style={[styles.modalOptionText, { color: COLORS.text }]}>Set as Last Read</Text>
            </TouchableOpacity>
            <View style={[styles.separator, { backgroundColor: COLORS.headerBorder }]} />
            <TouchableOpacity style={styles.modalOption} onPress={() => handleOptionSelect('favorite')}>
              <Ionicons name={isAyahFav ? "star" : "star-outline"} size={24} color="#FFD700" />
              <Text style={[styles.modalOptionText, { color: COLORS.text }]}>{isAyahFav ? "Remove Favorite" : "Add to Favorites"}</Text>
            </TouchableOpacity>
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
  aaButton: { padding: 6, borderWidth: 1, borderRadius: 8, width: 38, alignItems: 'center' },
  surahName: { fontFamily: 'AlMushaf', fontSize: 24 },
  settingsBackdrop: { flex: 1 },
  settingsPanel: { position: 'absolute', top: 70, right: 20, width: 280, borderRadius: 12, borderWidth: 1, padding: 20, elevation: 8, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10 },
  themeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  ayahContainer: { paddingVertical: 20, borderRadius: 15 },
  arabicText: { textAlign: 'center', writingDirection: 'rtl' },
  timelineWrapper: { height: 40, width: '95%', alignSelf: 'center', marginTop: 15 },
  controlBar: { position: 'absolute', bottom: 30, left: 15, right: 15, height: 80, borderRadius: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, elevation: 8, borderWidth: 1 },
  playBtn: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '75%', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, alignItems: 'center', elevation: 10 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, width: '100%', justifyContent: 'flex-start' },
  modalOptionText: { fontSize: 16, marginLeft: 15, fontWeight: '500' },
  separator: { height: 1, width: '100%', opacity: 0.5 }
});