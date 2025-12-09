const Task = require("../models/Task");
const User = require("../models/User");
const TaskHistory = require("../models/TaskHistory");
const moment = require("moment"); 

// --- Fonctions d'Utilité ---

/**
 * 🔵 Vérifier si les tâches de la semaine existent déjà
 */
async function weekAlreadyGenerated(weekNumber, year) {
  const existing = await Task.find({ weekNumber, year });
  return existing.length > 0;
}

/**
 * 🔵 Calcule la date limite (dueDate) pour une tâche
 * @param {number} weekNumber Numéro de la semaine ISO
 * @param {number} year Année
 * @param {number} taskIndex Index de la tâche (0=Lundi, 1=Mardi, 2=Mercredi, 3=Jeudi)
 * @returns {Date} Date limite à la fin du jour attribué.
 */
function calculateDueDate(weekNumber, year, taskIndex) {
  // Utilise moment pour gérer correctement les semaines ISO
  const weekStart = moment().year(year).isoWeek(weekNumber).startOf('isoWeek'); // Lundi de la semaine

  // dueDate est à minuit (23:59:59) du jour attribué (Lundi + taskIndex)
  const dueDate = weekStart.add(taskIndex, 'days').endOf('day').toDate();
  return dueDate;
}

/**
 * 🔵 Trouver l'utilisateur avec la charge de travail historique la plus faible
 * @param {Array<User>} users Liste des utilisateurs
 * @returns {User} L'utilisateur ayant le moins de tâches assignées historiquement.
 */
async function findUserWithLowestLoad(users) {
  // 1. Récupérer le compte de tâches assignées pour chaque utilisateur
  const userLoad = await Task.aggregate([
    { $match: { assignedTo: { $in: users.map(u => u._id) } } },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);

  const loadMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: 0 }), {});
  userLoad.forEach(item => {
    loadMap[item._id.toString()] = item.count;
  });

  let lowestLoad = Infinity;
  let eligibleUser = users[0];

  // Parcours les utilisateurs (déjà mélangés initialement si c'est la première tâche)
  for (const user of users) { 
    const currentLoad = loadMap[user._id.toString()];
    if (currentLoad < lowestLoad) {
      lowestLoad = currentLoad;
      eligibleUser = user;
    }
  }
  return eligibleUser;
}


// --- Fonctions d'API (Exports) ---

/**
 * 🔵 Générer automatiquement les 4 tâches de la semaine (ÉQUITÉ PAR CHARGE MINIMALE)
 */
