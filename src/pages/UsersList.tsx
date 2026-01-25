import React, { useEffect, useState, useContext, useCallback,  } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Image } from 'react-native';
import api from '../services/api';
import { getSocket } from '../services/socket'; // Utilisation du service central
import { UserContext } from '../../App';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function UsersList() {
  const { user: currentUser } = useContext(UserContext);
  const navigation = useNavigation<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [creatingConv, setCreatingConv] = useState<string | null>(null); // Stocke l'ID de l'user cliqué

  const userId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    const socket = getSocket();
    
    if (userId) {
      // Signaler qu'on est en ligne
      socket.emit('userOnline', userId);

      // Écouter les changements de statut
      socket.on('userOnlineStatus', (userIds: string[]) => {
        setOnlineIds(userIds);
      });
    }

    fetchUsers();

    // On ne déconnecte pas ici pour ne pas couper les notifs de Conversations.tsx
    return () => {
      socket.off('userOnlineStatus');
    };
  }, [userId]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      // Filtrer pour ne pas se voir soi-même
      const others = res.data.filter((u: any) => (u._id || u.id) !== userId);
      setUsers(others);
    } catch (err) {
      console.error("Erreur chargement users:", err);
    }
  };

  const handleOpenChat = async (recipient: any) => {
    const recipientId = recipient._id || recipient.id;
    if (creatingConv) return;
    
    setCreatingConv(recipientId);

    try {
      // 1. Créer ou récupérer la conversation
      const res = await api.post('/conversations', {
        participants: [userId, recipientId]
      });

      const conversation = res.data;

      // 2. Naviguer vers le Chat
      navigation.navigate('Chat', { 
        id: conversation._id, 
        title: recipient.name 
      });
    } catch (err) {
      console.error("Erreur création conversation:", err);
    } finally {
      setCreatingConv(null);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => {
    const itemId = item._id || item.id;
    const isOnline = onlineIds.includes(itemId.toString());
    const isLoading = creatingConv === itemId;
    //image cloudinary
    const avatarUrl = item.avatarUrl ? { uri: item.avatarUrl } : null;

    return (
      <TouchableOpacity 
        style={styles.userCard} 
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl.uri }} 
              style={styles.avatar} 
              // Cloudinary peut être lent au premier chargement, on peut ajouter un petit fondu
              fadeDuration={300} 
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {isOnline && <View style={styles.statusIndicator} />}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={[styles.statusLabel, { color: isOnline ? '#4CAF50' : '#9E9E9E' }]}>
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>

        <View style={styles.actionIcon}>
           {isLoading ? (
            <ActivityIndicator size="small" color="#205C3B" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle discussion</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item._id || item.id}
        renderItem={renderUserItem}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFF" },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingTop: Platform.OS === 'ios' ? 60 : 20, 
        paddingHorizontal: 20,
        paddingBottom: 10
    },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    userCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#fff', 
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0'
    },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPlaceholder: { backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#205C3B', fontSize: 20, fontWeight: 'bold' },
    statusIndicator: { 
        position: 'absolute', 
        bottom: 0, 
        right: 0, 
        width: 14, 
        height: 14, 
        borderRadius: 7, 
        backgroundColor: '#4CAF50', 
        borderWidth: 2, 
        borderColor: '#fff' 
    },
    userInfo: { flex: 1, marginLeft: 15 },
    userName: { fontSize: 16, fontWeight: '700', color: '#000' },
    statusLabel: { fontSize: 12, marginTop: 2 },
    actionIcon: { width: 40, alignItems: 'center' }
});