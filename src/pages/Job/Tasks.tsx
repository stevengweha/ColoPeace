// tasks.tsx (Adapté à ColoPeace)

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import api from "../../services/api";

// ----------------------------
// TYPES ET CONSTANTES
// ----------------------------
type User = { _id: string; name: string; avatarUrl?: string };

type Task = {
  _id: string;
  name: "Sol" | "Cuisine" | "Douche" | "Toilettes";
  assignedTo: User;
  weekNumber: number;
  year: number;
  status: "pending" | "done" | "late" | "missed";
  dueDate: string; // Date limite imposée
  doneAt?: string; // Date de complétion réelle
  proofImage?: string; // URL Cloudinary
  note?: string;
};

const STATUS_COLORS = {
  pending: { icon: "timer-outline", color: "#FF9800", text: "En cours" },
  done: { icon: "checkmark-circle-outline", color: "#4CAF50", text: "Terminé à temps" },
  late: { icon: "warning-outline", color: "#FF5722", text: "Terminé en retard" },
  missed: { icon: "close-circle-outline", color: "#F44336", text: "Manquée" },
};

// ----------------------------
// COMPOSANT PRINCIPAL : TaskRoot
// ----------------------------
export default function TaskRoot({ user }: { user: any }) {
  
  // ✅ CORRECTION: Ajout de 'complete_modal' comme état possible de l'écran
  const [screen, setScreen] = useState<"dashboard" | "report" | "complete_modal">("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (userId) {
      loadTasks(userId);
    }
  }, [userId]);

  async function loadTasks(id: string) {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/user/${id}`); 
      setTasks(res.data || []);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de charger les tâches.");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  if (!userId) return <ActivityIndicator size="large" color="#205C3B" />;

  // 1. Affichage du DASHBOARD
  if (screen === "dashboard") {
    return (
      <TaskDashboard 
        tasks={tasks} 
        loading={loading} 
        onRefresh={() => loadTasks(userId)} 
        
        onComplete={(task) => {
          setSelectedTask(task);
          setScreen("complete_modal");
        }} 
        
        onOpenReport={() => setScreen("report")}
        currentUserId={userId}
      />
    );
  }
  
  // 2. Affichage du RAPPORT
  if (screen === "report") {
    return <EquityReport onBack={() => setScreen("dashboard")} />;
  }

  // 3. Affichage de la MODALE DE COMPLÉTION
  if (screen === "complete_modal" && selectedTask) {
    return (
      <TaskCompleteModal 
        task={selectedTask}
        onCompleted={() => { 
          setSelectedTask(null); 
          loadTasks(userId); // Rafraîchir
          setScreen("dashboard"); // Revenir au dashboard
        }}
        onCancel={() => {
          setSelectedTask(null);
          setScreen("dashboard"); // Revenir au dashboard
        }}
      />
    );
  }

  return null;
}

// ----------------------------
// PAGE DASHBOARD (Liste)
// ----------------------------
function TaskDashboard({ tasks, loading, onRefresh, onComplete, onOpenReport, currentUserId }: { tasks: Task[], loading: boolean, onRefresh: () => void, onComplete: (task: Task) => void, onOpenReport: () => void, currentUserId: string }) {
  
  const currentWeek = moment().isoWeek();
  const currentYear = moment().isoWeekYear();

  const currentTasks = tasks.filter(t => t.weekNumber === currentWeek && t.year === currentYear);
  const myTasks = currentTasks.filter(t => t.assignedTo._id === currentUserId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏡 Tâches de la Semaine {currentWeek}</Text>
        <TouchableOpacity onPress={onOpenReport} style={styles.reportButton}>
          <Ionicons name="stats-chart-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          J'ai **{myTasks.filter(t => t.status === 'pending').length}** tâche(s) à faire.
        </Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#205C3B" style={{ marginTop: 20 }} />}

      {!loading && (
        <FlatList
          data={currentTasks}
          keyExtractor={(item) => item._id}
          onRefresh={onRefresh}
          refreshing={loading}
          renderItem={({ item }) => {
            const isMyTask = item.assignedTo._id === currentUserId;
            const statusInfo = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
            
            return (
              <View style={styles.taskItem}>
                <View style={styles.taskContent}>
                  <Text style={styles.taskName}>{item.name}</Text>
                  <Text style={{ color: statusInfo.color, fontWeight: 'bold', fontSize: 12 }}>
                    <Ionicons name={statusInfo.icon as any} size={14} /> {statusInfo.text.toUpperCase()}
                  </Text>
                  <Text style={styles.assignedTo}>Assigné à : {item.assignedTo.name}</Text>
                  
                  {/* 🎯 Affichage du Délais */}
                  <Text style={item.status === 'pending' && moment().isAfter(item.dueDate) ? styles.overdueText : styles.dueDateText}>
                    Limite : {moment(item.dueDate).format('ddd DD/MM à HH:mm')}
                  </Text>

                  {item.proofImage && (
                    <Text style={styles.proofText}>
                      Preuve fournie {moment(item.doneAt).fromNow()}.
                    </Text>
                  )}
                </View>

                {/* 🎯 Bouton de Complétion (si c'est ma tâche et en attente) */}
                {isMyTask && item.status === 'pending' && (
                  <TouchableOpacity 
                    style={styles.completeButton} 
                    onPress={() => onComplete(item)}
                  >
                    <Text style={styles.completeButtonText}>Terminer</Text>
                  </TouchableOpacity>
                )}
              </View>
          );
          }}
        />
      )}
    </View>
  );
}

// ----------------------------
// MODALE DE COMPLÉTION (Soumission de Preuve)
// ----------------------------
function TaskCompleteModal({ task, onCompleted, onCancel }: { task: Task, onCompleted: () => void, onCancel: () => void }) {
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImagePick = () => {
    Alert.alert("Sélection Photo", "Simuler l'ouverture de la galerie/caméra.");
    setProofImageUri('local/path/to/image.jpg'); 
  };
  
  async function uploadImage(uri: string): Promise<string> {
    return new Promise(resolve => setTimeout(() => resolve(`https://cloudinary.com/proof/${task._id}-${Date.now()}.jpg`), 1500));
  }


  async function saveCompletion() {
    if (!proofImageUri) return Alert.alert("Erreur", "La preuve (photo) est obligatoire.");

    setIsSubmitting(true);
    
    try {
      const finalImageUrl = await uploadImage(proofImageUri); 

      await api.put(`/tasks/complete/${task._id}`, {
        proofImage: finalImageUrl,
        note: note,
      });

      onCompleted();
    } catch (err) {
      Alert.alert("Erreur", "Impossible de soumettre la tâche.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, styles.modalOverlay]}>
      <View style={styles.modalContent}>
        <Text style={styles.title}>✅ Confirmer {task.name}</Text>
        <Text style={styles.modalText}>
          La soumission de **preuve (photo)** est obligatoire. L'heure de complétion sera vérifiée par rapport à la limite.
        </Text>

        <TouchableOpacity onPress={handleImagePick} style={styles.uploadButton}>
          <Ionicons name="camera-outline" size={24} color="#fff" />
          <Text style={styles.btnText}>{proofImageUri ? "Preuve SÉLECTIONNÉE" : "Ajouter une Preuve Photo"}</Text>
        </TouchableOpacity>

        <TextInput 
          style={[styles.input, { height: 80 }]} 
          placeholder="Note (Optionnel)" 
          value={note} 
          onChangeText={setNote} 
          multiline 
        />

        <View style={styles.modalActions}>
          <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]} disabled={isSubmitting}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveCompletion} style={[styles.button, styles.saveButton]} disabled={isSubmitting || !proofImageUri}>
            {isSubmitting ? 
              <ActivityIndicator color="#fff" /> : 
              <Text style={styles.btnText}>Confirmer la Complétion</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ----------------------------
// PAGE RAPPORT D'ÉQUITÉ
// ----------------------------
function EquityReport({ onBack }: { onBack: () => void }) {
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const res = await api.get("/tasks/report/equity");
      setReport(res.data);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de charger le rapport d'équité.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <ActivityIndicator size="large" color="#205C3B" style={styles.container} />;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back-outline" size={24} />
        <Text style={{ marginLeft: 5 }}>Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>⚖️ Rapport d'Équité Global</Text>

      <FlatList
        data={report}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.reportItem}>
            <Text style={styles.reportName}>{item.name}</Text>
            <Text>Assigné: <Text style={styles.reportValue}>{item.totalAssigned}</Text></Text>
            <Text>Terminé à temps: <Text style={{ color: '#4CAF50' }}>{item.doneOnTime}</Text></Text>
            <Text>En retard: <Text style={{ color: '#FF5722' }}>{item.late}</Text></Text>
            <Text>Manquée: <Text style={{ color: '#F44336' }}>{item.missed}</Text></Text>
            <Text style={styles.reportRate}>Taux de Succès: {(item.successRate * 100).toFixed(1)}%</Text>
          </View>
        )}
      />
    </View>
  );
}


