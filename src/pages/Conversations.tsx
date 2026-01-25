import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Platform, StatusBar, Image
} from 'react-native';
import api from '../services/api';
import { getSocket } from '../services/socket'; 
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../../App';
import moment from 'moment';
import 'moment/locale/fr'; // Pour avoir les dates en français
import { Ionicons } from '@expo/vector-icons';

moment.locale('fr');

export default function Conversations() {
  const { user } = useContext(UserContext);
  const [conversations, setConversations] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  
  const isMounted = useRef(true);
  const userId = user?._id || user?.id;

  // --- 1. RÉCUPÉRATION ET TRI DES CONVERSATIONS ---
  const fetchConversations = useCallback(async (isSilent = false) => {
    if (!userId) return;
    if (!isSilent) setLoading(true);
    
    try {
      // On appelle la route spécifique à l'utilisateur pour avoir le lastMessage
      const res = await api.get(`/conversations/user/${userId}`); 
      if (!isMounted.current) return;

      const data = Array.isArray(res.data) ? res.data : [];
      
      // Tri par date du dernier message (Timestamp)
      const sorted = data.sort((a: any, b: any) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA; 
      });

      setConversations([...sorted]);
    } catch (err) {
      console.error('Erreur chargement conversations:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [userId]);

  // --- 2. GESTION TEMPS RÉEL (SOCKET.IO) ---
  useEffect(() => {
    isMounted.current = true;
    const socket = getSocket();

    if (userId && socket) {
      socket.emit('userOnline', userId);

      // Statut en ligne des autres
      socket.on('userOnlineStatus', (userIds: string[]) => {
        if (isMounted.current) setOnlineUsers(userIds);
      });

      // Écoute des nouveaux messages et des lectures
      const userChannel = `notification_${userId}`;
      const handleUpdate = () => {
        console.log("📩 Nouveau message ou lecture détectée");
        fetchConversations(true); // Re-tri automatique sans loader
      };

      socket.on(userChannel, handleUpdate);
      socket.on("markMessagesAsRead", handleUpdate);
      socket.on("receiveMessage", handleUpdate); // Si on est dans la liste, on rafraîchit

      return () => {
        isMounted.current = false;
        socket.off('userOnlineStatus');
        socket.off(userChannel, handleUpdate);
        socket.off("markMessagesAsRead", handleUpdate);
        socket.off("receiveMessage", handleUpdate);
      };
    }
  }, [userId, fetchConversations]);

  // Rafraîchir quand on revient sur l'écran (ex: après avoir fermé un chat)
  useFocusEffect(
    useCallback(() => {
      fetchConversations(true);
    }, [fetchConversations])
  );

  // --- 3. RENDU D'UNE LIGNE ---
  const renderItem = ({ item }: { item: any }) => {
    const otherParticipant = item.participants?.find((p: any) => (p?._id || p) !== userId);
    const otherId = otherParticipant?._id || otherParticipant;
    const chatTitle = otherParticipant?.name || 'Colocataire';
    const lastMsg = item.lastMessage;
    
    const isOnline = onlineUsers.includes(otherId?.toString());
    const senderId = lastMsg?.senderId?._id || lastMsg?.senderId;
    const isMe = senderId === userId;
    
    // LOGIQUE NON LU : Pas de date de lecture + ce n'est pas mon message
    const isUnread = lastMsg && !lastMsg.readAt && !isMe;
    // LOGIQUE LU PAR L'AUTRE : C'est mon message + il a une date de lecture
    const isReadByOther = lastMsg && lastMsg.readAt && isMe;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => navigation.navigate('Chat', { id: item._id, title: chatTitle})}
      >
            <View style={styles.avatarContainer}>
                {otherParticipant?.avatarUrl ? (
                    <Image
                        source={{ uri: otherParticipant.avatarUrl }}
                        style={styles.avatarImage}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                            {chatTitle.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                {isOnline && <View style={styles.onlineBadge} />}
            </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={[styles.name, isUnread && styles.nameBold]} numberOfLines={1}>
              {chatTitle}
            </Text>
            {lastMsg && (
              <Text style={[styles.time, isUnread && styles.timeGreen]}>
                {moment(lastMsg.createdAt).format('HH:mm')}
              </Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={styles.previewContainer}>
              {isMe && (
                <Ionicons 
                  name="checkmark-done" 
                  size={16} 
                  color={isReadByOther ? "#4fc3f7" : "#BDBDBD"} 
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.preview, isUnread && styles.previewDark]} numberOfLines={1}>
                {lastMsg?.content || 'Nouvelle discussion'}
              </Text>
            </View>
            
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Users')}>
          <Ionicons name="create-outline" size={24} color="#205C3B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={60} color="#DDD" />
              <Text style={styles.noData}>Aucune discussion pour le moment.</Text>
            </View>
          ) : <ActivityIndicator color="#205C3B" style={{ marginTop: 20 }} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 15
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  addBtn: { backgroundColor: '#F0F7F3', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  card: { 
    flexDirection: 'row', padding: 12, borderRadius: 16, marginBottom: 8, 
    alignItems: 'center', backgroundColor: '#FFF' 
  },
  unreadCard: { backgroundColor: '#F7FDF9' }, 
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: { 
    width: 55, height: 55, borderRadius: 27.5, 
    backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' 
  },
  avatarInitial: { fontSize: 20, fontWeight: 'bold', color: '#205C3B' },
  onlineBadge: { 
    position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, 
    borderRadius: 7, backgroundColor: '#4CD964', borderWidth: 2, borderColor: '#FFF' 
  },
  content: { flex: 1, marginLeft: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#333' },
  nameBold: { fontWeight: '800', color: '#000' },
  time: { fontSize: 12, color: '#999' },
  timeGreen: { color: '#205C3B', fontWeight: 'bold' },
  previewContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  preview: { fontSize: 14, color: '#888', flex: 1 },
  previewDark: { color: '#333', fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#205C3B', marginLeft: 10 },
  center: { marginTop: 100, alignItems: 'center' },
  noData: { color: '#BBB', fontSize: 14, marginTop: 10 },
  avatarImage: {
  width: 55,
  height: 55,
  borderRadius: 27.5, // Moitié de la largeur pour faire un cercle
  backgroundColor: '#F0F0F0',
},
});