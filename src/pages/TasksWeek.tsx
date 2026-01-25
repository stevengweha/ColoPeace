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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import moment from "moment";
import 'moment/locale/fr';

moment.locale('fr');

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
    totalAssigned: 0, done: 0, late: 0, pending: 0, score: 0,
  });
  const [convCount, setConvCount] = useState(0);
  
  // LOGIQUE DU DIAPORAMA
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1️⃣ FONCTION DE CHARGEMENT DES DONNÉES
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!userId) return;
    if (!isSilent) setLoading(true);

    try {
      const [statsRes, convsRes, allTasksRes] = await Promise.all([
        api.get(`/tasks/user/${userId}/stats`),
        api.get("/conversations"),
        api.get(`/tasks/week/${moment().isoWeek()}/${moment().isoWeekYear()}`),
      ]);

      setStats(statsRes.data);
      setConvCount(convsRes.data?.length || 0);

      // Filtrer : Fait + Photo + PAS en retard
      const successTasks = allTasksRes.data
        .filter((t: any) => t.status === "done" && t.proofImage && t.status !== "late")
        .sort((a: any, b: any) => moment(b.doneAt).diff(moment(a.doneAt)));
      
      setRecentTasks(successTasks);
    } catch (err: any) {
      console.error("Erreur Sync Dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 2️⃣ RÉACTIVITÉ INSTANTANÉE (Dès qu'on arrive sur l'écran)
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // 3️⃣ MISE À JOUR AUTOMATIQUE (Polling toutes les 30 secondes pour le "temps réel")
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData(true); // "true" pour charger sans afficher l'icône de chargement
    }, 30000); 

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // 4️⃣ ROTATION DU DIAPORAMA (Toutes les 5 secondes)
  useEffect(() => {
    if (recentTasks.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % recentTasks.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [recentTasks]);

  const activeTask = recentTasks[currentIndex];

  const tiles = useMemo(() => ([
    { title: "Messages", icon: "chatbubble-ellipses-outline", value: convCount, route: "Conversations", color: "#1E88E5" },
    { title: "À faire", icon: stats.late > 0 ? "alert-circle" : "time-outline", value: stats.pending, route: "MyTasksFocus", color: stats.late > 0 ? "#E74C3C" : "#205C3B" },
    { title: "Mes points", icon: "trophy-outline", value: stats.score, route: "Taskshistory", color: "#6A1B9A" },
    { title: "Colocs", icon: "people-outline", value: "Voir", route: "Users", color: "#00838F" },
    { title: "Caisse", icon: "cash-outline", value: "30€", route: "Caisse", color: "#D4AF37" },
    { title: "Courses", icon: "cart-outline", value: "!", route: "Course", color: "#F39C12" }
  ]), [stats, convCount]);

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#205C3B" />
    </View>
  );

  const itemWidth = width > 768 ? "31.3%" : "48.5%";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.headerSection}>
        <Text style={styles.title}>Salut {user?.name || "Coloc"} !</Text>
        <Text style={[styles.subtitle, stats.late > 0 && { color: '#E74C3C', fontWeight: 'bold' }]}>
          {stats.late > 0 ? `⚠️ ${stats.late} retard(s) !` : `Tu as ${stats.pending} tâches à faire.`}
        </Text>
      </View>

      {/* 📸 DIAPORAMA AUTO-RÉACTIF */}
      {activeTask && (
        <View style={styles.feedCardContainer}>
          <TouchableOpacity 
            style={styles.feedCard}
            onPress={() => navigation.navigate("Taskshistory")}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: activeTask.proofImage }} 
              style={styles.feedImage} 
              key={activeTask._id} // Important pour forcer le rafraîchissement d'image
            />
            
            <View style={styles.feedOverlay}>
              <View style={styles.feedTopRow}>
                <View style={styles.userInfoRow}>
                  <Image 
                    source={{ uri: activeTask.assignedTo?.avatarUrl || 'https://via.placeholder.com/40' }} 
                    style={styles.userAvatar} 
                  />
                  <View>
                    <Text style={styles.userNameText}>{activeTask.assignedTo?.name}</Text>
                    <Text style={styles.feedTime}>{moment(activeTask.doneAt).fromNow()}</Text>
                  </View>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>+{activeTask.score || 10} pts</Text>
                </View>
              </View>

              <View style={styles.feedBottomContent}>
                <Text style={styles.taskNameText} numberOfLines={1}>{activeTask.name}</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.paginationDots}>
            {recentTasks.slice(0, 8).map((_, i) => (
              <View key={i} style={[styles.dot, currentIndex === i && styles.activeDot]} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {tiles.map((t, i) => (
          <TouchableOpacity key={i} style={[styles.tile, { backgroundColor: t.color, width: itemWidth }]} onPress={() => navigation.navigate(t.route)}>
            <View style={styles.tileHeader}>
               <Ionicons name={t.icon as any} size={26} color="#fff" />
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
  scrollContent: { padding: 16, paddingBottom: 100, maxWidth: 900, alignSelf: 'center', width: '100%' },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#1A1A1A" },
  subtitle: { fontSize: 15, color: "#666", marginTop: 4 },
  
  feedCardContainer: { marginBottom: 25 },
  feedCard: {
    height: 190,
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  feedImage: { width: '100%', height: '100%', opacity: 0.7, position: 'absolute' },
  feedOverlay: { flex: 1, justifyContent: 'space-between', padding: 18, backgroundColor: 'rgba(0,0,0,0.2)' },
  feedTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfoRow: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#FFF', marginRight: 10 },
  userNameText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  feedTime: { color: '#EEE', fontSize: 10 },
  scoreBadge: { backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  scoreText: { color: '#000', fontWeight: '900', fontSize: 13 },
  feedBottomContent: { marginTop: 'auto' },
  taskNameText: { color: '#FFF', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  
  paginationDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CCC', marginHorizontal: 3 },
  activeDot: { backgroundColor: '#205C3B', width: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { height: 110, borderRadius: 20, padding: 16, marginBottom: 12, justifyContent: 'space-between', elevation: 4 },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  counter: { fontSize: 20, fontWeight: "900", color: "#fff" }
});