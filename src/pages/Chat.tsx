import React, { useEffect, useState, useRef, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../../App';

export default function Chat() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const route = useRoute<any>();
  // On récupère participants en plus pour identifier l'autre utilisateur
  const { id, title, participants } = route.params; 
  
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false); // État Online
  const flatListRef = useRef<FlatList>(null);
  const socket = getSocket();

  const conversationIdStr = id?._id || id;
  const myId = (user?._id || user?.id)?.toString();

  useEffect(() => {
    if (!user || !socket) return;
    
    // 1. Rejoindre la room et marquer comme lu
    socket.emit('joinConversation', conversationIdStr);
    socket.emit('readMessages', { conversationId: conversationIdStr, userId: myId });

    // 2. Écouter le statut en ligne global
    socket.on('userOnlineStatus', (onlineUserIds: string[]) => {
      const otherId = participants?.find((p: any) => (p?._id || p).toString() !== myId);
      if (otherId) {
        setIsOtherOnline(onlineUserIds.includes(otherId.toString()));
      }
    });

    // 3. Écouter les nouveaux messages
    const handleReceive = (msg: any) => {
      const msgConvId = (msg.conversationId?._id || msg.conversationId).toString();
      if (msgConvId === conversationIdStr.toString()) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        socket.emit('readMessages', { conversationId: conversationIdStr, userId: myId });
      }
    };

    // 4. Écouter les statuts (typing / read)
    const handleTyping = (data: any) => {
      if (data.conversationId.toString() === conversationIdStr.toString() && data.userId !== myId) {
        setOtherIsTyping(data.typing);
      }
    };

    const handleRead = (data) => {
      if (data.conversationId.toString() === conversationIdStr.toString() && data.userId !== myId) {
        setMessages(prev => prev.map(m => {
          const isMine = (m.senderId?._id || m.senderId) === myId;
          if (isMine && !m.readAt) {
            return { ...m, readAt: new Date().toISOString() };
          }
          return m;
        }));
      }
    };

    socket.on('receiveMessage', handleReceive);
    socket.on('displayTyping', handleTyping);
    socket.on('markMessagesAsRead', handleRead);

    // Charger l'historique
    api.get(`/messages/conversation/${conversationIdStr}`).then(r => setMessages(r.data));

    return () => { 
      socket.off('receiveMessage', handleReceive); 
      socket.off('displayTyping', handleTyping);
      socket.off('markMessagesAsRead', handleRead);
      socket.off('userOnlineStatus');
    };
  }, [conversationIdStr, user]);

  const send = async () => {
    if (!text.trim()) return;
    const myId = user._id || user.id;
    try {
      socket?.emit('typing', { conversationId: conversationIdStr, userId: myId, typing: false });
      await api.post('/messages', { 
        conversationId: conversationIdStr, 
        senderId: myId, 
        content: text.trim() 
      });
      setText('');
    } catch (err) { console.error("Erreur envoi:", err); }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMine = (item.senderId?._id || item.senderId) === (user?._id || user?.id);
    return (
      <View style={[styles.messageRow, isMine ? styles.myRow : styles.theirRow]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>{item.content}</Text>
          {isMine && (
            <View style={styles.statusLine}>
              <Ionicons 
                name={item.readAt ? "checkmark-done" : "checkmark"} 
                size={16} 
                color={item.readAt ? "#067bbe" : "#999"} 
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#205C3B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{title || "Discussion"}</Text>
          {otherIsTyping ? (
            <Text style={[styles.headerStatus, { color: '#205C3B', fontStyle: 'italic' }]}>en train d'écrire...</Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                width: 7, 
                height: 7, 
                borderRadius: 4, 
                backgroundColor: isOtherOnline ? '#4CAF50' : '#BDBDBD', 
                marginRight: 5 
              }} />
              <Text style={[styles.headerStatus, { color: isOtherOnline ? '#4CAF50' : '#888' }]}>
                {isOtherOnline ? "En ligne" : "Hors ligne"}
              </Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.flexContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listPadding}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </TouchableWithoutFeedback>

        <View style={styles.inputArea}>
          <View style={styles.inputInner}>
            <TextInput 
              style={styles.textInput} 
              value={text} 
              onChangeText={(v) => {
                setText(v);
                socket?.emit('typing', { conversationId: conversationIdStr, userId: user._id || user.id, typing: v.length > 0 });
              }} 
              placeholder="Message..."
              multiline
            />
            <TouchableOpacity onPress={send} style={styles.sendBtn}>
              <Ionicons name="send" size={20} color="#205C3B" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flexContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 12 },
  listPadding: { padding: 15 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  myRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  myBubble: { backgroundColor: '#205C3B', borderBottomRightRadius: 2 },
  theirBubble: { backgroundColor: '#F0F0F0', borderBottomLeftRadius: 2 },
  messageText: { fontSize: 16 },
  myText: { color: '#fff' },
  theirText: { color: '#000' },
  statusLine: { alignSelf: 'flex-end', marginTop: 2 },
  inputArea: { padding: 10, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#fff' },
  inputInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 25, paddingHorizontal: 15 },
  textInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  sendBtn: { marginLeft: 10 }
});