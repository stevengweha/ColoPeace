import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Platform,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { UserContext } from "../../App";


const { width } = Dimensions.get("window");

export default function Profile() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation<any>();

  // On simule quelques badges ou stats pour le look "Gamification"
  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "??";

  const profileOptions = [
    { id: 1, title: "Mes informations", icon: "person-outline", route: "EditProfile", color: "#4A90E2" },
    { id: 2, title: "Mes tâches finies", icon: "checkmark-done-outline", route: "Taskshistory", color: "#2E7D32" },
    { id: 3, title: "Paramètres", icon: "settings-outline", route: "Settings", color: "#757575" },
    { id: 4, title: "Aide & Support", icon: "help-buoy-outline", route: "Contact", color: "#FFA000" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER : Avatar et Nom */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{user?.name || "Utilisateur"}</Text>
          <Text style={styles.userEmail}>{user?.email || "email@exemple.com"}</Text>
          
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>Membre ColoPeace</Text>
          </View>
        </View>

        {/* SECTION : Menu d'options */}
        <View style={styles.menuContainer}>
          {profileOptions.map((option) => (
            <TouchableOpacity 
              key={option.id} 
              style={styles.menuItem}
              onPress={() => option.route && navigation.navigate(option.route)}
            >
              <View style={[styles.iconCircle, { backgroundColor: option.color + '20' }]}>
                <Ionicons name={option.icon as any} size={22} color={option.color} />
              </View>
              <Text style={styles.menuItemTitle}>{option.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* BOUTON RETOUR */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Retour au Dashboard</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { 
    padding: 20, 
    alignItems: 'center',
    maxWidth: Platform.OS === 'web' ? 600 : '100%',
    alignSelf: 'center',
    width: '100%'
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff'
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#205C3B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold'
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#205C3B',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A'
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  roleTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10
  },
  roleText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold'
  },
  menuContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 15
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButton: {
    marginTop: 10,
    padding: 15
  },
  backButtonText: {
    color: '#205C3B',
    fontWeight: '600',
    fontSize: 15
  }
});