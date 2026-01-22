import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, // Remplacement du Button natif
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator // Pour l'indicateur de chargement
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";


// ----------------------------
// COULEURS DE MARQUE (IDENTIQUES À LOGIN.TSX)
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
export default function Register({ onRegister }: { onRegister: (user: any) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (loading) return;
    if (!name || !email || !password) return Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      const user = res.data.user || res.data;
      
      await AsyncStorage.setItem(
        "@colopeace_user",
        JSON.stringify(user)
      );

      onRegister(user);
      connectSocket(user._id || user.id);
      // navigation.navigate('Conversations' as never); // Assurez-vous que 'Conversations' est une route valide
      navigation.navigate('TasksWeek' as never); // Redirection par défaut vers les tâches après l'inscription
    } catch (err: any) {
      console.error(err);
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de créer le compte. L\'email est peut-être déjà utilisé.');
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

        {/* CHAMPS D'ENTRÉE : NOM */}
        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={20} color={COLORS.placeholder} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Nom (Prénom ou Pseudo)" 
            placeholderTextColor={COLORS.placeholder}
            value={name} 
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* CHAMPS D'ENTRÉE : EMAIL */}
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

        {/* CHAMPS D'ENTRÉE : MOT DE PASSE */}
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
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>
        
        {/* LIEN DE NAVIGATION */}
        <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.link}>Déjà un compte ? Connectez-vous</Text>
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
    fontWeight: '800', 
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
    paddingVertical: Platform.OS === 'ios' ? 15 : 10, 
    width: '100%',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, 
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
    backgroundColor: COLORS.secondary, 
    opacity: 0.7,
  },
  // Style du Lien
  link: { 
    color: COLORS.primary, 
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15, 
    textAlign: 'center',
  },
});