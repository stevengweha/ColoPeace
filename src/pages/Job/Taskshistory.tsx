import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import "moment/locale/fr";
import api from "../../services/api";
import { useNavigation } from "@react-navigation/native"; // 🎯 Correction navigation

moment.locale("fr");

// Types mis à jour pour matcher le backend
type Task = {
  _id: string;
  name: string;
  status: string;
  doneAt?: string;
  dueDate: string;
  proofImage?: string;
  note?: string;
  isLate?: boolean;
};

type EquityUser = {
  name: string;
  totalAssigned: number;
  doneOnTime: number;
  late: number;
  missed?: number;
  score: number;      // 🎯 Donnée backend
  successRate: number; // 🎯 Donnée backend
};

export default function TaskHistory({ user }: { user: any }) {
  const navigation = useNavigation(); // 🎯 Hook de navigation fonctionnel
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Task[]>([]);
  const [equityReport, setEquityReport] = useState<EquityUser[]>([]);
  const [tab, setTab] = useState<"personal" | "ranking">("personal");

  const userId = user?._id || user?.id;

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyRes, equityRes] = await Promise.all([
        api.get(`/tasks/user/${userId}`),
        api.get(`/tasks/report/equity`)
      ]);
      
      const doneTasks = (historyRes.data || []).filter((t: Task) => t.status === "done");
      setHistory(doneTasks.sort((a, b) => moment(b.doneAt).diff(moment(a.doneAt))));
      setEquityReport(equityRes.data || []);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
    } finally {
      setLoading(false);
    }
  };

  // Récupération des stats complètes du backend pour l'utilisateur connecté
  const myStats = useMemo(() => {
    return equityReport.find(u => u.name === user.name);
  }, [equityReport, user.name]);

  const renderHistoryItem = ({ item }: { item: Task }) => {
    const isLate = moment(item.doneAt).isAfter(item.dueDate);
    return (
      <View style={styles.historyCard}>
        <Image 
          source={{ uri: item.proofImage || "https://via.placeholder.com/150" }} 
          style={styles.taskImage} 
        />
        <View style={styles.taskInfo}>
          <Text style={styles.taskName}>{item.name}</Text>
          <Text style={styles.taskDate}>Fait le {moment(item.doneAt).format("DD MMM YYYY")}</Text>
          {item.note ? <Text style={styles.taskNote} numberOfLines={1}>"{item.note}"</Text> : null}
        </View>
        <View style={styles.statusContainer}>
          <Ionicons 
              name={isLate ? "alert-circle" : "checkmark-circle"} 
              size={24} 
              color={isLate ? "#E67E22" : "#27AE60"} 
          />
          <Text style={[styles.statusMiniText, { color: isLate ? "#E67E22" : "#27AE60" }]}>
              {isLate ? "Retard" : "À temps"}
          </Text>
        </View>
      </View>
    );
  };

  const renderRankingItem = ({ item, index }: { item: EquityUser; index: number }) => (
    <View style={[styles.rankingCard, item.name === user.name && styles.myRanking]}>
      <Text style={styles.rankNumber}>{index + 1}</Text>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.rankName}>{item.name} {item.name === user.name ? "⭐" : ""}</Text>
        <Text style={styles.rankSub}>{item.doneOnTime} à temps • {item.late} retards</Text>
      </View>
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreValueText}>{item.score} pts</Text>
        <Text style={styles.scorePercentText}>{Math.round(item.successRate * 100)}%</Text>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#205C3B" style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Réalisations</Text>
      </View>

      {/* 🎯 Dashboard de stats enrichi avec les données Backend */}
      <View style={styles.statsOverview}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{myStats?.score || 0}</Text>
          <Text style={styles.statLabel}>Score Total</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#eee" }]}>
          <Text style={styles.statVal}>{Math.round((myStats?.successRate || 0) * 100)}%</Text>
          <Text style={styles.statLabel}>Efficacité</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: "#E67E22" }]}>{myStats?.late || 0}</Text>
          <Text style={styles.statLabel}>Retards</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
            style={[styles.tab, tab === "personal" && styles.activeTab]} 
            onPress={() => setTab("personal")}
        >
          <Text style={[styles.tabText, tab === "personal" && styles.activeTabText]}>Mon Historique</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tab, tab === "ranking" && styles.activeTab]} 
            onPress={() => setTab("ranking")}
        >
          <Text style={[styles.tabText, tab === "ranking" && styles.activeTabText]}>Classement</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={tab === "personal" ? history : equityReport.sort((a, b) => b.score - a.score)}
        keyExtractor={(item, index) => index.toString()}
        renderItem={tab === "personal" ? renderHistoryItem : renderRankingItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Aucune donnée disponible</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { flexDirection: "row", alignItems: "center", padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  backBtn: { padding: 5 },
  title: { fontSize: 24, fontWeight: "bold", marginLeft: 15, color: "#1A1A1A" },
  
  statsOverview: { flexDirection: "row", backgroundColor: "#fff", margin: 20, borderRadius: 25, padding: 20, elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  statBox: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "bold", color: "#205C3B" },
  statLabel: { fontSize: 12, color: "#777", marginTop: 4, fontWeight: "500" },

  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 15, backgroundColor: "#eee", borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#fff", elevation: 2 },
  tabText: { color: "#777", fontWeight: "600" },
  activeTabText: { color: "#205C3B" },

  listContent: { padding: 20, paddingBottom: 120 },
  historyCard: { backgroundColor: "#fff", borderRadius: 18, padding: 12, marginBottom: 15, flexDirection: "row", alignItems: "center", elevation: 2 },
  taskImage: { width: 65, height: 65, borderRadius: 15, backgroundColor: "#f0f0f0" },
  taskInfo: { flex: 1, marginLeft: 15 },
  taskName: { fontSize: 17, fontWeight: "bold", color: "#333" },
  taskDate: { fontSize: 12, color: "#999", marginTop: 3 },
  taskNote: { fontSize: 11, color: "#666", fontStyle: "italic", marginTop: 5 },
  statusContainer: { alignItems: "center", minWidth: 50 },
  statusMiniText: { fontSize: 10, fontWeight: "bold", marginTop: 3 },

  rankingCard: { backgroundColor: "#fff", borderRadius: 18, padding: 15, marginBottom: 12, flexDirection: "row", alignItems: "center", elevation: 1 },
  myRanking: { borderWidth: 2, borderColor: "#205C3B", backgroundColor: "#F1F8F4" },
  rankNumber: { fontSize: 20, fontWeight: "bold", color: "#205C3B", width: 35 },
  rankName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  rankSub: { fontSize: 13, color: "#777", marginTop: 2 },
  scoreBadge: { alignItems: "flex-end" },
  scoreValueText: { color: "#205C3B", fontWeight: "bold", fontSize: 16 },
  scorePercentText: { color: "#2E7D32", fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 50, color: "#999" }
});