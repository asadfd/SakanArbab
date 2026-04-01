import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ContractDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ContractDetailScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, color: '#1A1A2E' },
});
