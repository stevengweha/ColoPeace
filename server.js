const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron'); // Import déplacé en haut

dotenv.config();
const app = express();
const server = http.createServer(app);

// Middlewares globaux
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==================
// Socket.io Setup
// ==================
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

// 🔥 TRÈS IMPORTANT : Permet aux contrôleurs d'accéder à "io" via req.app.get('socketio')
app.set('socketio', io);

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// ==================
// Import des routes & controllers
// ==================
const authRoutes = require('./routes/authRoutes');
const userController = require('./controllers/userController');
const taskController = require('./controllers/TaskController');
const conversationController = require('./controllers/conversationController');
const messageController = require('./controllers/messageController');

// ==================
// Définition des routes
// ============

// Injection de Socket.io dans les contrôleurs
messageController.setSocketIo(io);
conversationController.setSocketIo(io);
// Si ton taskController a aussi besoin d'une instance directe (optionnel si tu utilises app.get) :
taskController.setSocketIo(io); 

app.use('/api/auth', authRoutes);

// Routes utilisateurs
app.post('/api/users', userController.createUser);
app.get('/api/users', userController.getAllUsers);
app.get('/api/users/:id', userController.getUserById);
app.put('/api/users/:id', userController.updateUser);
app.delete('/api/users/:id', userController.deleteUser);

// Routes tâches
app.post('/api/tasks/generate-weekly', taskController.generateWeeklyTasks);
app.get('/api/tasks/week/:weekNumber/:year', taskController.getWeeklyTasks);
app.put('/api/tasks/complete/:taskId', taskController.completeTask);
app.get('/api/tasks/user/:userId', taskController.getTasksByUser);
app.get('/api/tasks/report/equity', taskController.getEquityReport); 
app.get('/api/tasks/user/:userId/stats', taskController.getUserStats); 
app.delete('/api/tasks/:id', taskController.deleteTask);
app.post('/api/tasks/mark-missed', taskController.markMissedTasks);

// Routes conversations
app.post('/api/conversations', conversationController.createConversation);
app.get('/api/conversations', conversationController.getAllConversations);
app.get('/api/conversations/:id', conversationController.getConversationById);
app.put('/api/conversations/:id', conversationController.updateConversation);
app.delete('/api/conversations/:id', conversationController.deleteConversation);
app.get('/api/conversations/user/:userId', conversationController.getConversationsByUser);

// Routes messages
app.post('/api/messages', messageController.createMessage);
app.get('/api/messages/conversation/:conversationId', messageController.getMessagesByConversation);
app.delete('/api/messages/:id', messageController.deleteMessage);

// route notification subscription
app.post('/api/users/subscribe', userController.savePushSubscription);

// ==================
// Logique Socket.io (server.js)
// ==================
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Nouveau socket connecté :', socket.id);

  socket.on('userOnline', (userId) => {
    onlineUsers.set(userId.toString(), socket.id);
    io.emit('userOnlineStatus', Array.from(onlineUsers.keys()));
  });

  socket.on('joinConversation', (conversationId) => {
    const room = conversationId.toString();
    socket.join(room);
    console.log(`👥 Room rejointe : ${room}`);
  });

  // ✍️ Gestion de l'écriture
  socket.on('typing', (data) => {
    // data: { conversationId, userId, typing: true/false }
    socket.to(data.conversationId.toString()).emit('displayTyping', data);
  });

  // ✅ Gestion de la lecture
  socket.on('readMessages', (data) => {
    // data: { conversationId, userId }
    socket.to(data.conversationId.toString()).emit('markMessagesAsRead', data);
    // mettre a jour en base read
    const Message = require('./models/Message');
    const result = Message.updateMany(
      { conversationId: data.conversationId, senderId: { $ne: data.userId }, readAt: null },
      { $set: { readAt: new Date() } }
    ).exec();

  });

  socket.on('disconnect', () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) onlineUsers.delete(userId);
    }
    io.emit('userOnlineStatus', Array.from(onlineUsers.keys()));
  });
});

// ==================
// Cron Jobs (Emails)
// ==================
const Task = require('./models/Task');
const { sendTaskReminder } = require('./services/emailService');

// Rappel quotidien à 08:00
cron.schedule('0 8 * * *', async () => {
  console.log("⏰ Exécution des rappels email...");
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const tasksDueToday = await Task.find({ 
    dueDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    status: 'pending' 
  }).populate('assignedTo');

  tasksDueToday.forEach(task => {
    if (task.assignedTo && task.assignedTo.email) {
      sendTaskReminder(task.assignedTo.email, task.assignedTo.name, task.name);
    }
  });
});

// Route test
app.get('/', (req, res) => res.send('✅ ColoPeace API is running'));

// ==================
// Route temporaire de test (à supprimer après)
// ✅ Route de test dynamique via Postman
app.post('/test-email', async (req, res) => {
  const { sendTaskReminder } = require('./services/emailService');
  
  // On récupère les données envoyées depuis Postman
  const { email, name, taskName } = req.body;

  // Petite vérification de sécurité
  if (!email) {
    return res.status(400).json({ error: "L'email est requis dans le body" });
  }

  try {
    await sendTaskReminder(
      email, 
      name || 'Utilisateur Test', 
      taskName || 'Tâche de test'
    );
    
    console.log(`📧 Email de test envoyé à : ${email}`);
    res.json({ message: `Email de test envoyé avec succès à ${email} !` });
  } catch (err) {
    console.error("❌ Échec de l'envoi :", err);
    res.status(500).json({ error: err.message });
  }
});

// gestion des notificatioms


// Lancement du serveur
const PORT = 5001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 Serveur démarré !
    🌍 URL: http://localhost:${PORT}
    📡 Socket.io: Prêt
    ⏰ Cron Jobs: Configurés
    `);
});