import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Verify this path matches your folder structure
import { useAudio } from '../app/context/AudioContext';

export default function MiniPlayer() {
  // 👇 Get playSurah instead of skipAyah
  const { currentSurah, isPlaying, togglePlay, currentAyahId, playSurah } = useAudio();
  const router = useRouter();

  if (!currentSurah) return null;

  const verseNumber = currentAyahId || 1;

  // 👇 RTL LOGIC: Next Surah = ID + 1 -> AutoPlay = TRUE
  const handleNextSurah = (e: any) => {
    e.stopPropagation();
    if (currentSurah && currentSurah.id < 114) {
      playSurah(currentSurah.id + 1, 1, true); // 👈 Added 'true'
    }
  };

  // 👇 RTL LOGIC: Prev Surah = ID - 1 -> AutoPlay = TRUE
  const handlePrevSurah = (e: any) => {
    e.stopPropagation();
    if (currentSurah && currentSurah.id > 1) {
      playSurah(currentSurah.id - 1, 1, true); // 👈 Added 'true'
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={() => router.push({ pathname: '/player', params: { surahId: currentSurah.id } })}
    >
      {/* TEXT INFO */}
      <View style={styles.textContainer}>
        <Text style={styles.surahName} numberOfLines={1}>
          {currentSurah.nameEn}
        </Text>
        <Text style={styles.ayahLabel}>
          Ayah {verseNumber}
        </Text>
      </View>

      {/* CONTROLS */}
      <View style={styles.controls}>

        {/* LEFT BUTTON -> Next Surah (RTL) */}
        <TouchableOpacity onPress={handleNextSurah} style={styles.btn}>
          <Ionicons name="play-skip-back" size={22} color="#BFA868" />
        </TouchableOpacity>

        {/* PLAY / PAUSE */}
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); togglePlay(); }} style={styles.btn}>
          <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={42} color="#BFA868" />
        </TouchableOpacity>

        {/* RIGHT BUTTON -> Prev Surah (RTL) */}
        <TouchableOpacity onPress={handlePrevSurah} style={styles.btn}>
          <Ionicons name="play-skip-forward" size={22} color="#BFA868" />
        </TouchableOpacity>

      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
    elevation: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10
  },
  surahName: {
    color: '#BFA868',
    fontFamily: 'AlmendraSC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2
  },
  ayahLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  btn: {
    padding: 2
  }
});