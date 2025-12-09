import React from "react";
import { 
  View, 
  Pressable, 
  StyleSheet, 
  Platform 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, NavigationProp } from "@react-navigation/native";

// 🎯 CORRECTION: Utiliser "Home" à la place de "TasksWeek" ou "Dashboard"
type RootStackParamList = {
  Home: undefined; 
  Conversations: undefined;
  Users: undefined;
  Profile: undefined;
  Chat: undefined; // Ajouté pour la complétude du type
};

export default function BottomTabBar() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();

  const tabs = [
    // 🎯 CORRECTION: Utilisation de la route "Home"
    { route: "Home" as keyof RootStackParamList, icon: "calendar-outline" },
    { route: "Conversations" as keyof RootStackParamList, icon: "chatbubble-ellipses-outline" },
    { route: "Users" as keyof RootStackParamList, icon: "people-outline" },
    { route: "Profile" as keyof RootStackParamList, icon: "person-circle-outline" },
  ];

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = route.name === tab.route;

          return (
            <Pressable
              key={tab.route}
              onPress={() => {
                // 🎯 CORRECTION MAJEURE: Remplacement de push par navigate
                if (!isActive) {
                  navigation.navigate(tab.route as never); 
                }
              }}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.activeTab,
                pressed && !isActive && styles.hoverTab,
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={26}
                color={isActive ? "#fff" : "#205C3B"}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    // Utilisation de 'absolute' pour une barre fixe en bas de l'écran natif
    position: "absolute", 
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF", // Fond blanc pour plus de clarté
    borderTopWidth: 1,
    borderColor: "#E0E0E0", // Bordure plus claire
    zIndex: 100,
    paddingBottom: Platform.OS === "ios" ? 24 : 8, // Gestion de la zone de sécurité iOS
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  tabButton: {
    padding: 10,
    borderRadius: 24, // Légèrement plus arrondi
  },
  activeTab: {
    backgroundColor: "#205C3B", // Couleur principale
    // Ajout d'une ombre subtile pour l'état actif
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
      android: { elevation: 5 },
    })
  },
  hoverTab: {
    backgroundColor: "#DCEFE3",
  },
});