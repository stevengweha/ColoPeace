const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Inscription simple
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// Récupérer tous les utilisateurs (protégé)
router.get('/users', authenticateJWT, authController.getAllUsers);

// Exemple de route admin uniquement
router.get('/admin', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Accès admin autorisé.' });
});

module.exports = router;
