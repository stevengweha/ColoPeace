require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Task = require("../models/Task");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error(err));

function getDateOfISOWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  ISOweekStart.setHours(12, 0, 0, 0);
  return ISOweekStart;
}

function randomStatus() {
  const list = ["pending", "done", "late", "missed"];
  return list[Math.floor(Math.random() * list.length)];
}

function randomNote() {
  const notes = [
    "RAS",
    "Bien fait 👍",
    "À vérifier",
    "Nettoyage rapide",
    "Manque un peu de soin",
    null,
    null,
    null,
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

async function seed() {
  try {
    await User.deleteMany();
    await Task.deleteMany();
    await Conversation.deleteMany();
    await Message.deleteMany();
    console.log("🗑️ Anciennes données supprimées");

    // 1️⃣ USERS
    const users = await User.insertMany([
      {
        name: "Alice Dupont",
        email: "alice@example.com",
        password: await bcrypt.hash("password1", 10),
        phone: "0600000001",
      },
      {
        name: "Bob Martin",
        email: "bob@example.com",
        password: await bcrypt.hash("password2", 10),
        phone: "0600000002",
      },
      {
        name: "Charlie Durand",
        email: "charlie@example.com",
        password: await bcrypt.hash("password3", 10),
        phone: "0600000003",
      },
      {
        name: "David Lemoine",
        email: "david@example.com",
        password: await bcrypt.hash("password4", 10),
        phone: "0600000004",
      },
    ]);
    console.log("✅ 4 utilisateurs créés");

    // 2️⃣ 30 TASKS valides
    const taskNames = ["Sol", "Cuisine", "Douche", "Toilettes"];
    const totalTasks = 30;
    let tasksToInsert = [];

    for (let i = 0; i < totalTasks; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const name = taskNames[Math.floor(Math.random() * taskNames.length)];

      // S'assurer que weekNumber <= 53
      const weekNumber = Math.floor(Math.random() * 9) + 45; // semaines 45 → 53
      const year = 2025;

      const monday = getDateOfISOWeek(weekNumber, year);
      const dueDate = new Date(monday.getTime() + (i % 4) * 86400000);

      const status = randomStatus();

      tasksToInsert.push({
        name,
        assignedTo: randomUser._id,
        weekNumber,
        year,
        status,
        proofImage: null,
        note: randomNote(),
        dueDate,
        doneAt: status === "done" ? new Date() : null,
      });
    }

    await Task.insertMany(tasksToInsert);
    console.log("✅ 30 tâches générées avec succès");

    // 3️⃣ SIMPLE CONVERSATIONS + MESSAGES
    const conv = await Conversation.insertMany([
      { participants: [users[0]._id, users[1]._id] },
      { participants: [users[2]._id, users[3]._id] },
    ]);

    await Message.insertMany([
      {
        conversationId: conv[0]._id,
        senderId: users[0]._id,
        receiverId: users[1]._id,
        content: "Yo ! Le ménage avance ? 😄",
      },
      {
        conversationId: conv[1]._id,
        senderId: users[2]._id,
        receiverId: users[3]._id,
        content: "On se fait la vaisselle ensemble ? 🍽️",
      },
    ]);

    console.log("💬 Conversations & messages créés");
    console.log("🎉 SEEDER MASSIF TERMINÉ !");
    process.exit();
  } catch (err) {
    console.error("❌ Erreur seeder :", err);
    process.exit(1);
  }
}

seed();
