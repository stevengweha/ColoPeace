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
import { UserContext } from "../contexts/UserContext";
import { useNavigation } from "@react-navigation/native";

export default function CustomHeader() {
  const navigation = useNavigation();
  const { user, setUser } = useContext(UserContext);
  const isUserConnected = !!user;

  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => setMenuVisible(!menuVisible);

  // ---------------------
  // 🔐 Déconnexion ColoPeace
  // ---------------------
  const performLogout = async () => {
    await AsyncStorage.removeItem("user");
    setUser(null);
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" as never }]
    });
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
      case "parametres":
        navigation.navigate("Profile" as never);
        break;

      case "accessibilite":
        navigation.navigate("Accessibility" as never);
        break;

      case "apropos":
        navigation.navigate("About" as never);
        break;

      case "nouscontacter":
        navigation.navigate("Contact" as never);
        break;

      case "deconnexion":
        handleLogout();
        break;

      default:
        console.log("Item inconnu :", item);
    }
  };

  const menuItems = [
    ...(isUserConnected
      ? [{ key: "parametres", label: "Mon profil" }]
      : []),
    { key: "accessibilite", label: "Accessibilité" },
    { key: "apropos", label: "À propos" },
    { key: "nouscontacter", label: "Nous contacter" },
    ...(isUserConnected
      ? [{ key: "deconnexion", label: "Déconnexion" }]
      : [])
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
          <Ionicons name="menu-outline" size={28} color="#205C3B" />
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            {menuItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => handleMenuItemPress(item.key)}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed
                ]}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  headerWrapper: {
    zIndex: 9999,
    elevation: 10
  },
  header: {
    height: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  logo: {
    height: 50,
    width: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#205C3B"
  },
  iconButton: {
    padding: 6
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 10,
    width: 200,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  menuItemPressed: {
    backgroundColor: "#e8f5e9"
  },
  menuItemText: {
    fontSize: 16,
    color: "#205C3B"
  }
});
