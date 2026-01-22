const Task = require("../models/Task");
const User = require("../models/User");
const TaskHistory = require("../models/TaskHistory");
const moment = require("moment");
const mongoose = require("mongoose");
let io;
const notificationService = require("../services/notification");

exports.setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

// --- 1. CONFIGURATION UNIQUE DES POINTS ---
// Si tu veux changer les points un jour, tu le fais ici et c'est tout.
const POINT_SYSTEM = {
  ON_TIME: 10,
  LATE: 5,
  ASSIGNED: 0,
  MISSED: 0
};

// --- 2. FONCTIONS D'UTILITÉ ---

const calculateEarnedScore = (isLate) => (isLate ? POINT_SYSTEM.LATE : POINT_SYSTEM.ON_TIME);

async function findUserWithLowestLoad(users) {
  const userLoad = await Task.aggregate([
    { $match: { assignedTo: { $in: users.map(u => u._id) } } },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);

  const loadMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: 0 }), {});
  userLoad.forEach(item => { loadMap[item._id.toString()] = item.count; });

  return users.reduce((prev, curr) => 
    (loadMap[curr._id.toString()] < loadMap[prev._id.toString()] ? curr : prev)
  );
}

// --- 3. EXPORTS DES FONCTIONS D'API ---

/**
 * 🔵 Générer automatiquement les tâches de la semaine
 */
exports.generateWeeklyTasks = async (req, res) => {
  try {
    const weekNumber = req.body.weekNumber || moment().isoWeek();
    const year = req.body.year || moment().isoWeekYear();
    const socketIo = req.app.get('socketio') || io; // Sécurité double instance

    const existing = await Task.findOne({ weekNumber, year });
    if (existing) return res.status(400).json({ error: "Les tâches de cette semaine existent déjà." });

    const users = await User.find();
    if (users.length < 4) return res.status(400).json({ error: "Il faut 4 utilisateurs." });

    const taskNames = ["Sol", "Cuisine", "Douche", "Toilettes"];
    const tasks = [];
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5); 
    
    for (let i = 0; i < taskNames.length; i++) {
      const assignedUser = await findUserWithLowestLoad(shuffledUsers); 
      const dueDate = moment().year(year).isoWeek(weekNumber).startOf('isoWeek').add(i, 'days').endOf('day').toDate();

      const task = await Task.create({
        name: taskNames[i],
        assignedTo: assignedUser._id,
        weekNumber,
        year,
        dueDate,
        status: "pending",
        score: POINT_SYSTEM.ASSIGNED // Initialisé à 0
      });

      // Historique de l'assignation (Pas de complétion ici !)
      await TaskHistory.create({
        userId: assignedUser._id,
        taskName: task.name,
        weekNumber,
        year,
        action: "task_assigned",
        score: POINT_SYSTEM.ASSIGNED
      });

      const payload = {
        title: "Nouvelle tâche ! 📋",
        body: `Tu es responsable de : ${task.name}`,
        type: "task",
        url: "/tasks"
      };

      if (io) {
        io.emit(`notification_${assignedUser._id}`, payload);
        console.log("Emission notification tâche assignée");
      }
      notificationService.sendNotification(assignedUser._id, payload)
        .catch(err => console.error("❌ Erreur Web Push silencieuse:", err));
        console.log("Envoi notification tâche assignée via Web Push", payload);
      tasks.push(task);
    }
    if (io) {
    const globalPayload = {
      title: "Planning prêt ! 🗓️",
      body: "Les tâches de la semaine ont été distribuées. Allez voir !",
      type: "task",
      url: "/tasks"
    };
    io.emit("notification_global", globalPayload);
    console.log("📢 Notification globale du planning envoyée");
    }
    

    res.status(201).json({ message: "Tâches générées.", tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Marquer une tâche comme complétée
 */
exports.completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { proofImage, note } = req.body; 
    const task = await Task.findById(taskId).populate("assignedTo", "name");
    if (!task || task.status !== 'pending') {
        return res.status(400).json({ error: "Tâche introuvable ou déjà validée." });
    }

    if (!proofImage) return res.status(400).json({ error: "Preuve image requise." });

    const completionTime = new Date();
    const isLate = completionTime > task.dueDate;
    const earnedScore = calculateEarnedScore(isLate);

    // Mise à jour de la tâche avec le score définitif
    task.status = "done";
    task.doneAt = completionTime;
    task.proofImage = proofImage;
    task.note = note || "";
    task.score = earnedScore; 
    await task.save();

    // Enregistrement dans l'historique
    await TaskHistory.create({
      userId: task.assignedTo._id,
      taskName: task.name,
      weekNumber: task.weekNumber,
      year: task.year,
      action: isLate ? "completed_late" : "completed_on_time", 
      score: earnedScore,
      meta: { proofImage, completionTime }
    });

    const payload = {
      title: "Tâche terminée ! ✅",
        body: `${task.assignedTo.name} a fini ${task.name} (+${earnedScore} pts)`,
        type: "task_done",
        url: "/tasks"
    };

    if (io) {
      // 1. Alerte instantanée pour ceux qui ont l'app ouverte
      io.emit("notification_global", payload);
      console.log("📢 Socket: Notification globale envoyée");
    }

    try {
      // 2. WEB PUSH : On récupère tous les utilisateurs
      // Optionnel : tu peux exclure celui qui a fait la tâche avec { _id: { $ne: task.assignedTo._id } }
      const allUsers = await User.find({ _id: { $ne: task.assignedTo._id } });

      // On envoie le push à tout le monde en parallèle
      allUsers.forEach(u => {
        notificationService.sendNotification(u._id, payload)
          .catch(err => console.log(`Push ignoré pour ${u._id} (pas d'abonnement)`));
      });
      
      console.log(`📡 Web Push: Tentative d'envoi à ${allUsers.length} utilisateurs`);
    } catch (err) {
      console.error("❌ Erreur lors de la récupération des users pour le push:", err);
    }

    res.json({ message: "Tâche validée.", task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Stats Dashboard (Rapide via somme du champ score)
 */
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "ID invalide" });

    const stats = await Task.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(userId) } },
      { $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          score: { $sum: "$score" }, // Somme directe du champ score
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } }
      }}
    ]);

    res.json(stats[0] || { totalAssigned: 0, done: 0, score: 0, pending: 0 });
  } catch (err) {
    res.status(500).json({ error: "Erreur stats." });
  }
};

