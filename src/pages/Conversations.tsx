import React, { useEffect, useState, useContext } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../contexts/UserContext';
// ❌ Retrait de l'importation de RootLayout : il est géré par App.js
// import RootLayout from '../RootLayout'; 

export default function Conversations() {
  const { user } = useContext(UserContext);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        // Assurez-vous que l'ID est bien passé pour filtrer les conversations de l'utilisateur
        const res = await api.get(`/conversations/user/${user._id || user.id}`);
        setConversations(res.data);
      } catch (err: any) {
        console.error('Erreur récupération conversations:', err);
        Alert.alert('Erreur', 'Impossible de récupérer les conversations.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => {
    
    // 💡 AMÉLIORATION : Tente d'identifier l'autre participant
    // Supposons que 'participants' est un tableau d'objets { _id, name }
    const otherParticipant = item.participants?.find((p: any) => p._id !== (user._id || user.id));
    const chatTitle = otherParticipant?.name || item.title || 'Conversation de groupe';

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Chat' as never, { id: item._id || item.id, title: chatTitle } as never)
        }
        style={styles.itemContainer}
      >
        {/* 💡 AMÉLIORATION : Affichage du titre */}
        <Text style={styles.itemTitle}>{chatTitle}</Text>
        <Text style={styles.itemSub} numberOfLines={1}>
          {item.lastMessage?.content || 'Pas encore de message'}
        </Text>
      </TouchableOpacity>
    );
  };

  // --- Logique d'affichage du contenu ---
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#205C3B" />
      </View>
    );
  } 
  
  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.noData}>Aucune conversation pour le moment. 💬</Text>
      </View>
    );
  } 
  
  return (
    // 🎯 CORRECTION : Retourne le contenu nu, le RootLayout est externe
    <View style={styles.container}>
      <Text style={styles.title}>Boîte de réception</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 15, 
    backgroundColor: '#F0F4F7' // Légère couleur de fond pour un effet moderne
  },
  title: { 
    fontSize: 28, 
    fontWeight: '900', // Plus épais
    marginBottom: 20, 
    color: '#205C3B' // Couleur principale
  },
  itemContainer: {
    padding: 15,
    borderRadius: 12, // Bords plus arrondis
    backgroundColor: '#FFFFFF', // Fond blanc pour les items
    marginBottom: 12,
    // 💡 AMÉLIORATION : Ajout d'une légère ombre
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemTitle: { 
    fontSize: 18, 
    fontWeight: '700', // Plus d'emphase
    color: '#333' // Texte sombre
  },
  itemSub: { 
    fontSize: 14, 
    color: '#777', 
    marginTop: 4 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F0F4F7' 
  },
  noData: { 
    fontSize: 16, 
    color: '#999' 
  },
});