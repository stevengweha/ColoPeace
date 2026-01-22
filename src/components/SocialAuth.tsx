import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth, useClerk } from "@clerk/clerk-expo";
import api from '../services/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectSocket } from '../services/socket';
import * as Linking from 'expo-linking'; // Indispensable pour la redirection PWA

interface SocialAuthProps {
  onLoginSuccess: (user: any) => void;
}

export default function SocialAuth({ onLoginSuccess }: SocialAuthProps) {
  const [loading, setLoading] = useState(false);
  
  // Hook pour Google OAuth
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  
  // Hook pour gérer la session Clerk globale
  const { session, signOut } = useClerk();

  const handleGoogleAuth = async () => {
    if (loading) return;
    setLoading(true);

    try {
      let currentSessionId = session?.id;

      // 1️⃣ SI AUCUNE SESSION ACTIVE
      if (!currentSessionId) {
        console.log("🔄 Lancement du flux Google (Mode Redirect pour PWA)...");
        
        // On définit l'URL de retour (l'URL actuelle de ta PWA)
        const redirectUrl = Linking.createURL('/');

        const { createdSessionId, setActive } = await startOAuthFlow({
          redirectUrl: redirectUrl, // Force la redirection plutôt que la pop-up
        });
        
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          currentSessionId = createdSessionId;
        }
      } else {
        console.log("✅ Session Clerk déjà active :", currentSessionId);
      }

      // 2️⃣ SYNC AVEC LE BACKEND (Bridge Clerk -> MongoDB)
      if (currentSessionId) {
        // @ts-ignore - Récupération du jeton JWT de Clerk
        const clerkToken = await window.Clerk.session.getToken();

        const res = await api.post('/auth/clerk-login', { clerkToken });
        const user = res.data.user || res.data;

        // Sauvegarde locale
        await AsyncStorage.setItem("@colopeace_user", JSON.stringify(user));
        
        // Initialisation Sockets
        try {
          connectSocket(user._id || user.id);
        } catch (e) {
          console.log("Socket connection error:", e);
        }

        // Succès : on bascule sur l'AppStack
        onLoginSuccess(user);
      }
    } catch (err: any) {
      // Gestion de l'erreur "Already signed in"
      if (err.errors?.[0]?.code === "already_signed_in" || err.message?.includes("already signed in")) {
        console.log("⚠️ Déjà connecté chez Clerk, synchronisation backend...");
        try {
          // @ts-ignore
          const clerkToken = await window.Clerk.session.getToken();
          const res = await api.post('/auth/clerk-login', { clerkToken });
          onLoginSuccess(res.data.user || res.data);
        } catch (retryErr) {
          await signOut();
          Alert.alert("Session expirée", "Veuillez réessayer.");
        }
      } else {
        console.error("Détail Erreur OAuth:", err);
        Alert.alert("Erreur", "La connexion Google a échoué.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.separatorContainer}>
        <View style={styles.line} />
        <Text style={styles.separatorText}>OU</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity 
        style={[styles.googleButton, loading && styles.disabled]} 
        onPress={handleGoogleAuth} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#205C3B" />
        ) : (
          <View style={styles.row}>
            <Ionicons name="logo-google" size={22} color="#EA4335" style={styles.icon} />
            <Text style={styles.googleButtonText}>Continuer avec Google</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: 5 },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  separatorText: {
    marginHorizontal: 15,
    color: '#A0A0A0',
    fontSize: 13,
    fontWeight: '600'
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCDCDC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 12 },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5'
  }
});