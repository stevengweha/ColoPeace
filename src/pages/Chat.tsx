import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

export default function Chat({ user }: { user: any }) {
  const route = useRoute<any>();
  const { id } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!user) return;
    connectSocket(user._id || user.id);
    const socket = getSocket();
    socket?.emit('joinConversation', id);

    const handleReceive = (msg: any) => setMessages(prev => [...prev, msg]);
    socket?.on('receiveMessage', handleReceive);

    api.get(`/messages/conversation/${id}`).then(r => setMessages(r.data)).catch(console.error);

    return () => socket?.off('receiveMessage', handleReceive);
  }, [id, user]);

  const send = async () => {
    if (!text) return;
    const message = { conversationId: id, sender: user._id || user.id, text, createdAt: new Date() };
    try {
      await api.post('/messages', message);
      getSocket()?.emit('sendMessage', message);
      setMessages(prev => [...prev, message]);
      setText('');
    } catch (err) { console.error(err); }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => <Text style={styles.msg}><Text style={{ fontWeight: 'bold' }}>{item.senderName || item.sender}</Text>: {item.text}</Text>}
      />
      <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message..." />
      <Button title="Envoyer" onPress={send} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  msg: { padding: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 },
});
