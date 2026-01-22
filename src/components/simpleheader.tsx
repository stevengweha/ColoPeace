import { Ionicons } from "@expo/vector-icons";
import React, { useState, useContext } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert
} from "react-native";
import HomeRedirectButton from "./HomeRedirectButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { UserContext } from "../../App";

export default function CustomHeader() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useContext(UserContext);
  // 🎯 Correction : On vérifie si l'objet user existe vraiment
  const isUserConnected = user !== null && user !== undefined;

  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => setMenuVisible(!menuVisible);

  const performLogout = async () => {
    try {
      // 🎯 Correction : Utilise la même clé que dans ton App.js
      await AsyncStorage.removeItem("@colopeace_user");
      setUser(null);
      setMenuVisible(false);
      
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (e) {
      console.error("Erreur déconnexion:", e);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Déconnexion", style: "destructive", onPress: performLogout }
      ]
    );
  };

  const handleMenuItemPress = (item: string) => {
    setMenuVisible(false);
    switch (item) {
      case "parametres": navigation.navigate("Profile"); break;
      case "accessibilite": navigation.navigate("Accessibility"); break;
      case "apropos": navigation.navigate("About"); break;
      case "nouscontacter": navigation.navigate("Contact"); break;
      case "deconnexion": handleLogout(); break;
    }
  };

  // 📝 Construction de la liste du menu
  const menuItems = [
    ...(isUserConnected ? [{ key: "parametres", label: "Mon profil" }] : []),
    { key: "accessibilite", label: "Accessibilité" },
    { key: "apropos", label: "À propos" },
    { key: "nouscontacter", label: "Nous contacter" },
    // 🎯 Le bouton Logout s'affiche ici si isUserConnected est vrai
    ...(isUserConnected ? [{ key: "deconnexion", label: "Déconnexion" }] : [])
  ];

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.header}>
        <HomeRedirectButton />
        
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="cover"
        />

        <TouchableOpacity onPress={toggleMenu} style={styles.iconButton}>
          {/* 🎯 Petit plus : Affiche l'initiale de l'user ou l'icône menu */}
          <View style={styles.menuTrigger}>
            {isUserConnected && (
               <Text style={styles.userNameText}>{user.name?.charAt(0)}</Text>
            )}
            <Ionicons name="menu-outline" size={28} color="#205C3B" />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalBackground} onPress={() => setMenuVisible(false)}>
          <View style={styles.dropdownMenu}>
            {menuItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => handleMenuItemPress(item.key)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                  // Style spécial pour la déconnexion en rouge
                  item.key === "deconnexion" && styles.logoutItem
                ]}
              >
                <Text style={[
                  styles.menuItemText,
                  item.key === "deconnexion" && styles.logoutText
                ]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: { zIndex: 9999, elevation: 10 },
  header: {
    height: 65,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  logo: { height: 45, width: 45, borderRadius: 22.5 },
  iconButton: { padding: 6 },
  menuTrigger: { flexDirection: 'row', alignItems: 'center' },
  userNameText: { marginRight: 8, fontWeight: 'bold', color: '#205C3B', fontSize: 16 },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingRight: 16
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 220,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 20 },
  menuItemPressed: { backgroundColor: "#f0f0f0" },
  menuItemText: { fontSize: 16, color: "#333", fontWeight: '500' },
  // Style rouge pour la déconnexion
  logoutItem: { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 5 },
  logoutText: { color: "#E74C3C", fontWeight: 'bold' }
});