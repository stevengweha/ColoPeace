import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WorkInProgress from '../components/PendingFeature';

export default function StatsScreen() {
  return (
    <View style={{ flex: 1 }}>
       {/* Ton header ici */}
       <WorkInProgress featureName="Course" />
    </View>
  );
}