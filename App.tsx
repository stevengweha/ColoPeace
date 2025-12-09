import React, { createContext, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// 🚀 Importation du Layout
import RootLayout from './src/RootLayout';

// Importations des pages
import Login from "./src/pages/auth/Login";
import Register from "./src/pages/auth/Register";
import UsersList from "./src/pages/UsersList";
import TasksWeek from "./src/pages/TasksWeek"; // ✅ TasksWeek est désormais votre écran principal
import Conversations from "./src/pages/Conversations";
import Chat from "./src/pages/Chat";
import Tasks from "./src/pages/Job/Tasks"; // ✅ Importation de Tasks pour la navigation
// ❌ Retrait de l'importation de Home, qui n'existe pas.

const Stack = createNativeStackNavigator();

// 🔹 Contexte utilisateur
export const UserContext = createContext({
  user: null,
  setUser: (_: any) => { },
});

// 🔹 Header simple global 
function SimpleHeader() {
  return {
    title: "ColoPeace",
    headerStyle: { backgroundColor: "#205C3B" },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "bold" },
  };
}

export default function App() {
  const [user, setUser] = useState<any>(null);

  // 🔹 Auth Stack (login/register) - SANS Header ni Layout
  function AuthStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {(props) => <Login onLogin={setUser} {...props} />}
        </Stack.Screen>

        <Stack.Screen name="Register">
          {(props) => <Register onRegister={setUser} {...props} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // 🔹 App Stack (après login) - Utilise RootLayout
  function AppStack() {
    return (
      <Stack.Navigator
        // Désactive le header par défaut
        screenOptions={{ headerShown: false }}
      >

        {/* 1. Écran HOME (Point d'entrée) utilise maintenant TasksWeek */}
        <Stack.Screen name="Home">
          {(props) => (
            <RootLayout>
              {/* 🎯 Utilisation de TasksWeek comme composant d'accueil */}
              <TasksWeek user={user} {...props} />
            </RootLayout>
          )}
        </Stack.Screen>

        {/* ❌ L'ancienne entrée "TasksWeek" a été supprimée car elle est maintenant "Home" */}
        {/* Si vous avez besoin de naviguer vers "TasksWeek" avec un autre nom de route, 
            vous devrez renommer l'écran ci-dessus (ex: name="TasksDashboard") et ajouter un nouvel écran "TasksWeek". */}


        {/* 2. Écran Conversations */}
        <Stack.Screen name="Conversations">
          {(props) => (
            <RootLayout>
              <Conversations user={user} {...props} />
            </RootLayout>
          )}
        </Stack.Screen>

        {/* 3. Écran Chat - Utilise le header natif (sans BottomBar) */}
        <Stack.Screen
          name="Chat"
          options={SimpleHeader}
        >
          {(props) => <Chat user={user} {...props} />}
        </Stack.Screen>

        {/* 4. Écran UsersList */}
        <Stack.Screen name="Users">
          {(props) => (
            <RootLayout>
              <UsersList {...props} />
            </RootLayout>
          )}
        </Stack.Screen>
        {/* Ecran task. */}
      <Stack.Screen name="Tasks">
        {(props) => (
          <RootLayout>
            <Tasks user={user} {...props} />
          </RootLayout>
        )}
      </Stack.Screen>

      </Stack.Navigator>

      
    );

    
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <NavigationContainer>
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </UserContext.Provider>
  );
}