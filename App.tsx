import React, { createContext, useEffect, useState, createRef, useContext } from "react";
import { View, Vibration, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// 🔐 CLERK & AUTH
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";

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
import MyTasksFocus from "./src/pages/Job/MyTasksFocus";
import api from './src/services/api'; 

// --- 🔐 CONFIGURATION CACHE CLERK ---
const tokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === 'web') return localStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS === 'web') localStorage.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch { return; }
  },
};

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// 🎯 RÉFÉRENCE DE NAVIGATION GLOBALE
const navigationRef = createRef<any>();
const Stack = createNativeStackNavigator();

// --- 🔑 TON CONTEXTE ---
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

// --- 🌐 SERVICE WORKER (WEB) ---
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Error:', err));
  });
}

/**
 * 🚀 COMPOSANT DE NAVIGATION INTERNE
 * Ce composant gère l'affichage en fonction de l'état de l'utilisateur
 */
function RootNavigation() {
  const { user, setUser } = useContext(UserContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("@colopeace_user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      const userId = user._id || user.id;
      const socket = getSocket();
      socket.emit("userOnline", userId);
      
      const userChannel = `notification_${userId}`;
      socket.on(userChannel, triggerNotification);
      socket.on("notification_global", triggerNotification);

      return () => {
        socket.off(userChannel);
        socket.off("notification_global");
      };
    }
  }, [user]);

  const triggerNotification = (data: any) => {
    // 1. On prévient le Service Worker de NE PAS afficher cette notification
      if (Platform.OS === 'web') {
    // On crée un canal de communication instantané
    const bc = new BroadcastChannel('notif_filter');
    bc.postMessage({ 
      type: 'STOP_NOTIFICATION', 
      tag: data.conversationId?.toString() 
    });
    // On ferme le canal localement après envoi pour libérer la mémoire
    setTimeout(() => bc.close(), 1000);
  }
    // 2. On affiche la notification dans l'app via FlashMessage
    try { Vibration.vibrate([0, 150, 100, 150]); } catch (e) {}
    showMessage({
      message: data.title || "Message",
      description: data.body || "",
      type: "default",
      backgroundColor: data.type === "chat" ? "#2E86C1" : "#205C3B",
      onPress: () => {
        if (data.type === "chat") {
          navigationRef.current?.navigate("Chat", { id: data.conversationId?.toString() });
        } else {
          navigationRef.current?.navigate("Tasks");
        }
      }
    });
  };

  if (loading) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <AppStack user={user} /> : <AuthStack setUser={setUser} />}
    </NavigationContainer>
  );
}

// --- 📂 STACKS ---
function AuthStack({ setUser }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">{(props) => <Login onLogin={setUser} {...props} />}</Stack.Screen>
      <Stack.Screen name="Register">{(props) => <Register onRegister={setUser} {...props} />}</Stack.Screen>
    </Stack.Navigator>
  );
}

function AppStack({ user }: any) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home">{(props) => <RootLayout><TasksWeek user={user} {...props} /></RootLayout>}</Stack.Screen>
      <Stack.Screen name="Conversations">{(props) => <RootLayout><Conversations user={user} {...props} /></RootLayout>}</Stack.Screen>
      <Stack.Screen name="Chat" options={SimpleHeader}>{(props) => <Chat user={user} {...props} />}</Stack.Screen>
      <Stack.Screen name="Users">{(props) => <RootLayout><UsersList {...props} /></RootLayout>}</Stack.Screen>
      <Stack.Screen name="Tasks">{(props) => <RootLayout><Tasks user={user} {...props} /></RootLayout>}</Stack.Screen>
      <Stack.Screen name="Taskshistory">{(props) => <RootLayout><Taskshistory user={user} {...props} /></RootLayout>}</Stack.Screen>
      <Stack.Screen name="Profile">{(props) => <RootLayout><Profile user={user} {...props} /></RootLayout>}</Stack.Screen>
      <Stack.Screen name="MyTasksFocus">{(props) => <RootLayout><MyTasksFocus user={user} {...props} /></RootLayout>}</Stack.Screen>
    </Stack.Navigator>
  );
}

// --- 🏁 APP MAIN ---
export default function App() {
  const [user, setUser] = useState<any>(null);

  if (!CLERK_PUBLISHABLE_KEY) return null;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <UserContext.Provider value={{ user, setUser }}>
          <View style={{ flex: 1 }}>
            <RootNavigation />
            <FlashMessage 
              position="top" 
              statusBarHeight={Platform.OS === 'ios' ? 45 : 30}
            />
          </View>
        </UserContext.Provider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}