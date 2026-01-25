const nodemailer = require('nodemailer');
// TRÈS IMPORTANT : Cette ligne doit être présente pour lire ton fichier .env
require('dotenv').config(); 

if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
  console.error("❌ Les variables d'environnement BREVO_USER ou BREVO_PASS ne sont pas définies.");
}


const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SERVER_SMTP,
  port: process.env.BREVO_PORT,
  secure: false,
  auth: {
    // On utilise exactement les noms de ton fichier .env
    user: process.env.BREVO_USER, 
    pass: process.env.BREVO_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Fonctions d'envoi
exports.sendInviteCode = (recipientEmail, code) => {
  const mailOptions = {
    from: `"ColoPeace 🏠" <jhonsgustavo@gmail.com>`,
    to: recipientEmail,
    subject: `🏠 Invitation à rejoindre une coloc avec ColoPeace`,
    html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #205C3B;">Salut !</h2>
            <p>tu as été invité à rejoindre la coloc  ColoPeace.</p>
            <p>Utilise le code suivant pour t'inscrire et rejoindre la coloc : <strong style="font-size: 18px; color: #e67e22;">${code}</strong></p>
            <br/>
            <a href="https://ton-app-vercel.app/" style="background-color: #205C3B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">S'inscrire et rejoindre la coloc</a>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <small style="color: #888;">ColoPeace - Organisons la vie à la coloc sans stress.</small>
        </div>
    `
  };
  return transporter.sendMail(mailOptions);
};


// Mail de nouvelle tâche
exports.sendTaskNew = (recipientEmail, userName, taskTitle) => {
  const mailOptions = {
    from: `"ColoPeace 🏠" <jhonsgustavo@gmail.com>`,
    to: recipientEmail,
    subject: `📋 Nouvelle tâche assignée : ${taskTitle}`, // Objet plus clair
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #205C3B;">Salut ${userName} !</h2>
        <p>Le planning de la semaine vient d'être généré.</p>
        <p>Tu es responsable de la tâche suivante : <strong style="font-size: 18px; color: #e67e22;">${taskTitle}</strong>.</p>
        <p>Pense à bien prendre une <b>photo de preuve</b> dans l'application quand tu auras fini !</p>
        <br/>
        <a href="https://ton-app-vercel.app" style="background-color: #205C3B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir mes tâches</a>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <small style="color: #888;">ColoPeace - Organisons la vie à la coloc sans stress.</small>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

// Mail de rappel
exports.sendTaskReminder = (recipientEmail, userName, taskTitle) => {
  const mailOptions = {
    from: `"ColoPeace 🏠" <jhonsgustavo@gmail.com>`,
    to: recipientEmail,
    subject: `⏰ Rappel de tâche : ${taskTitle}`,
    html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #205C3B;">Bonjour ${userName} !</h2>
            <p>Ceci est un petit rappel amical pour te rappeler que tu as une tâche à accomplir aujourd'hui : <strong style="font-size: 18px; color: #e67e22;">${taskTitle}</strong>.</p>
            <p>N'oublie pas de prendre une <b>photo de preuve</b> dans l'application une fois la tâche terminée !</p>
            <br/>
            <a href="https://ton-app-vercel.app" style="background-color: #205C3B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir mes tâches</a>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <small style="color: #888;">ColoPeace - Organisons la vie à la coloc sans stress.</small>
        </div>
    `
  };
  return transporter.sendMail(mailOptions);
};