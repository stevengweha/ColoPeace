const mongoose = require('mongoose');

const AccessCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  email: { type: String, required: true }, // Pour lier le code à un futur utilisateur
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('AccessCode', AccessCodeSchema);