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
  useWindowDimensions // 🎯 Important pour le responsive
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { useNavigation } from "@react-navigation/native";

// Type pour les stats venant du Backend
type StatsType = {
  totalAssigned: number;
  done: number;
  late: number;
  pending: number;
  score: number;
  conversations?: number; 
};

export default function TasksWeek({ user }: { user: any }) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions(); // 🎯 Détecte la largeur dynamiquement
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

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [statsRes, convsRes] = await Promise.all([
        api.get(`/tasks/user/${userId}/stats`),
        api.get("/conversations"),
      ]);

      setStats(statsRes.data);
      setConvCount(convsRes.data?.length || 0);
    } catch (err: any) {
      console.error("Erreur Dashboard:", err);
      try {
        const tasksRes = await api.get(`/tasks/user/${userId}`);
        const tasks = tasksRes.data || [];
        setStats({
          totalAssigned: tasks.length,
          done: tasks.filter((t: any) => t.status === "done").length,
          pending: tasks.filter((t: any) => t.status === "pending").length,
          late: 0,
          score: 0
        });
      } catch (e) {
        Alert.alert("Erreur", "Impossible de charger les statistiques.");
      }
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const tiles = useMemo(() => ([
    { title: "Messages", icon: "chatbubble-ellipses-outline", value: convCount, route: "Conversations", color: "#1E88E5" },
    { title: "Tâches à faire", icon: "time-outline", value: stats.pending, route: "Tasks", color: "#f92525ff" },
    { title: "Réalisations", icon: "checkmark-done-circle-outline", value: stats.done, route: "Taskshistory", color: "#2E7D32" },
    { title: "Colocs", icon: "people-outline", value: "Voir", route: "Users", color: "#6A1B9A" },
    { title: "Caisse", icon: "cash-outline", value: "30€", route: "Caisse", color: "#d3c120ff" },
    { title: "Liste achats", icon: "cart-outline", value: "!", route: "ListeAchats", color: "#ffa702ff" }
  ]), [stats, convCount]);

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#205C3B" />
    </View>
  );

  // 🎯 Calcul de la largeur des colonnes
  // Si écran large (> 768px) -> 3 colonnes (31%)
  // Si mobile -> 2 colonnes (48%)
  const isLargeScreen = width > 768;
  const itemWidth = isLargeScreen ? "31.3%" : "48%";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>Bonjour {user?.name || "Coloc"} !</Text>
        <Text style={styles.subtitle}>Tu as {stats.pending} tâches en attente cette semaine.</Text>
      </View>

      <View style={styles.grid}>
        {tiles.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={[
                styles.tile, 
                { backgroundColor: t.color, width: itemWidth } // Applique la largeur dynamique
            ]}
            onPress={() => navigation.navigate(t.route)}
          >
            <View style={styles.tileHeader}>
               <Ionicons name={t.icon as any} size={30} color="#fff" />
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
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  scrollContent: { 
    padding: 15, 
    paddingBottom: 100,
    maxWidth: 1000, // 🎯 Centre le contenu sur PC pour éviter qu'il soit trop étiré
    alignSelf: 'center',
    width: '100%'
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerSection: { marginBottom: 25, marginTop: 10 },
  title: { fontSize: 28, fontWeight: "bold", color: "#1A1A1A" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 5 },
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", // Autorise le passage à la ligne
    justifyContent: "space-between" 
  },
  tile: { 
    height: 130, 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 15, 
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        cursor: 'pointer', // Curseur main sur PC
      },
      default: {
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    })
  },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tileText: { fontSize: 15, fontWeight: "600", color: "#fff", opacity: 0.9 },
  counter: { fontSize: 24, fontWeight: "bold", color: "#fff" }
});