import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import CustomHeader from "./components/simpleheader";
import BottomTabBar from "./components/BottomTabbar";

export default function RootLayout({ children }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <CustomHeader />
        
        <View style={styles.mainContainer}>
          {/* Le contenu de tes pages */}
          <View style={styles.content}>
            {children}
          </View>

          {/* La zone de la bulle */}
          <View style={styles.tabBarWrapper}>
            <BottomTabBar />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

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