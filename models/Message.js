const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true }, // lien vers le forum/conversation
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
