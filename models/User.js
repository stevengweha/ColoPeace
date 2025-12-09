const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: String,
  avatarUrl: String,
}, { timestamps: true });

// Méthode publique pour renvoyer les champs safe
userSchema.methods.toPublic = function() {
  const obj = this.toObject({ virtuals: true });
  // supprimer champs sensibles
  delete obj.password;
  delete obj.__v;
  delete obj.tokens; // si présent
  return {
    _id: obj._id,
    name: obj.name,
    email: obj.email,
    phone: obj.phone,
    avatarUrl: obj.avatarUrl
  };
};

module.exports = mongoose.model('User', userSchema);
