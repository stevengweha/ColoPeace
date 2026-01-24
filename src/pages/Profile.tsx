import React, { useContext, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  Image, Platform, Dimensions, Modal, ActivityIndicator, Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import { UserContext } from "../../App";
import api from "../services/api";
import * as Async from "@react-native-async-storage/async-storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get("window");

export default function Profile() {
  const { user, setUser } = useContext(UserContext);
  const navigation = useNavigation<any>();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "??";

  // --- RENDU DE L'IMAGE AVEC SECURITE ---
  const renderAvatar = () => {
    if (loading) {
      return <View style={styles.avatarPlaceholder}><ActivityIndicator color="#fff" /></View>;
    }

    if (user?.avatarUrl) {
      // Nettoyage de l'URL pour forcer le HTTPS et l'optimisation Cloudinary
      const cleanUrl = user.avatarUrl.replace("http://", "https://")
                                     .replace('/upload/', '/upload/w_400,h_400,c_fill,g_face,q_auto/');
      return <Image source={{ uri: cleanUrl }} style={styles.avatar} />;
    }

    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{userInitials}</Text>
      </View>
    );
  };

  // --- SELECTION DE L'IMAGE ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert("Permission requise", "Veuillez autoriser l'accès à vos photos dans les paramètres.");
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Correction du Warning Deprecated
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadToServer(result.assets[0].uri);
    }
  };

  // --- ENVOI AU SERVEUR (METHODE FETCH POUR EVITER ERREUR 400) ---
 const uploadToServer = async (uri: string) => {
  setLoading(true);
  try {
    const formData = new FormData();
    
    // Extraction propre du nom et de l'extension
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    const fileName = `avatar.${fileType}`;

    formData.append('avatar', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: fileName,
      type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`, // Gestion du jpeg
    } as any);

    const response = await api.post(`/users/upload-avatar/${user._id}`, formData, {
    
      // Très important pour axios avec FormData
      transformRequest: (data) => data, 
    });

    if (response.data && response.data.avatarUrl) {
      // 1. Mise à jour de l'objet utilisateur
      const updatedUser = { ...user, avatarUrl: response.data.avatarUrl };
      
      // 2. Mise à jour du stockage local AVANT le context
      await AsyncStorage.setItem("@colopeace_user", JSON.stringify(updatedUser));
      
      // 3. Mise à jour du context global
      setUser(updatedUser);

      Alert.alert("Succès", "Photo enregistrée en base de données !");
    }
  } catch (err) {
    console.error("Erreur Upload Front:", err.response?.data || err.message);
    Alert.alert("Erreur", "La synchronisation avec la base de données a échoué.");
  } finally {
    setLoading(false);
  }
};

  const profileOptions = [
    { id: 1, title: "Mes informations", icon: "person-outline", route: "EditProfile", color: "#4A90E2" },
    { id: 2, title: "Mes tâches finies", icon: "checkmark-done-outline", route: "Taskshistory", color: "#2E7D32" },
    { id: 3, title: "Paramètres", icon: "settings-outline", route: "Settings", color: "#757575" },
    { id: 4, title: "Aide & Support", icon: "help-buoy-outline", route: "Contact", color: "#FFA000" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER PROFIL */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {renderAvatar()}
            <TouchableOpacity style={styles.editBadge} onPress={() => setModalVisible(true)}>
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{user?.name || "Utilisateur"}</Text>
          <Text style={styles.userEmail}>{user?.email || "email@exemple.com"}</Text>
          <View style={styles.roleTag}><Text style={styles.roleText}>Membre ColoPeace</Text></View>
        </View>

        {/* MODAL ACTION SHEET */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Modifier la photo</Text>
              
              <TouchableOpacity style={styles.modalBtn} onPress={pickImage}>
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9', width: 40, height: 40, borderRadius: 20 }]}>
                  <Ionicons name="images" size={22} color="#205C3B" />
                </View>
                <Text style={styles.modalBtnText}>Choisir dans la galerie</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalBtn, { marginTop: 12 }]} onPress={() => setModalVisible(false)}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE', width: 40, height: 40, borderRadius: 20 }]}>
                  <Ionicons name="close" size={22} color="#D32F2F" />
                </View>
                <Text style={[styles.modalBtnText, { color: '#D32F2F' }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MENU OPTIONS */}
        <View style={styles.menuContainer}>
          {profileOptions.map((option) => (
            <TouchableOpacity 
              key={option.id} 
              style={styles.menuItem}
              onPress={() => option.route && navigation.navigate(option.route)}
            >
              <View style={[styles.iconCircle, { backgroundColor: option.color + '20', width: 40, height: 40, borderRadius: 20 }]}>
                <Ionicons name={option.icon as any} size={22} color={option.color} />
              </View>
              <Text style={styles.menuItemTitle}>{option.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour au Dashboard</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { padding: 20, alignItems: 'center' },
  profileHeader: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#205C3B', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#205C3B', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 10 },
  userName: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 4 },
  roleTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  roleText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40, alignItems: 'center' },
  modalHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 3, marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, color: '#333' },
  modalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 12, borderRadius: 15, width: '100%' },
  modalBtnText: { marginLeft: 15, fontSize: 16, fontWeight: '600', color: '#333' },
  menuContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 10, marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemTitle: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500', marginLeft: 15 },
  iconCircle: { justifyContent: 'center', alignItems: 'center' },
  backButton: { marginTop: 10, padding: 15 },
  backButtonText: { color: '#205C3B', fontWeight: '600', fontSize: 15 }
});