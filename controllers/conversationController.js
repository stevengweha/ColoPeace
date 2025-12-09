const Conversation = require('../models/Conversation');
const Message = require('../models/Message'); // pour peupler les messages si besoin
let io; // défini dans le fichier principal (server.js)

exports.setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

// Créer une conversation entre colocataires
exports.createConversation = async (req, res) => {
  try {
    const { participants } = req.body;

    // Vérifie qu'au moins 2 participants
    if (!participants || participants.length < 2) {
      return res.status(400).json({ message: 'Au moins 2 participants sont requis.' });
    }

    // Vérifie si une conversation avec ces participants existe déjà
    let conversation = await Conversation.findOne({
      participants: { $all: participants, $size: participants.length }
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants });
    }

    res.status(201).json(conversation);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer toutes les conversations
exports.getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find().populate('participants', 'name avatarUrl');
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer une conversation par ID
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'name avatarUrl');
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour une conversation
exports.updateConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });
    res.json(conversation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprimer une conversation
exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation non trouvée' });
    res.json({ message: 'Conversation supprimée.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
