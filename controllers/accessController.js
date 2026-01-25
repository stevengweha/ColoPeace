const AccessCode = require('../models/AccessCode');
const { sendInviteCode } = require('../services/emailService');
const crypto = require('crypto');

exports.generateAndSendCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "L'email est requis" });

    // 1. Générer un code de 6 caractères (Majuscules + Chiffres)
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    // 2. Définir l'expiration (maintenant + 24 heures)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 3. Enregistrer en base
    await AccessCode.create({
      code,
      email,
      expiresAt
    });

    // 4. Envoyer l'email
    await sendInviteCode(email, code);

    res.json({ message: `Code envoyé avec succès à ${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};