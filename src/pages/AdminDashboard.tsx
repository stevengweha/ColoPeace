import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, ActivityIndicator, Alert, Image, RefreshControl, Platform 
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import moment from 'moment';

// 🔐 IMPORT CLERK & CONTEXT
import { useClerk } from "@clerk/clerk-expo";
import { UserContext } from "../../App"; 

const COLORS = {
  primary: '#205C3B',
  secondary: '#2c3e50',
  danger: '#e74c3c',
  accent: '#f39c12',
  background: '#f5f5f5',
  card: '#ffffff'
};

const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const { setUser } = useContext(UserContext); 
  const { signOut } = useClerk(); // Ajout de Clerk pour matcher App.tsx

  const [data, setData] = useState({ stats: [], users: [] });
  const [loading, setLoading] = useState({ screen: true, action: false });
  const [refreshing, setRefreshing] = useState(false);
  const [week, setWeek] = useState(moment().isoWeek().toString());
  const [inviteEmail, setInviteEmail] = useState('');

  const refreshData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/tasks/report/equity'),
        api.get('/users') 
      ]);
      setData({ stats: statsRes.data, users: usersRes.data });
    } catch (err) {
      console.error("Erreur Refresh Admin:", err);
    } finally {
      setLoading(prev => ({ ...prev, screen: false }));
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    refreshData();
  };

  // 2. ACTIONS ADMIN - LOGOUT CORRIGÉ
  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        // 1. Déconnexion Clerk (obligatoire car présent dans ton App.tsx)
        await signOut();

        // 2. Nettoyage AsyncStorage (clés de App.tsx)
        await AsyncStorage.removeItem("@colopeace_user");
        await AsyncStorage.removeItem("@colopeace_token");
        
        // 3. Reset de l'état global (Déclenche le switch vers AuthStack dans App.tsx)
        setUser(null); 

        console.log("✅ Déconnexion Admin réussie");
      } catch (e) {
        console.error("Erreur déconnexion:", e);
        Alert.alert("Erreur", "Impossible de vous déconnecter proprement.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Quitter l'espace admin ?")) performLogout();
      return;
    }

    Alert.alert("Déconnexion", "Quitter l'espace admin ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: performLogout }
    ]);
  };

  const handleGenerate = async () => {
    if (data.users.length < 4) {
      return Alert.alert("Attention", `Il faut au moins 4 utilisateurs (Actuel: ${data.users.length})`);
    }
    setLoading(prev => ({ ...prev, action: true }));
    try {
      await api.post('/tasks/generate-weekly', {
        weekNumber: parseInt(week, 10),
        year: moment().year()
      });
      Alert.alert("Succès", `Semaine ${week} distribuée !`);
      refreshData();
    } catch (err: any) {
      Alert.alert("Erreur", err.response?.data?.error || "Erreur serveur");
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleInvite = async () => {
    const emailTrimmed = inviteEmail.trim().toLowerCase();
    if (!emailTrimmed.includes('@')) return Alert.alert("Email invalide");

    setLoading(prev => ({ ...prev, action: true }));
    console.log("🚀 Envoi vers Render...");

    try {
      // On envoie l'objet EXACTEMENT comme dans Postman
      const response = await api.post('/auth/inviteuser', 
        { email: emailTrimmed }, 
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log("✅ Succès:", response.data);
      Alert.alert("Envoyé", `Invitation envoyée à ${emailTrimmed}`);
      setInviteEmail('');
    } catch (err: any) {
      // ICI on voit pourquoi le serveur a renvoyé 500
      console.error("❌ Détails de la 500:", err.response?.data);
      Alert.alert("Erreur Serveur", err.response?.data?.error || "Le serveur a crashé.");
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleAutoClean = async () => {
    setLoading(prev => ({ ...prev, action: true }));
    try {
      const res = await api.post('/tasks/mark-missed');
      Alert.alert("Maintenance", `${res.data.missedCount || 0} tâches traitées.`);
      refreshData();
    } catch (err) {
      Alert.alert("Erreur", "Le nettoyage a échoué.");
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  if (loading.screen) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Panel 🛡️</Text>
          <Text style={styles.subtitle}>{data.users.length} colocataires actifs</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* GENERATEUR */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="calendar-multiselect" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Générateur hebdomadaire</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Semaine</Text>
            <TextInput style={styles.inputWeek} value={week} onChangeText={setWeek} keyboardType="numeric" maxLength={2} />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGenerate} disabled={loading.action}>
            <Text style={styles.btnText}>Distribuer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* INVITATION */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Inviter un membre</Text>
        </View>
        <View style={styles.row}>
          <TextInput style={styles.inputEmail} placeholder="email@coloc.com" value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" />
          <TouchableOpacity style={styles.btnAccent} onPress={handleInvite}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAINTENANCE */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.btnClean} onPress={handleAutoClean}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
          <Text style={styles.btnCleanText}>Forcer l'Auto-Clean (Retards)</Text>
        </TouchableOpacity>
      </View>

      {/* CLASSEMENT */}
      <Text style={styles.sectionTitle}>Classement & Équité 🏆</Text>
      {data.stats.map((item: any, i: number) => (
        <View key={i} style={styles.userRow}>
          <Image source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${item.name}` }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userSub}>Score : {item.score} pts</Text>
          </View>
          <View style={styles.scoreBadge}>
             <Text style={styles.scoreText}>{Math.round((item.successRate || 0) * 100)}%</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.secondary },
  subtitle: { fontSize: 14, color: '#888' },
  logoutBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 12, elevation: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', marginLeft: 8, color: COLORS.secondary },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  inputGroup: { width: 80 },
  label: { fontSize: 10, color: '#aaa', marginBottom: 5, fontWeight: 'bold' },
  inputWeek: { backgroundColor: '#f0f2f5', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  inputEmail: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 10, padding: 12 },
  btnPrimary: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center' },
  btnAccent: { backgroundColor: COLORS.secondary, borderRadius: 10, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnClean: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 5 },
  btnCleanText: { color: COLORS.accent, fontWeight: 'bold', marginLeft: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 15, color: COLORS.secondary },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  avatar: { width: 45, height: 45, borderRadius: 22.5 },
  userName: { fontWeight: 'bold', fontSize: 16 },
  userSub: { fontSize: 12, color: '#999' },
  scoreBadge: { backgroundColor: '#e8f5e9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  scoreText: { color: COLORS.primary, fontWeight: 'bold' }
});

export default AdminDashboard;