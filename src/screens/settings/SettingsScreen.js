import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen({ navigation }) {
  async function handleResetPin() {
    await SecureStore.deleteItemAsync('app_pin');
    navigation.getParent()?.getParent()?.replace('Auth');
  }

  async function handleLock() {
    navigation.getParent()?.getParent()?.replace('Auth');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <TouchableOpacity style={styles.lockButton} onPress={handleLock}>
        <Text style={styles.lockText}>Lock App</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={handleResetPin}>
        <Text style={styles.resetText}>Reset PIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 16 },
  lockButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
    backgroundColor: '#26215C',
  },
  lockText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  resetText: {
    color: '#E24B4A',
    fontSize: 15,
    fontWeight: '600',
  },
});
