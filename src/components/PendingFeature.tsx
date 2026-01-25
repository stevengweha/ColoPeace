import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface WIPProps {
  featureName?: string;
}

export default function WorkInProgress({ featureName }: WIPProps) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Badge "En cours" */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Bientôt là !</Text>
        </View>

        <View style={styles.iconBg}>
          <Ionicons name="color-wand" size={45} color="#205C3B" />
        </View>
        
        <Text style={styles.title}>
          {featureName ? featureName : "Analyse des dépenses"}
        </Text>
        
        <Text style={styles.subtitle}>
          On peaufine les derniers détails pour vous offrir une expérience de colocation aux petits oignons. 🧅
        </Text>

        {/* Barre de progression stylisée */}
        <View style={styles.progressSection}>
          <View style={styles.loadingBarContainer}>
            <View style={styles.loadingBarActive} />
          </View>
          <Text style={styles.percentText}>Lancement imminent à 65%</Text>
        </View>

        {/* BOUTON RETOUR ATTRAYANT */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={styles.backButtonText}>Retourner à l'accueil</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>L'équipe ColoPeace travaille pour vous</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9F9F9', 
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    shadowColor: "#205C3B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 15,
  },
  badgeText: {
    color: '#205C3B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F0F7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 35,
  },
  loadingBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  loadingBarActive: {
    width: '85%',
    height: '100%',
    backgroundColor: '#205C3B',
  },
  percentText: {
    marginTop: 8,
    fontSize: 12,
    color: '#205C3B',
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: '#205C3B',
    width: '100%',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#205C3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    marginTop: 20,
    fontSize: 10,
    color: '#CCC',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});