import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Verify this path matches your folder structure
import { useAudio } from '../app/context/AudioContext';

export default function MiniPlayer() {
  const { currentSurah, isPlaying, togglePlay, currentAyahId, playSurah } = useAudio();
  const router = useRouter();

  if (!currentSurah) return null;

  const verseNumber = currentAyahId || 1;

  const handleNextSurah = (e: any) => {
    e.stopPropagation();
    if (currentSurah && currentSurah.id < 114) {
      playSurah(currentSurah.id + 1, 1, true);
    }
  };

  const handlePrevSurah = (e: any) => {
    e.stopPropagation();
    if (currentSurah && currentSurah.id > 1) {
      playSurah(currentSurah.id - 1, 1, true);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={() => router.push({ pathname: '/player', params: { surahId: currentSurah.id } })}
    >
      {/* 1. CONTROLS (Moved to Left) */}
      <View style={styles.controls}>
        {/* Prev (Visual Left / Logical Next in RTL context) */}
        <TouchableOpacity onPress={handleNextSurah} style={styles.controlBtn}>
          <Ionicons name="play-skip-back" size={20} color="#BFA868" />
        </TouchableOpacity>

        {/* Play/Pause with Circle Border */}
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); togglePlay(); }} style={styles.playBtnWrapper}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#000" style={{ marginLeft: isPlaying ? 0 : 2 }} />
        </TouchableOpacity>

        {/* Next (Visual Right / Logical Prev in RTL context) */}
        <TouchableOpacity onPress={handlePrevSurah} style={styles.controlBtn}>
          <Ionicons name="play-skip-forward" size={20} color="#BFA868" />
        </TouchableOpacity>
      </View>

      {/* 2. TEXT INFO (Moved to Right) */}
      <View style={styles.textContainer}>
        <Text style={styles.labelSmall}>CONTINUE READING</Text>
        <Text style={styles.surahName} numberOfLines={1}>
          {currentSurah.nameAr}
        </Text>
        <Text style={styles.englishName} numberOfLines={1}>
          {currentSurah.nameEn}
        </Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 25, // Moved up slightly
    left: 20,
    right: 20,
    backgroundColor: '#1A1A1A', // Darker background like screenshot
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  // --- Text Styles ---
  textContainer: {
    flex: 1,
    alignItems: 'flex-end', // 👈 Pushes text to the right
    justifyContent: 'center',
    paddingLeft: 15, // Space between controls and text
  },
  labelSmall: {
    color: '#666',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  surahName: {
    color: '#BFA868',
    fontFamily: 'AlMushaf', // Using your Arabic font
    fontSize: 18,
    textAlign: 'right',
    marginBottom: 2
  },
  englishName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  // --- Control Styles ---
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15 // Nicer spacing between buttons
  },
  controlBtn: {
    padding: 5,
  },
  playBtnWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#BFA868', // The Gold Circle background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF', // White border ring
  }
});