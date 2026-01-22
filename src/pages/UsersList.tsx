import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { io } from "socket.io-client";
import api from '../services/api';
import { UserContext } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SOCKET_URL = "http://192.168.1.XX:5001"; // Ton IP

export default function UsersList() {
  const { user: currentUser } = useContext(UserContext);
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [creatingConv, setCreatingConv] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    if (currentUser) {
      socket.emit('userOnline', currentUser._id || currentUser.id);
    }
    socket.on('userOnlineStatus', (userIds: string[]) => setOnlineIds(userIds));
    fetchUsers();
    return () => { socket.disconnect(); };
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const others = res.data.filter((u: any) => (u._id || u.id) !== (currentUser?._id || currentUser?.id));
      setUsers(others);
    } catch (err) { console.error(err); }
  };

  // 🎯 LOGIQUE DE NAVIGATION VERS LE CHAT
  const handleOpenChat = async (recipient: any) => {
    if (creatingConv) return;
    setCreatingConv(true);

    try {
      // 1. On demande au backend de créer ou récupérer la conversation existante
      const res = await api.post('/conversations', {
        participants: [currentUser._id || currentUser.id, recipient._id || recipient.id]
      });

      const conversation = res.data;

      // 2. On navigue vers l'écran Chat avec l'ID de la conversation
      navigation.navigate('Chat', { 
        id: conversation._id, 
        title: recipient.name 
      });
    } catch (err) {
      console.error("Erreur conversation:", err);
    } finally {
      setCreatingConv(false);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const isOnline = onlineIds.includes(item._id || item.id);

    return (
      <View style={styles.userCard}>
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.name?.charAt(0)}</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }]} />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={[styles.statusLabel, { color: isOnline ? '#4CAF50' : '#9E9E9E' }]}>
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>

        {/* 🔘 BOUTON MESSAGE CONNECTÉ */}
        <TouchableOpacity 
          style={styles.messageButton} 
          onPress={() => handleOpenChat(item)}
        >
          {creatingConv ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item._id || item.id}
        renderItem={renderUserItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8F9FA" },
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 55, height: 55, borderRadius: 27.5 },
    avatarPlaceholder: { backgroundColor: '#205C3B', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    statusIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    userInfo: { flex: 1, marginLeft: 15 },
    userName: { fontSize: 17, fontWeight: '700', color: '#333' },
    statusLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    messageButton: { backgroundColor: '#205C3B', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
});