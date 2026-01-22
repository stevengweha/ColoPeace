const webpush = require('web-push');
const User = require('../models/User');

webpush.setVapidDetails(
  'mailto:' + process.env.eMAIL_SERVICE_NAME.trim(),
  process.env.NOTIFICATION_API_PUBLIC_KEY,
  process.env.NOTIFICATION_API_PRIVATE_KEY
);

const sendNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    
    if (user && user.pushSubscription) {
      const response = await webpush.sendNotification( // On définit 'response' ici
        user.pushSubscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          type: payload.type,
          url: payload.url || '/'
        })
      );
      console.log(`✅ Push validé par le service de messagerie (Statut: ${response.statusCode}) pour ${user.name}`);
    }
  }
  catch (err) {
    console.error(`❌ Erreur lors de l'envoi de la notification à l'utilisateur ${userId}:`, err);
  }
};

module.exports = { sendNotification };