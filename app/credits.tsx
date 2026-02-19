import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CreditsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About App</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App Logo Area */}
        <View style={styles.logoContainer}>
          <Ionicons name="book" size={60} color="#BFA868" />
        </View>

        <Text style={styles.appName}>The Noble Quran</Text>
        <Text style={styles.version}>Version 1.0.0</Text>

        <View style={styles.divider} />

        {/* Credits Section */}

        <View style={styles.section}>
          <Text style={styles.label}>Dedicated to</Text>
          <Text style={styles.name}>Ummah of Prophet Muhammad (PBUH)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Developed by</Text>
          <Text style={styles.name}>Zero</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Designed & Managed by</Text>
          <Text style={styles.name}>Mohammed Mujeeb Uddin</Text> 
          {/* 👆 Change this to the real name! */}
        </View>

        

        <View style={styles.divider} />

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Contact & Support</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:mujeeb.zero@icloud.com')}>
            <Text style={styles.link}>mujeeb.zero@icloud.com</Text>
          </TouchableOpacity>
        </View>

        {/* 👇 NEW ATTRIBUTION SECTION 👇 */}
        <View style={styles.section}>
          <Text style={styles.label}>Data & Recitations</Text>
          <Text style={styles.description}>
            Quran text, translations, and audio data provided by:
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://alquran.cloud/')}>
            <Text style={styles.link}>Islamic Network (Al Quran Cloud)</Text>
          </TouchableOpacity>
           <Text style={styles.description}>
            Recitations sourced from:
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://everyayah.com/')}>
            <Text style={styles.link}>EveryAyah.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        {/* 👆 END OF NEW SECTION 👆 */}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', fontFamily: 'Cinzel-Bold' },
  content: { alignItems: 'center', paddingHorizontal: 30 },
  logoContainer: { marginBottom: 15, marginTop: 20 },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#000', fontFamily: 'Cinzel-Bold', marginBottom: 5 },
  version: { fontSize: 14, color: '#888', marginBottom: 30 },
  divider: { width: '40%', height: 1, backgroundColor: '#E0E0E0', marginVertical: 20 },
  section: { marginBottom: 25, alignItems: 'center' },
  label: { fontSize: 12, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center', flexWrap: 'wrap' },
  link: { fontSize: 16, color: '#BFA868', textDecorationLine: 'underline' },
});