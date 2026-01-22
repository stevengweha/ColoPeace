import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLORS = {
  primary: '#205C3B',
  secondary: '#5cb85c',
  background: '#f4f4f9',
  text: '#333333',
  placeholder: '#a0a0a0',
  shadow: 'rgba(0,0,0,0.1)',
};

// On récupère "navigation" directement depuis les props fournies par le Stack.Navigator
export default function Login({ onLogin, navigation }: { onLogin: (user: any) => void, navigation: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !password) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    }

    setLoading(true);
    try {
      // 1. Appel API
      const res = await api.post('/auth/login', { email: email.trim(), password });
      const user = res.data.user || res.data;

      // 2. Stockage AsyncStorage
      await AsyncStorage.setItem("@colopeace_user", JSON.stringify(user));

      // 3. Mise à jour de l'état global (App.tsx va switcher automatiquement sur AppStack)
      if (typeof onLogin === 'function') {
        onLogin(user);
      }

      // 4. Initialisation Socket
      try {
        connectSocket(user._id || user.id);
      } catch (e) {
        console.log("Socket connection error:", e);
      }

      // NOTE: Pas besoin de router.push ici ! 
      // Dans ton App.tsx, {user ? <AppStack /> : <AuthStack />} 
      // redirige l'utilisateur dès que onLogin(user) est appelé.

    } catch (err: any) {
      console.error("Login Error Detail:", err);
      const errorMessage = err.response?.data?.message;
      Alert.alert('Erreur', errorMessage || 'Identifiants incorrects ou serveur injoignable.');
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

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>
        
        {/* Utilisation de navigation.navigate (React Navigation natif) */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Pas encore de compte ? Créer un compte</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  logo: { marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.placeholder, marginBottom: 40, textAlign: 'center' },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 5,
    width: '100%',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, height: 45 },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  buttonDisabled: { backgroundColor: COLORS.secondary, opacity: 0.7 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginTop: 15, textAlign: 'center' },
});