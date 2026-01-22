require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Import des modèles (Vérifie bien tes chemins)
const User = require("../models/User");
const Task = require("../models/Task");
const TaskHistory = require("../models/TaskHistory");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// Règle de points identique au backend
const POINTS = {
    ON_TIME: 10,
    LATE: 5,
    PENDING: 0
};

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connecté pour seeding réaliste"))
    .catch((err) => console.error(err));

// --- Utilitaires ---

function getDateOfISOWeek(week, year) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = new Date(simple);
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    ISOweekStart.setHours(12, 0, 0, 0);
    return ISOweekStart;
}

// --- Script de Seeding ---

async function seed() {
    try {
        // 1. Nettoyage total
        await User.deleteMany();
        await Task.deleteMany();
        await TaskHistory.deleteMany();
        await Conversation.deleteMany();
        await Message.deleteMany();
        console.log("🗑️ Base de données vidée");

        // 2. Création des 4 Utilisateurs
        const users = await User.insertMany([
            { name: "Alice Dupont", email: "alice@example.com", password: await bcrypt.hash("password123", 10), avatarUrl: "https://ui-avatars.com/api/?name=Alice+Dupont" },
            { name: "Bob Martin", email: "bob@example.com", password: await bcrypt.hash("password123", 10), avatarUrl: "https://ui-avatars.com/api/?name=Bob+Martin" },
            { name: "Charlie Durand", email: "charlie@example.com", password: await bcrypt.hash("password123", 10), avatarUrl: "https://ui-avatars.com/api/?name=Charlie+Durand" },
            { name: "David Lemoine", email: "david@example.com", password: await bcrypt.hash("password123", 10), avatarUrl: "https://ui-avatars.com/api/?name=David+Lemoine" },
        ]);
        console.log("✅ 4 utilisateurs créés");

        // 3. Génération de 30 tâches avec SCORES et HISTORIQUE
        const taskNames = ["Sol", "Cuisine", "Douche", "Toilettes"];
        const year = 2026; // On se place en 2026 pour être raccord avec le présent
        let tasksToInsert = [];
        let historyToInsert = [];

        for (let i = 0; i < 30; i++) {
            const randomUser = users[i % users.length];
            const name = taskNames[i % taskNames.length];
            const weekNumber = Math.floor(Math.random() * 4) + 1; // Semaines 1 à 4 de 2026

            // Déterminer le statut et le score
            // 70% de chance d'être fait, et parmi les faits, 30% de retard
            const isDone = Math.random() > 0.3;
            const isLate = Math.random() > 0.7;
            
            let status = "pending";
            let taskScore = POINTS.PENDING;
            
            if (isDone) {
                status = "done";
                taskScore = isLate ? POINTS.LATE : POINTS.ON_TIME;
            }

            const monday = getDateOfISOWeek(weekNumber, year);
            const dueDate = new Date(monday.getTime() + (i % 7) * 86400000);

            // Objet Tâche
            const taskObj = {
                name,
                assignedTo: randomUser._id,
                weekNumber,
                year,
                status,
                dueDate,
                doneAt: isDone ? new Date(dueDate.getTime() + 3600000) : null, // Fait 1h après la deadline
                score: taskScore, // 🔔 CRUCIAL : Le score est injecté ici
                note: isDone ? "Ménage effectué via seeder" : null,
                proofImage: isDone ? "https://picsum.photos/200" : null
            };

            tasksToInsert.push(taskObj);

            // 🔔 COHÉRENCE : On crée l'historique correspondant
            if (isDone) {
                historyToInsert.push({
                    userId: randomUser._id,
                    taskName: name,
                    weekNumber,
                    year,
                    action: isLate ? "completed_late" : "completed_on_time",
                    score: taskScore
                });
            }
        }

        await Task.insertMany(tasksToInsert);
        await TaskHistory.insertMany(historyToInsert);
        console.log("✅ 30 tâches et Historiques synchronisés");

        // 4. Conversations (Inchangé)
        const conv = await Conversation.create({ participants: [users[0]._id, users[1]._id] });
        await Message.create({
            conversationId: conv._id,
            senderId: users[0]._id,
            content: "Salut ! Les scores sont enfin à jour ?"
        });

        console.log("🎉 SEEDING RÉUSSI : Tes stats vont enfin s'afficher !");
        process.exit();
    } catch (err) {
        console.error("❌ Erreur seeder :", err);
        process.exit(1);
    }
}

seed();