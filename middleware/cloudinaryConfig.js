const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
dotenv = require('dotenv');
dotenv.config();
// On définit les clés dans un objet simple
const credentials = {
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
};

// On configure l'instance globale
cloudinary.config(credentials);

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // LOG DE SÉCURITÉ : On vérifie si l'instance a les clés au moment précis de l'upload
    console.log("Vérification config Cloudinary avant envoi:", cloudinary.config().api_key ? "✅ OK" : "❌ VIDE");

    return {
      folder: 'colopeace_uploads',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Ajout de webp car ton image est en .webp
      public_id: `avatar-${Date.now()}`
    };
  },
});

module.exports = multer({ storage: storage });