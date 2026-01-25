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
// mailler de nouvelle tâche assignée
exports.sendTaskNew = (recipientEmail, userName, taskTitle) => {
  const mailOptions = {
    from: '"ColoPeace 🏠" <ton-email@gmail.com>',
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

// mailler de rappel de tâche
exports.sendTaskReminder = (recipientEmail, userName, taskTitle) => {
  const mailOptions = {
    from: '"ColoPeace 🏠"<ton-email@gmail.com>',
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

// mailler invitation à rejoindre la coloc avec lien d'inscription et code coloc
exports.sendInviteCode = (recipientEmail, code) => {
  const mailOptions = {
    from: '"ColoPeace 🏠"<ton-email@gmail.com>',
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
