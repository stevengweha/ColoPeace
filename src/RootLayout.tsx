import React, { useContext } from "react"; // 👈 Obligatoire pour utiliser useContext
import { View, StyleSheet, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import CustomHeader from "./components/simpleheader";
import BottomTabBar from "./components/BottomTabbar";
import { UserContext } from "../App"; // On garde l'import vers App

export default function RootLayout({ children }) {
    const { user } = useContext(UserContext); // Récupère le user pour le header
    
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.safe} edges={['top']}>
                <CustomHeader isAdmin={user?.role === 'admin'} />
                <View style={styles.mainContainer}>
                    <View style={styles.content}>{children}</View>
                    <View style={styles.tabBarWrapper}>
                        <BottomTabBar />
                    </View>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
// ... garde tes styles en dessous

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: 1, // Prend tout l'espace
  },
  tabBarWrapper: {
    // Cette zone réserve l'espace pour que la bulle flotte 
    // sans jamais cacher le dernier élément de ta liste
    height: Platform.OS === 'web' ? 90 : 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  }
});