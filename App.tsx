import React, { createContext, useEffect, useState, createRef } from "react";
import { View, Vibration, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// 🔔 NOTIFICATIONS & SOCKET
import FlashMessage, { showMessage } from "react-native-flash-message";
import { getSocket } from "./src/services/socket"; 

import RootLayout from "./src/RootLayout";
import Login from "./src/pages/auth/Login";
import Register from "./src/pages/auth/Register";
import UsersList from "./src/pages/UsersList";
import TasksWeek from "./src/pages/TasksWeek";
import Conversations from "./src/pages/Conversations";
import Chat from "./src/pages/Chat";
import Tasks from "./src/pages/Job/Tasks";
import Taskshistory from "./src/pages/Job/Taskshistory";
import Profile from "./src/pages/Profile";
import urlBase64ToUint8Array from "./src/services/vapidUtils";
import api from './src/services/api'; 

// --- 🌐 ENREGISTREMENT DU SERVICE WORKER (PWA) ---
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ Service Worker enregistré (Portée:', reg.scope, ')'))
      .catch(err => console.error('❌ Erreur SW:', err));
  });

  // Detecter si une nouvelle version du SW est disponible
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Nouveau Service Worker en contrôle, rechargement de la page...');
    window.location.reload();
  });

}

// 🎯 RÉFÉRENCE DE NAVIGATION GLOBALE
const navigationRef = createRef<any>();
const Stack = createNativeStackNavigator();

export const UserContext = createContext<{
  user: any;
  setUser: (user: any) => void;
}>({
  user: null,
  setUser: () => {},
});

const SimpleHeader = {
  title: "ColoPeace",
  headerStyle: { backgroundColor: "#205C3B" },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "bold" },
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1️⃣ Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("@colopeace_user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log("👤 Utilisateur chargé :", parsedUser.name);
        }
      } catch (error) {
        console.error("❌ Erreur AsyncStorage :", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // 🎯 FONCTION POUR AFFICHER LES NOTIFICATIONS IN-APP (Via Sockets)
 const triggerNotification = (data) => {
  try { Vibration.vibrate([0, 150, 100, 150]); } catch (e) {}

  showMessage({
    message: data.title,
    description: data.body,
    type: "default", // On met default pour personnaliser totalement la couleur
    backgroundColor: data.type === "chat" ? "#2E86C1" : "#205C3B", 
    color: "#FFFFFF",
    duration: 4000,
    floating: true, // Pour que la notif "flotte" au lieu de coller le bord
    icon: (props) => (
      <Ionicons 
        name={data.type === "chat" ? "chatbubble-ellipses" : "notifications-outline"} 
        size={24} 
        color="white" 
        style={{ marginRight: 10 }} 
      />
    ),
    style: {
      borderRadius: 20,
      marginHorizontal: 10,
      marginTop: Platform.OS === 'ios' ? 20 : 40,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      elevation: 10, // Ombre sur Android
      shadowColor: "#000", // Ombre sur iOS
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    titleStyle: {
      fontWeight: "bold",
      fontSize: 16,
    },
    textStyle: {
      fontSize: 14,
    },
    onPress: () => {
      if (data.type === "chat") {
        navigationRef.current?.navigate("Chat", { id: data.conversationId?.toString(), title: "Discussion" });
      } else {
        navigationRef.current?.navigate("Tasks");
      }
    }
  });
};

  // 2️⃣ Gestion des Sockets & Abonnement Push
  useEffect(() => {
    if (user) {
      const userId = user._id || user.id;

      // 🚀 RÉVEIL DU CHAT : Se reconnecter quand l'utilisateur revient sur l'app
      const handleFocus = () => {
        if (!socket.connected) {
          console.log("🔌 Reconnexion forcée...");
          socket.connect();
        }
      };

      // 📲 Activer le Push Système sur le Web
      if (Platform.OS === 'web') {
        subscribeUserToPush(userId);
        window.addEventListener('focus', handleFocus);
      }

      const socket = getSocket();
      const userChannel = `notification_${userId}`;

      console.log("🔌 Connexion Sockets actives pour :", user.name);
      socket.emit("userOnline", userId);

      // Écoute des différents canaux
      socket.on(userChannel, triggerNotification);
      socket.on("notification_global", triggerNotification);

      return () => {
        socket.off(userChannel);
        socket.off("notification_global");
      };
    }
  }, [user]);

  // 🔑 FONCTION D'ABONNEMENT WEB PUSH
  const subscribeUserToPush = async (userId: string) => {
    const publicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
    if (Platform.OS !== 'web' || !publicKey || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // On récupère ou on crée l'abonnement
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log("📡 Création d'un nouvel abonnement Push...");
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // On synchronise systématiquement avec le backend
      await api.post('/users/subscribe', { userId, subscription });
      console.log("✅ Abonnement Push synchronisé en base de données");

    } catch (error) {
      console.error("❌ Erreur lors de l'abonnement Push:", error);
    }
  };

  if (loading) return null;

  // --- STACKS DE NAVIGATION ---
  function AuthStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">{(props) => <Login onLogin={setUser} {...props} />}</Stack.Screen>
        <Stack.Screen name="Register">{(props) => <Register onRegister={setUser} {...props} />}</Stack.Screen>
      </Stack.Navigator>
    );
  }

  function AppStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">{(props) => <RootLayout><TasksWeek user={user} {...props} /></RootLayout>}</Stack.Screen>
        <Stack.Screen name="Conversations">{(props) => <RootLayout><Conversations user={user} {...props} /></RootLayout>}</Stack.Screen>
        <Stack.Screen name="Chat" options={SimpleHeader}>{(props) => <Chat user={user} {...props} />}</Stack.Screen>
        <Stack.Screen name="Users">{(props) => <RootLayout><UsersList {...props} /></RootLayout>}</Stack.Screen>
        <Stack.Screen name="Tasks">{(props) => <RootLayout><Tasks user={user} {...props} /></RootLayout>}</Stack.Screen>
        <Stack.Screen name="Taskshistory">{(props) => <RootLayout><Taskshistory user={user} {...props} /></RootLayout>}</Stack.Screen>
        <Stack.Screen name="Profile">{(props) => <RootLayout><Profile user={user} {...props} /></RootLayout>}</Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          {user ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
        
        <FlashMessage 
          position="top" 
          statusBarHeight={Platform.OS === 'ios' ? 45 : 30}
        />
      </View>
    </UserContext.Provider>
  );
}