// ----------------------------
// STYLES
// ----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 24, fontWeight: "bold" },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reportButton: { backgroundColor: '#205C3B', padding: 8, borderRadius: 50 },
  
  infoBox: { backgroundColor: '#E1F5FE', padding: 12, borderRadius: 8, marginBottom: 15 },
  infoText: { fontSize: 16, color: '#01579B' },

  taskItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 10, 
    backgroundColor: "#fff", 
    marginVertical: 6, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  taskContent: { flex: 1 },
  taskName: { fontSize: 18, fontWeight: "bold" },
  assignedTo: { fontSize: 14, color: '#666', marginTop: 2 },
  dueDateText: { fontSize: 12, color: '#00B8D4', marginTop: 4 },
  overdueText: { fontSize: 12, color: '#D50000', marginTop: 4, fontWeight: 'bold' },
  proofText: { fontSize: 12, color: '#333', fontStyle: 'italic', marginTop: 4 },
  
  completeButton: { 
    backgroundColor: '#205C3B', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    marginLeft: 10 
  },
  completeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Styles Modale
  modalOverlay: { 
    position: 'absolute', // Permet à la modale de flotter par-dessus
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 0 
  },
  modalContent: { 
    width: '90%', 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 10 
  },
  modalText: { marginBottom: 15, color: '#444' },
  uploadButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#0288D1", 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { padding: 10, borderRadius: 8, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  saveButton: { backgroundColor: '#205C3B' },
  cancelButton: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, marginLeft: 5 },
  cancelButtonText: { color: '#333', fontSize: 16 },

  // Styles Rapport
  reportItem: { padding: 15, borderRadius: 10, backgroundColor: "#fff", marginVertical: 6, borderWidth: 1, borderColor: '#eee' },
  reportName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  reportValue: { fontWeight: 'bold' },
  reportRate: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginTop: 5 },
});