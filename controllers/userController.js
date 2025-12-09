const User = require('../models/User');

// Créer un utilisateur
exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(typeof user.toPublic === 'function' ? user.toPublic() : {
      _id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Récupérer tous les utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users.map(u => (typeof u.toPublic === 'function' ? u.toPublic() : {
      _id: u._id, name: u.name, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Récupérer un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(typeof user.toPublic === 'function' ? user.toPublic() : {
      _id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(typeof user.toPublic === 'function' ? user.toPublic() : {
      _id: user._id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
