const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
let io;

exports.setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

// Créer un message
exports.createMessage = async (req, res) => {
  try {
    const { conversationId, senderId, content } = req.body;

    // Vérifie que la conversation existe
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation non trouvée.' });

    const message = new Message({
      conversationId,
      senderId,
      content
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name avatarUrl')
      .populate('conversationId');

    // Émettre le message via Socket.io
    io.to(conversation._id.toString()).emit('receiveMessage', populatedMessage);

    res.status(201).json(populatedMessage);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de l’envoi du message.' });
  }
};

// Récupérer tous les messages d’une conversation
exports.getMessagesByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name avatarUrl')
      .sort({ sentAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Supprimer un message
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message non trouvé.' });
    res.json({ message: 'Message supprimé.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
