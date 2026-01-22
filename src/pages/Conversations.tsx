import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import api from '../services/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../../App';

export default function Conversations() {
  const { user } = useContext(UserContext);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // On précise le type pour avoir l'auto-complétion
  const navigation = useNavigation<any>();

  // 🔄 Utilisation de useFocusEffect pour rafraîchir la liste 
  // quand on revient de la page Chat
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchConversations();
      }
    }, [user])
  );

  const fetchConversations = async () => {
    try {
      // Pour éviter le clignotement du loader au rafraîchissement
      if (conversations.length === 0) setLoading(true);
      
      // Appel à ton API
      const res = await api.get(`/conversations`); 
      
      // Filtrage côté client si la route spécifique /user/:id n'existe pas encore
      const myConversations = res.data.filter((conv: any) => 
        conv.participants.some((p: any) => (p._id || p) === (user._id || user.id))
      );
      
      setConversations(myConversations);
    } catch (err: any) {
      console.error('Erreur récupération conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // Identifier l'autre participant pour le titre
    const otherParticipant = item.participants?.find(
      (p: any) => (p._id || p) !== (user._id || user.id)
    );
    const chatTitle = otherParticipant?.name || 'Discussion';

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        // 🎯 C'EST ICI : On navigue vers "Chat" avec l'ID et le Titre
        onPress={() => {
          navigation.navigate('Chat', { 
            id: item._id || item.id, 
            title: chatTitle 
          });
        }}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{chatTitle.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.itemTitle}>{chatTitle}</Text>
          </View>
          <Text style={styles.itemSub} numberOfLines={1}>
            {item.lastMessage?.content || 'Cliquez pour discuter...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#205C3B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.noData}>Aucune discussion pour le moment. 💬</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#F8F9FA' },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 20, color: '#205C3B', marginTop: 10 },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  avatarText: { color: '#205C3B', fontWeight: 'bold', fontSize: 18 },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  itemSub: { fontSize: 14, color: '#888' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noData: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 50 },
});