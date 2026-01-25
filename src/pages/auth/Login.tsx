import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import AsyncStorage from "@react-native-async-storage/async-storage";
import SocialAuth from '../../components/SocialAuth';

const COLORS = {
  primary: '#205C3B',
  background: '#f4f4f9',
  text: '#333333',
  placeholder: '#a0a0a0',
  error: '#D32F2F',
  errorBg: '#FFEBEE',
};

export default function Login({ onLogin, navigation }: { onLogin: (user: any) => void, navigation: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (loading) return;
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      const user = res.data.user || res.data;
      await AsyncStorage.setItem("@colopeace_user", JSON.stringify(user));
      if (onLogin) onLogin(user);
      connectSocket(user._id || user.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.fullScreen}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
        >
          <Ionicons name="home-outline" size={80} color={COLORS.primary} />
          <Text style={styles.title}>ColoPeace</Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* INPUT EMAIL */}
          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color={COLORS.placeholder} />
            <TextInput 
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              underlineColorAndroid="transparent"
            />
          </View>

          {/* INPUT PASSWORD */}
          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.placeholder} />
            <TextInput 
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(null); }}
              secureTextEntry
              underlineColorAndroid="transparent"
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
          </TouchableOpacity>

          <SocialAuth onLoginSuccess={onLogin} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20 }}>
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Créer un compte</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: COLORS.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 20, color: COLORS.text },
  errorBox: { backgroundColor: COLORS.errorBg, padding: 10, borderRadius: 8, width: '100%', marginBottom: 15 },
  errorText: { color: COLORS.error, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%',
    height: 60,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: { flex: 1, height: '100%', marginLeft: 10, fontSize: 16, color: '#000' },
  button: { backgroundColor: COLORS.primary, width: '100%', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});