exports.generateWeeklyTasks = async (req, res) => {
  try {
    const weekNumber = req.body.weekNumber || moment().isoWeek();
    const year = req.body.year || moment().isoWeekYear();

    if (await weekAlreadyGenerated(weekNumber, year)) {
      return res.status(400).json({ error: "Les tâches de cette semaine existent déjà." });
    }

    const users = await User.find();
    if (users.length < 4) {
      return res.status(400).json({ error: "Il faut 4 utilisateurs pour générer les tâches." });
    }

    const taskNames = ["Sol", "Cuisine", "Douche", "Toilettes"];
    const tasks = [];

    // 💡 Les utilisateurs sont mélangés une fois pour briser les égalités de charge minimale
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5); 
    
    for (let i = 0; i < taskNames.length; i++) {
      const taskName = taskNames[i];

      // 🎯 Logique d'ÉQUITÉ: Choix de l'utilisateur avec la charge la plus faible
      const assignedUser = await findUserWithLowestLoad(shuffledUsers); 
      
      // 🎯 DATE FIXE DU BACKEND
      const dueDate = calculateDueDate(weekNumber, year, i);

      const task = await Task.create({
        name: taskName,
        assignedTo: assignedUser._id,
        weekNumber,
        year,
        dueDate, // Le backend impose la date
        status: "pending"
      });

      await TaskHistory.create({
        userId: assignedUser._id,
        taskName,
        weekNumber,
        year,
        action: "assigned"
      });

      tasks.push(task);
    }

    res.status(201).json({
      message: "Tâches hebdomadaires générées et attribuées équitablement.",
      tasks
    });

  } catch (err) {
    console.error("Erreur generateWeeklyTasks:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Marquer une tâche comme complétée (avec vérification de la date et de la preuve)
 */
exports.completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { proofImage, note } = req.body; 

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: "Tâche non trouvée" });

    // 🎯 EXIGENCE: Exiger la preuve pour la confirmation
    if (!proofImage) {
      return res.status(400).json({ error: "La preuve (proofImage) est requise pour valider la tâche." });
    }

    // Limiter la complétion aux tâches en cours
    if (task.status !== 'pending') {
      return res.status(400).json({ error: `La tâche a déjà le statut: ${task.status}` });
    }

    const completionTime = new Date();
    
    // 🎯 VÉRIFICATION DE LA DATE LIMITE
    if (completionTime > task.dueDate) {
      // NOTE: Votre modèle doit autoriser le statut 'late' si vous utilisez cette logique.
      // Si non, le statut restera 'done' mais la vérification du délai est visible dans le rapport.
      task.status = "done"; // Statut basé sur votre modèle actuel
      task.isLate = true; // Champ temporaire pour le rapport si 'late' n'est pas dans l'enum
    } else {
      task.status = "done"; 
      task.isLate = false;
    }

    task.doneAt = completionTime;
    task.proofImage = proofImage;
    task.note = note || task.note;

    await task.save();

    // Enregistrement dans l'historique (plus précis pour le rapport)
    await TaskHistory.create({
      userId: task.assignedTo,
      taskName: task.name,
      weekNumber: task.weekNumber,
      year: task.year,
      action: task.isLate ? "completed_late" : "completed_on_time", 
      meta: { proofImage, completionTime }
    });

    res.json({
      message: `Tâche complétée ${task.isLate ? '(en retard)' : '(à temps)'} avec succès.`,
      task
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Tâches manquées : Marquer les tâches en retard qui n'ont pas été faites (CRON)
 */
exports.markMissedTasks = async () => {
  try {
    const now = new Date();

    // Trouver les tâches 'pending' dont la dueDate est passée
    const missedTasks = await Task.find({
      status: 'pending',
      dueDate: { $lt: now } 
    });

    for (const task of missedTasks) {
      // NOTE: Si 'missed' n'est pas dans votre enum Mongoose, le statut restera 'pending',
      // mais le rapport les traitera comme manquées. Si vous mettez à jour l'enum, changez ceci:
      // task.status = 'missed'; 
      await task.save();

      await TaskHistory.create({
        userId: task.assignedTo,
        taskName: task.name,
        weekNumber: task.weekNumber,
        year: task.year,
        action: "missed_deadline",
      });
    }

    console.log(`${missedTasks.length} tâche(s) passée(s) la date limite marquée(s) comme manquée(s) dans l'historique.`);
    return missedTasks.length;
  } catch (err) {
    console.error("Erreur markMissedTasks:", err);
    return 0;
  }
};


/**
 * 🔵 Obtenir toutes les tâches d'une semaine donnée
 */
exports.getWeeklyTasks = async (req, res) => {
  try {
    const { weekNumber, year } = req.params;

    const tasks = await Task.find({ weekNumber, year })
      .populate("assignedTo", "name avatarUrl");

    res.json(tasks);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Rapport d'équité et de performance
 */
exports.getEquityReport = async (req, res) => {
  try {
    const now = new Date();
    
    // Agrégation pour calculer la performance par utilisateur
    const report = await Task.aggregate([
      { 
        $match: {} // Inclure toutes les tâches historiques
      },
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          // Si status='done' ET doneAt <= dueDate
          doneOnTime: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "done"] }, { $lte: ["$doneAt", "$dueDate"] }] }, 1, 0] } },
          // Si status='done' ET doneAt > dueDate
          late: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "done"] }, { $gt: ["$doneAt", "$dueDate"] }] }, 1, 0] } },
          // Si status='pending' ET dueDate < now
          missed: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "pending"] }, { $lt: ["$dueDate", now] }] }, 1, 0] } },
        },
      },
      {
        $lookup: { 
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          name: "$user.name",
          totalAssigned: 1,
          doneOnTime: 1,
          late: 1,
          missed: 1,
          successRate: { 
            $divide: [{ $add: ["$doneOnTime", "$late"] }, "$totalAssigned"] 
          }
        }
      }
    ]);

    res.json(report);

  } catch (err) {
    console.error("Erreur getEquityReport:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔵 Récupérer les tâches d'un utilisateur
 */
exports.getTasksByUser = async (req, res) => {
  // ... (Code inchangé) ...
  try {
    const tasks = await Task.find({ assignedTo: req.params.userId })
      .populate("assignedTo", "name avatarUrl")
      .lean();

    // Ajoute une date par défaut si manquante
    tasks.forEach(t => {
      if (!t.dueDate) t.dueDate = new Date().toISOString();
    });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * 🔵 Supprimer une tâche
 */
exports.deleteTask = async (req, res) => {
  // ... (Code inchangé) ...
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Tâche non trouvée" });

    res.json({ message: "Tâche supprimée avec succès" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};