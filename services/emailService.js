const nodemailer = require('nodemailer');

// 1. Configuration du transporteur
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.eMAIL_SERVICE_NAME, // Remplace par ton vrai Gmail
    pass: process.env.eMAIL_SERVICE // Ton code de 16 lettres Google
  }
});

// 2. Fonction d'envoi (Nommée "sendTaskReminder" pour matcher ton server.js)
exports.sendTaskReminder = (recipientEmail, userName, taskTitle) => {
  const mailOptions = {
    from: '"Gestion Coloc ColoPeace" <ton-email@gmail.com>',
    to: recipientEmail,
    subject: `⚠️ Rappel : ${taskTitle}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #205C3B;">Bonjour ${userName} !</h2>
        <p>C'est un petit rappel pour ta tâche d'aujourd'hui : <strong style="font-size: 18px;">${taskTitle}</strong>.</p>
        <p>N'oublie pas de prendre une photo de preuve une fois terminée !</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <small style="color: #888;">Ceci est un message automatique de ColoPeace.</small>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};