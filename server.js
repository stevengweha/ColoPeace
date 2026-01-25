const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron'); // Import déplacé en haut
const uploadCloudinary = require('./middleware/cloudinaryConfig');
const cloudinary = require('cloudinary').v2;

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
app.post('/api/users/upload-avatar/:id', uploadCloudinary.single('avatar'), userController.updateAvatar);

// Routes tâches
app.post('/api/tasks/generate-weekly', taskController.generateWeeklyTasks);
app.get('/api/tasks/week/:weekNumber/:year', taskController.getWeeklyTasks);
app.put('/api/tasks/complete/:taskId',uploadCloudinary.single('proofImage'), taskController.completeTask);
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
app.post('/api/messages/mark-read', messageController.markMessagesAsRead);

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
  socket.on('readMessages', async (data) => {
    // data: { conversationId, userId }
    const { conversationId, userId } = data;


    socket.to(data.conversationId.toString()).emit('markMessagesAsRead', data);

    // 2. On enregistre dans MongoDB (on marque comme lu tout ce qui n'est pas à nous)
  try {
    const Message = require('./models/Message'); // Vérifie bien le chemin
    await Message.updateMany(
      { 
        conversationId: conversationId, 
        senderId: { $ne: userId }, 
        readAt: null 
      },
      { $set: { readAt: new Date() } }
    );
    console.log(`✅ Messages marqués comme lus dans la conversation ${data.conversationId} par l'utilisateur ${data.userId}`);
  } catch (err) {
    console.error("Erreur mise à jour lecture:", err);
  }
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

app.get('/api/debug-cloudinary', async (req, res) => {
  const cloudinary = require('cloudinary').v2;
  // On injecte les clés DIRECTEMENT ici
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
  });
  try {
    // On vérifie si la config a bien "mordu"
    const configCheck = cloudinary.config();
    if (!configCheck.api_key) {
       return res.status(500).json({ error: "La config a échoué à l'injection" });
    }
    const result = await cloudinary.uploader.upload("https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png");
    res.json({ message: "ENFIN !", url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: "Toujours pas...", detail: err.message });
  }
});

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

const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSMongoose = require('@adminjs/mongoose');
const session = require('express-session');

AdminJS.registerAdapter(AdminJSMongoose);

const startAdmin = async () => {
  // On s'assure que les modèles sont bien chargés avant de lancer AdminJS
  const User = require('./models/User');
  const Task = require('./models/Task');
  const Conversation = require('./models/Conversation');
  const Message = require('./models/Message');
  const AccessCode = require('./models/AccessCode');

  const adminOptions = {
    resources: [
      { resource: User },
      { resource: Task },
      { resource: Conversation },
      { resource: Message },
      { resource: AccessCode }
    ],
    rootPath: '/admin',
    branding: { companyName: 'ColoPeace Admin' }
  };

  const admin = new AdminJS(adminOptions);

  // Construction du routeur authentifié
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) => {
      if (email === process.env.ADMINUSER && password === process.env.ADMINPASSWORD) {
        return { email };
      }
      return null;
    },
    cookiePassword: 'un-password-tres-long-pour-la-securite-des-cookies',
  }, null, {
    resave: false,
    saveUninitialized: true,
    secret: 'secret-session-colopeace',
    cookie: { httpOnly: true, secure: false } // mettre secure: true en production (HTTPS)
  });

  app.use(admin.options.rootPath, adminRouter);
  console.log(`🚀 AdminJS configuré sur http://localhost:5001/admin`);
};

startAdmin();

// Lancement du serveur
const PORT = 5001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 Serveur démarré !
    🌍 URL: http://localhost:${PORT}
    📡 Socket.io: Prêt
    ⏰ Cron Jobs: Configurés
    `);
    console.log("Cloud Name Check:", process.env.CLOUDINARY_NAME);
console.log("API Key Check:", process.env.CLOUDINARY_KEY);
});