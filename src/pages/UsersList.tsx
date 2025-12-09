import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import api from '../services/api';

export default function UsersList() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Utilisateurs</Text>
      <FlatList
        data={users}
        keyExtractor={item => item._id || item.id}
        renderItem={({ item }) => <Text style={styles.item}>{item.name || item.email}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
