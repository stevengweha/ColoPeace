import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import api from "../../services/api";
import { TaskDetailView } from "./Tasks";

export default function MyTasksFocus({ navigation, user }: any) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const userId = user?._id || user?.id;

  const loadMyTasks = useCallback(async () => {
    try {
      const res = await api.get(`/tasks/user/${userId}`);
      // On ne montre QUE les tâches non faites (l'urgence)
      const pending = res.data.filter((t: any) => t.status !== "done");
      setTasks(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadMyTasks(); }, [loadMyTasks]);

  if (loading) return <ActivityIndicator size="large" color="#205C3B" style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER SIMPLE */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>À faire maintenant</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={60} color="#27AE60" />
            <Text style={styles.emptyText}>Rien au planning pour toi !</Text>
          </View>
        ) : (
          tasks.map((task: any) => (
            <TouchableOpacity 
              key={task._id} 
              style={styles.actionCard}
              onPress={() => setSelectedTask(task)} // 👈 Ouvre le formulaire direct
            >
              <View style={styles.cardHeader}>
                <View style={[styles.indicator, moment(task.dueDate).isBefore(moment()) && styles.lateIndicator]} />
                <Text style={styles.taskName}>{task.name}</Text>
              </View>
              
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {moment(task.dueDate).isBefore(moment()) ? "En retard - " : "Échéance : "}
                  {moment(task.dueDate).fromNow()}
                </Text>
                <View style={styles.btnAction}>
                   <Text style={styles.btnActionText}>VALIDER</Text>
                   <Ionicons name="chevron-forward" size={16} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* MODAL DE VALIDATION DIRECTE */}
      <Modal visible={!!selectedTask} animationType="slide">
        {selectedTask && (
          <TaskDetailView 
            task={selectedTask}
            currentUserId={userId}
            onBack={() => setSelectedTask(null)}
            onSuccess={() => {
              setSelectedTask(null);
              loadMyTasks(); // Refresh la liste après succès
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  list: { padding: 20 },
  actionCard: { 
    backgroundColor: '#F8F9FA', borderRadius: 20, padding: 20, marginBottom: 15,
    borderWidth: 1, borderColor: '#EEE'
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60', marginRight: 10 },
  lateIndicator: { backgroundColor: '#E74C3C' },
  taskName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 13, color: '#666' },
  btnAction: { 
    backgroundColor: '#205C3B', paddingHorizontal: 15, paddingVertical: 8, 
    borderRadius: 10, flexDirection: 'row', alignItems: 'center' 
  },
  btnActionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginRight: 5 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, fontSize: 16, color: '#999' }
});