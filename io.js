const io = require('socket.io-client');

const socket = io('http://localhost:5001');

socket.on('connect', () => {
  console.log('Connecté au serveur socket.io');

  // Exemple : envoyer un événement
  socket.emit('userOnline', '12345'); 

  // Écouter un événement du serveur
  socket.on('nouveau_message', (data) => {
    console.log('Nouveau message reçu:', data);
  });
});

socket.on('disconnect', () => {
  console.log('Déconnecté');
});
