const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Middlewares globaux
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// ==================
// Import des routes
// ==================
const authRoutes = require('./routes/authRoutes');
const userController = require('./controllers/userController');
const taskController = require('./controllers/TaskController');
const conversationController = require('./controllers/conversationController');
const messageController = require('./controllers/messageController');

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
// 💡 NOUVELLE ROUTE : Obtenir le rapport d'équité global
app.get('/api/tasks/report/equity', taskController.getEquityReport); 

// 💡 NOUVELLE ROUTE : Déclenchement manuel ou CRON pour marquer les tâches manquées
app.post('/api/tasks/mark-missed', taskController.markMissedTasks);

// Routes conversations
app.post('/api/conversations', conversationController.createConversation);
app.get('/api/conversations', conversationController.getAllConversations);
app.get('/api/conversations/:id', conversationController.getConversationById);
app.put('/api/conversations/:id', conversationController.updateConversation);
app.delete('/api/conversations/:id', conversationController.deleteConversation);

// Routes messages
app.post('/api/messages', messageController.createMessage);
app.get('/api/messages/conversation/:conversationId', messageController.getMessagesByConversation);
app.delete('/api/messages/:id', messageController.deleteMessage);

// ==================
// Socket.io
// ==================
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });
messageController.setSocketIo(io);
conversationController.setSocketIo(io);

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté :', socket.id);

  socket.on('userOnline', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('userOnlineStatus', Array.from(onlineUsers.keys()));
  });

  socket.on('sendMessage', (message) => {
    io.to(message.conversationId).emit('receiveMessage', message);
  });

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('typing', { userId });
  });

  socket.on('seen', ({ conversationId, messageId, userId }) => {
    socket.to(conversationId).emit('seen', { messageId, userId });
  });

  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('disconnect', () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) onlineUsers.delete(userId);
    }
    io.emit('userOnlineStatus', Array.from(onlineUsers.keys()));
    console.log('Utilisateur déconnecté :', socket.id);
  });
});

// Route test
app.get('/', (req, res) => res.send('✅ ColoPeace API'));

server.listen(5001, '0.0.0.0', () => console.log('🚀 Serveur démarré sur http://localhost:5001'));
