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
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLORS = {
  primary: '#205C3B',
  secondary: '#5cb85c',
  background: '#f4f4f9',
  text: '#333333',
  placeholder: '#a0a0a0',
  shadow: 'rgba(0,0,0,0.1)',
  error: '#FF3B30', // Rouge pour les erreurs
};

export default function Register({ onRegister }: { onRegister: (user: any) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Nouveaux états
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigation = useNavigation();

  const handleRegister = async () => {
    if (loading) return;
    setErrorMsg(null); // Réinitialise l'erreur au début

    if (!name || !email || !password || !inviteCode) {
      return setErrorMsg('Veuillez remplir tous les champs.');
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, inviteCode });
      const user = res.data.user || res.data;

      await AsyncStorage.setItem("@colopeace_user", JSON.stringify(user));

      onRegister(user);
      connectSocket(user._id || user.id);
      navigation.navigate('TasksWeek' as never);
    } catch (err: any) {
      // On récupère le message exact envoyé par le backend (ex: "Email déjà utilisé.")
      const messageBackend = err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription.';
      setErrorMsg(messageBackend);
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
        <Ionicons name="people-outline" size={80} color={COLORS.primary} style={styles.logo} />
        <Text style={styles.title}>Créer votre compte</Text>
        <Text style={styles.subtitle}>Rejoignez votre colocation pour organiser les tâches !</Text>

        {/* AFFICHAGE DE L'ERREUR BACKEND */}
        {errorMsg && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={20} color={COLORS.placeholder} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Nom (Prénom ou Pseudo)" 
            placeholderTextColor={COLORS.placeholder}
            value={name} 
            onChangeText={(t) => { setName(t); setErrorMsg(null); }}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={20} color={COLORS.placeholder} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor={COLORS.placeholder}
            value={email} 
            onChangeText={(t) => { setEmail(t); setErrorMsg(null); }} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
        </View>

        {/* MOT DE PASSE AVEC OPTION VISIBILITÉ */}
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.placeholder} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Mot de passe" 
            placeholderTextColor={COLORS.placeholder}
            value={password} 
            onChangeText={(t) => { setPassword(t); setErrorMsg(null); }} 
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={COLORS.placeholder} 
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.inputGroup, { borderColor: COLORS.secondary, borderWidth: 1 }]}>
          <Ionicons name="key-outline" size={20} color={COLORS.secondary} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Code d'invitation" 
            placeholderTextColor={COLORS.placeholder}
            value={inviteCode} 
            onChangeText={(t) => { setInviteCode(t); setErrorMsg(null); }} 
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.link}>Déjà un compte ? Connectez-vous</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  logo: { marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.placeholder, marginBottom: 25, textAlign: 'center' },
  
  // Style pour le message d'erreur
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600', marginLeft: 8 },

  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 10, 
    width: '100%',
    elevation: 3, 
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: COLORS.text },
  eyeIcon: { padding: 5 },
  
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
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginTop: 15 },
});