/**
 * 🔵 Classement global
 */
exports.getEquityReport = async (req, res) => {
  try {
    const report = await Task.aggregate([
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          score: { $sum: "$score" },
          doneCount: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          // 🎯 On compte les retards en regardant qui a reçu 5 points
          lateCount: { 
            $sum: { $cond: [{ $and: [{ $eq: ["$status", "done"] }, { $eq: ["$score", 5] }] }, 1, 0] } 
          },
          // 🎯 On compte les "à temps" en regardant qui a reçu 10 points
          onTimeCount: { 
            $sum: { $cond: [{ $and: [{ $eq: ["$status", "done"] }, { $eq: ["$score", 10] }] }, 1, 0] } 
          }
        }
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: {
          _id: 0,
          name: "$user.name",
          avatar: "$user.avatarUrl",
          score: 1,
          doneOnTime: "$onTimeCount", // 🎯 Envoi au Front
          late: "$lateCount",         // 🎯 Envoi au Front
          totalAssigned: 1,
          successRate: { 
            $cond: [{ $gt: ["$totalAssigned", 0] }, { $divide: ["$doneCount", "$totalAssigned"] }, 0] 
          }
      }},
      { $sort: { score: -1 } }
    ]);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Récupérer les tâches d'un utilisateur
 */
exports.getTasksByUser = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.userId })
      .sort({ dueDate: 1 })
      .populate("assignedTo", "name avatarUrl")
      .lean();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Obtenir toutes les tâches d'une semaine
 */
exports.getWeeklyTasks = async (req, res) => {
  try {
    const { weekNumber, year } = req.params;
    const tasks = await Task.find({ weekNumber, year }).populate("assignedTo", "name avatarUrl");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Supprimer une tâche
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Tâche non trouvée" });
    res.json({ message: "Tâche supprimée." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Gestion des tâches manquées
 */
exports.markMissedTasks = async (req, res) => {
  try {
    const missedTasks = await Task.find({ status: 'pending', dueDate: { $lt: new Date() } });

    for (const task of missedTasks) {
      await TaskHistory.create({
        userId: task.assignedTo,
        taskName: task.name,
        weekNumber: task.weekNumber,
        year: task.year,
        action: "missed_deadline",
        score: POINT_SYSTEM.MISSED
      });
      // Optionnel: task.status = 'missed'; await task.save();
    }
    if (res) return res.json({ message: "Vérification terminée", missedCount: missedTasks.length });
    return missedTasks.length;
  } catch (err) {
    if (res) return res.status(500).json({ error: err.message });
  }
};