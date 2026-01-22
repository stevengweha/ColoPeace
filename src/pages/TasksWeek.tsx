import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  useWindowDimensions,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import 'moment/locale/fr';

moment.locale('fr');

// --- Types ---
type StatsType = {
  totalAssigned: number;
  done: number;
  late: number;
  pending: number;
  score: number;
};

export default function TasksWeek({ user }: { user: any }) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const userId = user?._id || user?.id;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsType>({
    totalAssigned: 0,
    done: 0,
    late: 0,
    pending: 0,
    score: 0,
  });
  const [convCount, setConvCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<any>(null);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Appel parallèle pour les stats, messages et tâches de la semaine
      const [statsRes, convsRes, allTasksRes] = await Promise.all([
        api.get(`/tasks/user/${userId}/stats`),
        api.get("/conversations"),
        api.get(`/tasks/week/${moment().isoWeek()}/${moment().isoWeekYear()}`),
      ]);

      setStats(statsRes.data);
      setConvCount(convsRes.data?.length || 0);

      // 2. Extraction de la dernière activité (dernière tâche validée avec photo)
      const lastDone = allTasksRes.data
        .filter((t: any) => t.status === "done" && t.proofImage)
        .sort((a: any, b: any) => moment(b.doneAt).diff(moment(a.doneAt)))[0];
      
      setLastActivity(lastDone);

    } catch (err: any) {
      console.error("Erreur Dashboard:", err);
      // Fallback si la route stats échoue
      try {
        const tasksRes = await api.get(`/tasks/user/${userId}`);
        const tasks = tasksRes.data || [];
        setStats({
          totalAssigned: tasks.length,
          done: tasks.filter((t: any) => t.status === "done").length,
          pending: tasks.filter((t: any) => t.status !== "done").length,
          late: tasks.filter((t: any) => t.status === "late").length,
          score: 0
        });
      } catch (e) {
        Alert.alert("Erreur", "Impossible de rafraîchir les données.");
      }
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 🎯 Configuration dynamique des tuiles
  const tiles = useMemo(() => ([
    { 
      title: "Messages", 
      icon: "chatbubble-ellipses-outline", 
      value: convCount, 
      route: "Conversations", 
      color: "#1E88E5" 
    },
    { 
      title: "À faire", 
      icon: stats.late > 0 ? "alert-circle" : "time-outline", 
      value: stats.pending, 
      route: "MyTasksFocus", 
      color: stats.late > 0 ? "#E74C3C" : "#205C3B" // Rouge si retard, vert sinon
    },
    { 
      title: "Mes points", 
      icon: "trophy-outline", 
      value: stats.score, 
      route: "Taskshistory", 
      color: "#6A1B9A" 
    },
    { 
      title: "Colocs", 
      icon: "people-outline", 
      value: "Voir", 
      route: "Users", 
      color: "#00838F" 
    },
    { 
      title: "Caisse", 
      icon: "cash-outline", 
      value: "30€", 
      route: "Caisse", 
      color: "#D4AF37" 
    },
    { 
      title: "Courses", 
      icon: "cart-outline", 
      value: "!", 
      route: "ListeAchats", 
      color: "#F39C12" 
    }
  ]), [stats, convCount]);

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#205C3B" />
    </View>
  );

  const isLargeScreen = width > 768;
  const itemWidth = isLargeScreen ? "31.3%" : "48%";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* HEADER DYNAMIQUE */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Salut {user?.name || "Coloc"} !</Text>
        <Text style={[styles.subtitle, stats.late > 0 && { color: '#E74C3C', fontWeight: 'bold' }]}>
          {stats.late > 0 
            ? `⚠️ Tu as ${stats.late} tâche(s) en retard !` 
            : `Tu as ${stats.pending} tâches à valider.`}
        </Text>
      </View>

      {/* 📸 FEED D'ACTIVITÉ (Le mur de la gloire) */}
{lastActivity && (
  <TouchableOpacity 
    style={styles.feedCard}
    onPress={() => navigation.navigate("Taskshistory")}
  >
    {/* Image de preuve en fond */}
    <Image source={{ uri: lastActivity.proofImage }} style={styles.feedImage} />
    
    {/* Overlay pour dégradé ou lisibilité */}
    <View style={styles.feedOverlay}>
      
      {/* 👤 Infos de l'utilisateur (Avatar + Nom) */}
      <View style={styles.userInfoRow}>
        <Image 
          source={{ uri: lastActivity.assignedTo?.avatarUrl || 'https://via.placeholder.com/40' }} 
          style={styles.userAvatar} 
        />
        <View>
          <Text style={styles.userNameText}>{lastActivity.assignedTo?.name}</Text>
          <Text style={styles.feedTime}>{moment(lastActivity.doneAt).fromNow()}</Text>
        </View>
      </View>

      <View style={styles.feedContent}>
        <View style={styles.feedBadge}>
           <Text style={styles.feedBadgeText}>DERNIÈRE RÉUSSITE</Text>
        </View>
        <Text style={styles.taskNameText}>A validé : {lastActivity.name}</Text>
      </View>
      
    </View>
  </TouchableOpacity>
)}

      {/* GRILLE DE TUILES */}
      <View style={styles.grid}>
        {tiles.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tile, { backgroundColor: t.color, width: itemWidth }]}
            onPress={() => navigation.navigate(t.route)}
          >
            <View style={styles.tileHeader}>
               <Ionicons name={t.icon as any} size={28} color="#fff" />
               <Text style={styles.counter}>{t.value}</Text>
            </View>
            <Text style={styles.tileText}>{t.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { 
    padding: 15, 
    paddingBottom: 100,
    maxWidth: 1000, 
    alignSelf: 'center',
    width: '100%'
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: { marginBottom: 20, marginTop: 10 },
  title: { fontSize: 28, fontWeight: "900", color: "#1A1A1A" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 5 },
  
  // Styles du Feed
  feedCard: {
    height: 150,
    width: '100%',
    borderRadius: 24,
    marginBottom: 25,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  feedImage: { width: '100%', height: '100%', opacity: 0.6 },
  feedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  feedBadge: { 
    backgroundColor: '#27AE60', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    marginBottom: 5 
  },
  feedBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  feedText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  feedTime: { color: '#EEE', fontSize: 11, marginTop: 2 },

  // Styles de la Grille
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between" 
  },
  tile: { 
    height: 120, 
    borderRadius: 22, 
    padding: 18, 
    marginBottom: 15, 
    justifyContent: 'space-between',
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    })
  },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileText: { fontSize: 14, fontWeight: "700", color: "#fff", opacity: 0.9 },
  counter: { fontSize: 22, fontWeight: "900", color: "#fff" }
});