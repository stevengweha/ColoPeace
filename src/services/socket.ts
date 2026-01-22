import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";

// ⚠️ IMPORTANT :
// Si tu testes sur SIMULATEUR Android : utilise "http://10.0.2.2:5001"
// Si tu testes sur SIMULATEUR iOS : utilise "http://localhost:5001"
// Si tu testes sur un VRAI TÉLÉPHONE : utilise l'IP de ton PC (ex: "http://192.168.1.15:5001")

const SOCKET_URL = "http://192.168.1.115:5001"; // <--- REMPLACE ICI SI BESOIN

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      closeOnBeforeunload: true,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connecté avec l'ID :", socket?.id);
    });

    socket.on("connect_error", (error) => {
      console.log("❌ Erreur de connexion Socket :", error.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};