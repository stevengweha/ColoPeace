const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const notificationService = require('../services/notification');
let io;

// Permet de lier l'instance Socket.io au contrôleur
exports.setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

exports.createMessage = async (req, res) => {
  try {
    const { conversationId, senderId, content } = req.body;

    // 1. Vérification de la conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation non trouvée.' });

    // 2. Création et sauvegarde du message
    const message = new Message({
      conversationId,
      senderId,
      content
    });
    await message.save();

    // 3. Récupération des infos complètes (nom de l'expéditeur, etc.)
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name avatarUrl')
      .populate('conversationId');

    // 4. SIGNAL 1 : Envoi en temps réel dans la discussion
    io.to(conversation._id.toString()).emit('receiveMessage', populatedMessage);

    // 5. SIGNAL 2 : Notification Flash pour le destinataire
    const recipientId = conversation.participants.find(
      (p) => p.toString() !== senderId.toString()
    );

   if (recipientId) {
      // ON DÉFINIT LE PAYLOAD ICI POUR LES DEUX SERVICES
      const payload = {
        title: `Nouveau message de ${populatedMessage.senderId.name} 💬`,
        body: content.length > 60 ? content.substring(0, 60) + "..." : content,
        type: "chat",
        conversationId: conversation._id,
        url: `/chat/${conversation._id}`
      };

      // 1. SIGNAL SOCKET
      if (io) {
        io.emit(`notification_${recipientId}`, payload);
      }

      // 2. SIGNAL WEB PUSH
      notificationService.sendNotification(recipientId, payload)
        .catch(err => console.error("❌ Erreur Web Push silencieuse:", err));
            console.log("Message créé et notifications envoyées.", payload);

    }
    res.status(201).json(populatedMessage);

  } catch (err) {
    console.error("Erreur message:", err);
    res.status(500).json({ message: 'Erreur lors de l’envoi du message.' });
  }
};

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

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message non trouvé.' });
    res.json({ message: 'Message supprimé.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};