// RootLayout.js
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// ⚠️ Assurez-vous que les chemins d'importation sont corrects pour vos composants !
import CustomHeader from "./components/simpleheader";
import BottomTabBar from "./components/BottomTabbar";
// Importez ErrorBoundary si vous l'utilisez
// import ErrorBoundary from "./components/ErrorBoundary"; 

export default function RootLayout({ children }) {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.safe}>
                {/* <ErrorBoundary> - Si vous l'utilisez */}
                <CustomHeader />
                {/* Le contenu spécifique de la page (Home, TasksWeek, etc.) */}
                <View style={styles.content}>{children}</View>
                <BottomTabBar />
                {/* </ErrorBoundary> */}
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#fff"
    },
    content: {
        flex: 1,
        // C'est une bonne pratique pour gérer l'espace de la bottom bar si elle n'est pas absolue.
        // Valeurs estimées pour laisser de la place à la BottomTabBar.
        paddingBottom: Platform.OS === "ios" ? 84 : 64
    }
});