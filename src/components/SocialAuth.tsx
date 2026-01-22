import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOAuth, useClerk } from "@clerk/clerk-expo";
import api from '../services/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectSocket } from '../services/socket';

interface SocialAuthProps {
  onLoginSuccess: (user: any) => void;
}

export default function SocialAuth({ onLoginSuccess }: SocialAuthProps) {
  const [loading, setLoading] = useState(false);
  
  // Hook Clerk pour l'authentification Google
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  
  // Hook Clerk pour gérer la session et la déconnexion
  const { session, signOut } = useClerk();

  // Ton URL de production Vercel
  const PRODUCTION_URL = "https://colo-peace-w7sy.vercel.app";

  const handleGoogleAuth = async () => {
    if (loading) return;
    setLoading(true);

    try {
      let currentSessionId = session?.id;

      // 1️⃣ ÉTAPE CLERK : Obtenir une session
      if (!currentSessionId) {
        console.log("🔄 Lancement de la redirection Google...");
        
        const { createdSessionId, setActive } = await startOAuthFlow({
          // Force la redirection vers ton domaine Vercel (indispensable pour PWA/Mobile)
          redirectUrl: Platform.OS === 'web' ? PRODUCTION_URL : undefined,
        });
        
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          currentSessionId = createdSessionId;
        }
      }

      // 2️⃣ ÉTAPE BACKEND : Bridge avec ton API Render
      if (currentSessionId) {
        // Récupération du jeton sécurisé (JWT) généré par Clerk
        // @ts-ignore
        const clerkToken = await window.Clerk.session.getToken();

        // Envoi au backend sur Render pour vérification/création d'utilisateur
        const res = await api.post('/auth/clerk-login', { clerkToken });
        const user = res.data.user || res.data;

        // Sauvegarde persistante de l'utilisateur
        await AsyncStorage.setItem("@colopeace_user", JSON.stringify(user));
        
        // Connexion au socket temps réel
        try {
          connectSocket(user._id || user.id);
        } catch (e) {
          console.log("Socket connection error:", e);
        }

        // Succès : On informe l'application pour changer d'écran
        onLoginSuccess(user);
      }
    } catch (err: any) {
      // Gestion spécifique du cas "Déjà connecté"
      if (err.errors?.[0]?.code === "already_signed_in" || err.message?.includes("already signed in")) {
        console.log("⚠️ Session déjà active, synchronisation directe...");
        try {
          // @ts-ignore
          const clerkToken = await window.Clerk.session.getToken();
          const res = await api.post('/auth/clerk-login', { clerkToken });
          onLoginSuccess(res.data.user || res.data);
        } catch (retryErr) {
          await signOut(); // Nettoyage en cas d'échec
          Alert.alert("Erreur", "Session expirée. Veuillez réessayer.");
        }
      } else {
        console.error("Détail Erreur OAuth:", err);
        Alert.alert("Erreur", "La connexion Google a échoué sur ce navigateur.");
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