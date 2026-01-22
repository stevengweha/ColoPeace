import React, { useState, useEffect } from "react";
import { 
  View, Text, TouchableOpacity, TextInput, StyleSheet, 
  ActivityIndicator, Alert, ScrollView, Image, SafeAreaView, Platform 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import 'moment/locale/fr';
import api from "../../services/api";

moment.locale('fr');

// --- Types ---
type User = { _id: string; name: string; avatarUrl?: string };
type Task = {
  _id: string; name: string; assignedTo: User;
  weekNumber: number; year: number; status: "pending" | "done" | "late" | "missed";
  dueDate: string; doneAt?: string; proofImage?: string; note?: string;
};

const STATUS_MAP: any = {
  pending: { label: "À FAIRE", color: "#F39C12", icon: "time" },
  done: { label: "TERMINÉ", color: "#27AE60", icon: "checkmark-circle" },
  late: { label: "RETARD", color: "#E67E22", icon: "alert-circle" },
  missed: { label: "MANQUÉ", color: "#E74C3C", icon: "close-circle" },
};

export default function TaskRoot({ user }: { user: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(moment().isoWeek());
  const [currentYear, setCurrentYear] = useState(moment().isoWeekYear());
  const [view, setView] = useState<"calendar" | "detail">("calendar");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const userId = user?._id || user?.id;

  useEffect(() => { loadTasks(); }, [currentWeek, currentYear]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/week/${currentWeek}/${currentYear}`);
      setTasks(res.data || []);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally { setLoading(false); }
  };

  const changeWeek = (direction: number) => {
    let newDate = moment().isoWeekYear(currentYear).isoWeek(currentWeek).add(direction, 'weeks');
    setCurrentWeek(newDate.isoWeek());
    setCurrentYear(newDate.isoWeekYear());
  };

  if (view === "detail" && selectedTask) {
    return (
      <TaskDetailView 
        task={selectedTask} 
        currentUserId={userId}
        onSuccess={() => {
            setView("calendar");
            loadTasks(); 
        }}
        onBack={() => setView("calendar")} 
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Planning</Text>
          <Text style={styles.headerSub}>Semaine {currentWeek}, {currentYear}</Text>
        </View>
        <View style={styles.weekPicker}>
          <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekBtn}>
            <Ionicons name="chevron-back" size={24} color="#205C3B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentWeek(moment().isoWeek()); setCurrentYear(moment().isoWeekYear()); }} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>Aujourd'hui</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekBtn}>
            <Ionicons name="chevron-forward" size={24} color="#205C3B" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#205C3B" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((day, idx) => {
            const dayMoment = moment().year(currentYear).isoWeek(currentWeek).isoWeekday(idx + 1);
            const dayTasks = tasks.filter(t => moment(t.dueDate).isSame(dayMoment, 'day'));

            return (
              <View key={day} style={styles.daySection}>
                <View style={styles.dayIndicator}>
                    <Text style={styles.dayLabel}>{day}</Text>
                    <Text style={styles.dateLabel}>{dayMoment.format('DD MMM')}</Text>
                </View>
                
                <View style={styles.tasksContainer}>
                    {dayTasks.length === 0 ? (
                        <Text style={styles.noTaskText}>Aucune tâche</Text>
                    ) : (
                        dayTasks.map(task => (
                            <TouchableOpacity 
                                key={task._id} 
                                style={[styles.taskCard, task.assignedTo?._id === userId && styles.myTaskCard]}
                                onPress={() => { setSelectedTask(task); setView("detail"); }}
                            >
                                <View style={styles.taskInfo}>
                                    <Text style={styles.taskName}>{task.name}</Text>
                                    <View style={styles.userInfo}>
                                        <Ionicons name="person-outline" size={12} color="#666" />
                                        <Text style={styles.userName}>{task.assignedTo?.name}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: STATUS_MAP[task.status]?.color + '20' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_MAP[task.status]?.color }]}>
                                        {STATUS_MAP[task.status]?.label}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TaskDetailView({ task, currentUserId, onBack, onSuccess }: { task: Task, currentUserId: string, onBack: () => void, onSuccess: () => void }) {
  const [note, setNote] = useState(task.note || "");
  const [image, setImage] = useState<string | null>(task.proofImage || null);
  const [submitting, setSubmitting] = useState(false);
  const isOwner = task.assignedTo?._id === currentUserId;

  const handleComplete = async () => {
  if (!image) {
    const errorMsg = "Veuillez prendre une photo de preuve.";
    Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert("Erreur", errorMsg);
    return;
  }
  
  setSubmitting(true);
  try {
    // 1. Envoi au backend (note et image)
    const res = await api.put(`/tasks/complete/${task._id}`, { proofImage: image, note });

    // 2. Récupération des données fraîches du serveur
    // Le backend renvoie { message, task: { score, note, ... } }
    const scoreGagne = res.data.task.score;
    const noteValidee = res.data.task.note || "Aucune";

    // 3. Préparation du message de succès
    const succesMessage = `Score : +${scoreGagne} points !\nNote : ${noteValidee}`;

    if (Platform.OS === 'web') {
      window.alert(`Félicitations ! 🎉\n${succesMessage}`);
      onSuccess();
    } else {
      Alert.alert(
        "Félicitations ! 🎉",
        succesMessage,
        [{ text: "OK", onPress: () => onSuccess() }]
      );
    }
  } catch (e: any) {
    console.error("Erreur PUT:", e);
    const errorMsg = e.response?.data?.error || "Impossible de valider.";
    Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert("Erreur", errorMsg);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <ScrollView style={styles.detailContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
        <Text style={styles.backText}>Retour au planning</Text>
      </TouchableOpacity>

      <View style={styles.detailCard}>
        <View style={[styles.statusRibbon, { backgroundColor: STATUS_MAP[task.status]?.color }]}>
            <Text style={styles.ribbonText}>{STATUS_MAP[task.status]?.label}</Text>
        </View>

        <Text style={styles.detailTitle}>{task.name}</Text>
        <Text style={styles.detailSub}>Assigné à {task.assignedTo?.name}</Text>
        <Text style={styles.detailDate}>Date limite : {moment(task.dueDate).format('LLLL')}</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Preuve de réalisation</Text>
        
        {image ? (
            <Image source={{ uri: image }} style={styles.proofImage} />
        ) : (
            <View style={styles.emptyPhotoBox}>
                <Ionicons name="images-outline" size={40} color="#CCC" />
                <Text style={{ color: '#AAA' }}>Aucune photo fournie</Text>
            </View>
        )}

        {isOwner && task.status === 'pending' && (
            <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                <TouchableOpacity 
                    style={styles.cameraBtn} 
                    onPress={() => setImage('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=500')}
                >
                    <Ionicons name="camera" size={24} color="#fff" />
                    <Text style={styles.cameraBtnText}>{image ? "Changer la photo" : "Prendre en photo"}</Text>
                </TouchableOpacity>

                <TextInput 
                    style={styles.input} 
                    placeholder="Ajouter un commentaire..." 
                    value={note} 
                    onChangeText={setNote} 
                    multiline
                />

                <TouchableOpacity 
                    style={[styles.mainBtn, submitting && { opacity: 0.7 }]} 
                    onPress={handleComplete}
                    disabled={submitting}
                >
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainBtnText}>VALIDER LA TÂCHE</Text>}
                </TouchableOpacity>
            </View>
        )}

        {task.note && (
            <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Note :</Text>
                <Text style={styles.noteText}>{task.note}</Text>
            </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  headerSub: { fontSize: 14, color: '#777' },
  weekPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 2 },
  weekBtn: { padding: 8 },
  todayBtn: { paddingHorizontal: 12, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EEE' },
  todayBtnText: { fontSize: 12, fontWeight: 'bold', color: '#205C3B' },
  daySection: { flexDirection: 'row', marginBottom: 20 },
  dayIndicator: { width: 60, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
  dayLabel: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  dateLabel: { color: '#AAA', fontSize: 12 },
  tasksContainer: { flex: 1, paddingLeft: 10 },
  noTaskText: { color: '#CCC', fontStyle: 'italic', marginTop: 10 },
  taskCard: { 
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  myTaskCard: { borderLeftWidth: 5, borderLeftColor: '#205C3B' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 12, color: '#7F8C8D', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  detailContainer: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  backText: { marginLeft: 10, fontWeight: '600', color: '#333' },
  detailCard: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', paddingBottom: 30, elevation: 4 },
  statusRibbon: { paddingVertical: 8, alignItems: 'center' },
  ribbonText: { color: '#fff', fontWeight: 'bold', letterSpacing: 1 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  detailSub: { textAlign: 'center', color: '#666', marginTop: 5 },
  detailDate: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#EEE', marginHorizontal: 20, marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 10 },
  proofImage: { width: '90%', height: 250, alignSelf: 'center', borderRadius: 15, backgroundColor: '#EEE' },
  emptyPhotoBox: { width: '90%', height: 150, alignSelf: 'center', backgroundColor: '#F9F9F9', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  cameraBtn: { backgroundColor: '#3498DB', flexDirection: 'row', width: '90%', alignSelf: 'center', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  cameraBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  input: { width: '90%', alignSelf: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, padding: 15, marginTop: 15, height: 80, textAlignVertical: 'top' },
  mainBtn: { backgroundColor: '#205C3B', width: '90%', alignSelf: 'center', padding: 18, borderRadius: 12, marginTop: 15, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noteBox: { width: '90%', alignSelf: 'center', marginTop: 20, padding: 15, backgroundColor: '#F0F7F4', borderRadius: 12 },
  noteTitle: { fontWeight: 'bold', color: '#205C3B', fontSize: 12 },
  noteText: { color: '#444', marginTop: 5 }
});