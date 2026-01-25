const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===================
// Inscription simple
// ===================
exports.register = async (req, res) => {
  try {
    const { name, email, password, avatarUrl, inviteCode } = req.body;

    // --- VÉRIFICATION DU CODE ---
    const validCode = await AccessCode.findOne({ 
      code: inviteCode, 
      email: email, // Sécurité : le code doit correspondre au mail
      isActive: true,
      expiresAt: { $gt: new Date() } 
    });

    if (!validCode) {
      return res.status(403).json({ message: "Code invalide, expiré ou mauvais email." });
    }

    // --- LOGIQUE D'INSCRIPTION CLASSIQUE ---
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email déjà utilisé.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, avatarUrl });
    await user.save();

    // Marquer le code comme utilisé
    validCode.isActive = false;
    validCode.usedBy = user._id;
    await validCode.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'Utilisateur créé.', token, user });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ===================
// Connexion
// ===================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email incorrect.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect.' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ===================
// Récupérer tous les utilisateurs (pour la rotation des tâches)
// ===================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // on n’envoie pas le hash
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

const { createClerkClient } = require('@clerk/clerk-sdk-node');
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// =============================
// Login via Clerk (Google/Apple)
// =============================
exports.clerkLogin = async (req, res) => {
  try {
    const { clerkToken } = req.body;

    // 1. Vérifier le token Clerk
    const decoded = await clerkClient.verifyToken(clerkToken);
    
    if (!decoded) return res.status(401).json({ message: 'Token Clerk invalide.' });

    // 2. Récupérer les infos complètes de l'utilisateur chez Clerk
    const clerkUser = await clerkClient.users.getUser(decoded.sub);
    const email = clerkUser.emailAddresses[0].emailAddress;

    // 3. Chercher ou Créer l'utilisateur dans TA base MongoDB
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name: clerkUser.firstName || "Coloc",
        email: email,
        password: "OAUTH_USER", // On met un flag pour les users sans MDP
        avatarUrl: clerkUser.imageUrl,
        role: 'user'
      });
      await user.save();
    }

    // 4. Générer TON token JWT habituel (celui que ton middleware comprend)
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // 5. Réponse identique à ton login classique
    res.json({ token, user });

  } catch (err) {
    console.error("Erreur Bridge Clerk:", err);
    res.status(500).json({ message: 'Erreur authentification Google', error: err.message });
  }
};

// =============================
const crypto = require('crypto');
const AccessCode = require('../models/AccessCode');
const { sendInviteCode } = require('../services/emailService'); // Assure-toi de l'ajouter dans ton emailService

exports.generateAndSendCode = async (req, res) => {
  try {
    const { email } = req.body;
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await AccessCode.create({ code, email, expiresAt });

    // 🔥 ON AJOUTE DES LOGS ICI POUR VOIR LE RÉSULTAT DANS RENDER
    sendInviteCode(email, code)
      .then(() => console.log(`✅ Mail d'invitation envoyé avec succès à ${email}`))
      .catch(err => console.error(`❌ ÉCHEC envoi mail à ${email}:`, err.message));

    return res.json({ 
      message: `Code généré pour ${email}. L'email est en cours d'envoi.`,
      debugCode: code 
    });

  } catch (err) {
    res.status(500).json({ error: "Erreur DB: " + err.message });
  }
};