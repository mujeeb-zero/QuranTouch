import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAudio } from './context/AudioContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, toggleFavorite, playSurah } = useAudio();

  // Helper to remove favorite properly
  const handleRemove = (item: any) => {
    // We reconstruct the "surah" and "verse" objects to match what toggleFavorite expects
    toggleFavorite({ id: item.surahId }, { id: item.verseId });
  };

  const handlePress = (item: any) => {
    router.push({
      pathname: '/player',
      params: { 
        surahId: item.surahId, 
        initialAyah: item.verseNum, 
        // ❌ Removed autoplay: 'true'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <Ionicons name="chevron-back" size={28} color="#BFA868" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY FAVORITES</Text>
        <View style={{ width: 28 }} /> 
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>No favorites yet.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => `${item.surahId}-${item.verseId}`}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
               <View style={styles.cardHeader}>
                  <Text style={styles.surahName}>{item.surahName}</Text>
                  <Text style={styles.ayahNum}>Ayah {item.verseNum}</Text>
               </View>

               {/* 🔥 DISPLAYING ARABIC TEXT */}
               <Text style={styles.arabicText} numberOfLines={3}>
                  {item.text || "Loading text..."}
               </Text>

               <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                  <Ionicons name="trash-outline" size={16} color="#333" />
                  <Text style={styles.removeText}>Remove</Text>
               </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontFamily: 'Jura', color: '#333' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 10, color: '#AAA', fontFamily: "Jura" },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  surahName: { fontSize: 16, fontWeight: 'bold', color: '#BFA868', fontFamily: 'Cinzel' },
  ayahNum: { fontSize: 14, color: '#333', fontFamily: 'Jura' },
  arabicText: { fontSize: 24, fontFamily: 'AlMushaf', textAlign: 'right', color: '#333', marginBottom: 15 },
  removeBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', padding: 5 },
  removeText: { fontSize: 12, color: '#333', marginLeft: 5, fontFamily: 'Jura' },
});