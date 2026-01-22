import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function BottomTabBar() {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const tabs = [
    { route: "Home", icon: "home-outline" },
    { route: "Tasks", icon: "calendar-outline" },
    { route: "Conversations", icon: "chatbubble-ellipses-outline" },
    { route: "Profile", icon: "person-circle-outline" },
  ];

  return (
    <View style={styles.floatingBubble}>
      {tabs.map((tab) => {
        const isActive = route.name === tab.route;
        return (
          <Pressable
            key={tab.route}
            onPress={() => !isActive && navigation.navigate(tab.route)}
            style={({ pressed }) => [
              styles.tabButton,
              isActive && styles.activeTab,
              pressed && !isActive && styles.hoverTab,
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={24}
              color={isActive ? "#fff" : "#205C3B"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBubble: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    // 💡 Le look bulle
    width: "92%",
    maxWidth: 400,
    height: 60,
    borderRadius: 30,
    
    // Alignement
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,

    // Ombres premium
    ...Platform.select({
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      }
    }),
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#205C3B",
  },
  hoverTab: {
    backgroundColor: "#DCEFE3",
  },
});