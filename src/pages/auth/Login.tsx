import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, // Remplacement du Button natif
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, // Améliore l'expérience sur clavier
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Pour une touche d'icône
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import { useSafeRouter } from '../../hooks/useSafeRouter';

// ----------------------------
// COULEURS DE MARQUE (SIMULÉES)
// ----------------------------
const COLORS = {
  primary: '#205C3B',    // Vert foncé (Nettoyage / Eco)
  secondary: '#5cb85c',  // Vert clair
  background: '#f4f4f9', // Fond clair
  text: '#333333',
  placeholder: '#a0a0a0',
  shadow: 'rgba(0,0,0,0.1)',
};

// ----------------------------
// COMPOSANT PRINCIPAL
// ----------------------------
export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useSafeRouter();

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !password) return Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const user = res.data.user || res.data;
      onLogin(user);
      connectSocket(user._id || user.id);
      router.push('/pages/TasksWeek');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de se connecter. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.fullScreen}
    >
      <View style={styles.container}>
        
        <Ionicons name="home-outline" size={80} color={COLORS.primary} style={styles.logo} />
        <Text style={styles.title}>Bienvenue chez ColoPeace</Text>
        <Text style={styles.subtitle}>Connectez-vous pour voir vos tâches de la semaine.</Text>

        {/* CHAMPS D'ENTRÉE STYLISÉS */}
        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={20} color={COLORS.placeholder} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor={COLORS.placeholder}
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.placeholder} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Mot de passe" 
            placeholderTextColor={COLORS.placeholder}
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry
          />
        </View>

        {/* BOUTON D'ACTION STYLISÉ */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </Text>
        </TouchableOpacity>
        
        {/* LIEN DE NAVIGATION */}
        <TouchableOpacity onPress={() => router.push('/pages/Register')}>
          <Text style={styles.link}>Pas encore de compte ? Créer un compte</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

// ----------------------------
// STYLES AMÉLIORÉS
// ----------------------------
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: { 
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logo: {
    marginBottom: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', // Plus épais
    marginBottom: 8, 
    textAlign: 'center',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.placeholder,
    marginBottom: 40,
    textAlign: 'center',
  },
  // Style du groupe Input (pour l'icône)
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10, // Rendre plus beau sur iOS
    width: '100%',
    // Ombre légère
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // Ombre Android
  },
  icon: {
    marginRight: 10,
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  // Style du Bouton (remplace Button)
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    backgroundColor: COLORS.secondary, // Couleur différente pour l'état désactivé
    opacity: 0.7,
  },
  // Style du Lien
  link: { 
    color: COLORS.primary, // Couleur de marque
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15, 
    textAlign: 'center',
  },
});