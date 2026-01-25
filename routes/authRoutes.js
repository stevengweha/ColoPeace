const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');


// Inscription simple
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// clerk routes (à ajouter si utilisation de Clerk)
router.post('/clerk-login', authController.clerkLogin);

// Récupérer tous les utilisateurs (protégé)
router.get('/users', authenticateJWT, authController.getAllUsers);

// generer et envoyer un code d'accès
// Change "generateAccessCode" par "generateAndSendCode"
router.post('/inviteuser', authController.generateAndSendCode);
// Exemple de route admin uniquement
router.get('/admin', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Accès admin autorisé.' });
});

module.exports = router;
