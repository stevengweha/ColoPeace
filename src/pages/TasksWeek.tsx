import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform // Importé pour des styles potentiels
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Agenda } from "react-native-calendars";
import api from "../services/api";
import { useNavigation, NavigationProp } from "@react-navigation/native";


type RootStackParamList = {
  // Utilisez le nom de route que vous avez défini dans App.js
  Home: undefined;
  Conversations: undefined;
  Chat: undefined; // Chat est le nom de la route, pas Messages
  Users: undefined;
  Caisse: undefined;
  ListeAchats: undefined;
};


type TaskType = {
  _id: string;
  name: string;
  dueDate?: string | Date;
  status: "done" | "pending";
  assignedTo?: { _id?: string; name?: string } | string | null;
};


type StatsType = {
  tasks: number;
  tasksDone: number;
  tasksPending: number;
  conversations: number;
  users: number;
};

// Renommé en Dashboard si c'est la page d'accueil, sinon utilisez TasksWeek
export default function TasksWeek({ user }: { user: any }) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const userId = user?._id || user?.id;
  const [stats, setStats] = useState<StatsType>({
    tasks: 0,
    tasksDone: 0,
    tasksPending: 0,
    conversations: 0,
    users: 0,
  });
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [agendaItems, setAgendaItems] = useState<Record<string, TaskType[]>>({});
  const [loading, setLoading] = useState(true);
  // J'ai conservé la logique de bascule écran dans le composant
  const [screen, setScreen] = useState<"dashboard" | "tasksWeek">("dashboard");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    let isMounted = true;
    if (!userId) {
      setLoading(false);
      return () => { isMounted = false; };
    }

    async function loadData() {
      try {
        const [tasksRes, usersRes, conversationsRes] = await Promise.all([
          api.get(`/tasks/user/${userId}`),
          api.get("/users"),
          api.get("/conversations"),
        ]);

        if (!isMounted) return;

        const tasksData: TaskType[] = (tasksRes.data || []).map((t: any) => ({
          ...t,
          assignedTo: typeof t.assignedTo === "object" ? t.assignedTo : null,
          dueDate: t.dueDate ? new Date(t.dueDate) : new Date()
        }));

        setTasks(tasksData);

        setStats({
          tasks: tasksData.length,
          tasksDone: tasksData.filter(t => t.status === "done").length,
          tasksPending: tasksData.filter(t => t.status === "pending").length,
          users: (usersRes.data || []).length,
          conversations: (conversationsRes.data || []).length,
        });

        if ((tasksData || []).length > 0) {
          const firstDate = new Date(tasksData[0].dueDate || new Date()).toISOString().split("T")[0];
          setSelectedDate(firstDate);
        } else {
          setSelectedDate(new Date().toISOString().split("T")[0]);
        }
      } catch (err: any) {
        console.error("Erreur loadData:", err);
        Alert.alert(
          "Erreur serveur",
          err.response?.data?.message || err.message || "Erreur lors du chargement des données."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [userId]);

  // Construire objet items pour Agenda
  const buildAgendaItems = useCallback((tasksList: TaskType[]) => {
    const map: Record<string, TaskType[]> = {};
    let dates: Date[] = [];
    if (tasksList.length === 0) {
      dates = [new Date()];
    } else {
      dates = tasksList.map(t => new Date(t.dueDate || new Date()));
    }
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const start = new Date(min); start.setDate(start.getDate() - 7);
    const end = new Date(max); end.setDate(end.getDate() + 14);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = new Date(d).toISOString().split("T")[0];
      map[key] = [];
    }

    tasksList.forEach(t => {
      const key = new Date(t.dueDate || new Date()).toISOString().split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    return map;
  }, []);

  // recalculer agendaItems dès que tasks change
  useEffect(() => {
    setAgendaItems(buildAgendaItems(tasks));
  }, [tasks, buildAgendaItems]);

  function stringToColor(str?: string) {
    if (!str) return "#888";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  }

  const tiles = useMemo(() => ([
    { title: "Messages", icon: "chatbubble-ellipses-outline", value: stats.conversations, screen: "Conversations", color: "#1E88E5" },
    { title: "Tâches à faire", icon: "time-outline", value: stats.tasksPending, screen: "tasksWeek", color: "#f92525ff" },
    { title: "Réalisations", icon: "checkmark-done-circle-outline", value: stats.tasksDone, screen: "tasksWeek", color: "#2E7D32" },
    { title: "Utilisateurs", icon: "people-outline", value: stats.users, screen: "Users", color: "#6A1B9A" },
    { title: "Caisse commune", icon: "cash-outline", value: "30€", screen: "Caisse", color: "#d3c120ff" },
    { title: "Liste achats", icon: "cart-outline", value: stats.tasks, screen: "ListeAchats", color: "#ffa702ff" }
  ]), [stats]);

  // ❌ SUPPRESSION DE PAGESHELL. L'affichage doit être nu.

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#205C3B" />
    </View>
  );

  // 1. Rendu de l'écran Agenda/Calendrier (si l'état interne le dicte)
  if (screen === "tasksWeek") {
    return (
      // Retourne directement le contenu (pas de Header/BottomBar)
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => setScreen("dashboard")} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color="#205C3B" />
          <Text style={{ fontSize: 16, marginLeft: 8 }}>Retour au Dashboard</Text>
        </TouchableOpacity>

        <Agenda
          style={{ flex: 1 }}
          items={agendaItems}
          selected={selectedDate}
          loadItemsForMonth={(month) => {
            console.log("loadItemsForMonth", month);
          }}
          renderItem={(item: TaskType) => (
            <View style={[styles.taskItem, { backgroundColor: item.assignedTo && typeof item.assignedTo === "object" ? stringToColor(item.assignedTo.name || "") : "#888" }]}>
              <Text style={styles.taskText}>{item.name}</Text>
              <Text style={styles.taskUser}>{typeof item.assignedTo === "object" ? item.assignedTo.name : "Non assigné"}</Text>
            </View>
          )}
          // 🎯 CORRECTION : Ajouter <Text>
          renderEmptyData={() => <Text style={{ textAlign: "center", marginTop: 20 }}>Pas de tâches</Text>}
          rowHasChanged={(r1, r2) => r1._id !== r2._id}
          renderDay={(day, item) => {
            return <Text style={{ textAlign: "center", color: "#444" }}>{day ? day.day + "/" + (day.month) : null}</Text>;
          }}
          onDayPress={(day) => console.log("onDayPress", day)}
        />
      </View>
    );
  }

  // 2. Rendu de l'écran Dashboard (par défaut)
  return (
    // Retourne directement le contenu (pas de Header/BottomBar)
    <View style={{ flex: 1, padding: 15 }}>
      <Text style={styles.title}>Bonjour {user?.name || user?.firstname || "👋"} !</Text>
      <Text style={styles.subtitle}>Voici votre résumé</Text>

      <View style={styles.grid}>
        {tiles.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tile, { backgroundColor: t.color }]}
            onPress={() => {
              // 🎯 CORRECTION : Navigation via navigation.navigate ou setScreen
              switch (t.title) {
                case "Messages":
                  navigation.navigate("Conversations"); // Utilisé Conversations comme route Stack
                  break;
                case "Tâches à faire":
                  navigation.navigate("Tasks"); // Bascule l'affichage localement
                  break;
                case "Réalisations":
                  navigation.navigate("Tasks"); // Bascule l'affichage localement
                  break;
                case "Utilisateurs":
                  navigation.navigate("Users"); // Route Users
                  break;
                case "Caisse commune":
                  navigation.navigate("Caisse");
                  break;
                case "Liste achats":
                  navigation.navigate("ListeAchats");
                  break;
              }
            }}
          >
            <Ionicons name={t.icon} size={36} color="#fff" />
            <Text style={styles.tileText}>{t.title}</Text>
            <Text style={styles.counter}>{t.value}</Text>
          </TouchableOpacity>

        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "47%", height: 140, borderRadius: 15, justifyContent: "center", alignItems: "center", marginBottom: 15, elevation: 3 },
  tileText: { fontSize: 18, fontWeight: "bold", color: "#fff", marginTop: 8 },
  counter: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },
  taskItem: { padding: 12, borderRadius: 12, marginVertical: 4 },
  taskText: { color: "#fff", fontWeight: "bold" },
  taskUser: { color: "#fff", fontStyle: "italic", marginTop: 2 },
  backButton: { flexDirection: "row", alignItems: "center", padding: 10 },
});
