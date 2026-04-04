import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

function MenuItem({ icon, color, bg, label, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {!!subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#C0BFBA" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  async function handleResetPin() {
    await SecureStore.deleteItemAsync('app_pin');
    navigation.getParent()?.getParent()?.replace('Auth');
  }

  async function handleLock() {
    navigation.getParent()?.getParent()?.replace('Auth');
  }

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to enter your PIN to access the app again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('app_pin');
            navigation.getParent()?.getParent()?.replace('Auth');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <MenuItem
          icon="domain"
          color="#26215C"
          bg="#EEEDFE"
          label="Business Profile"
          subtitle="Edit your business details & logo"
          onPress={() => navigation.navigate('BusinessProfileScreen')}
        />

        <Text style={styles.sectionLabel}>REPORTS</Text>
        <MenuItem
          icon="chart-bar"
          color="#26215C"
          bg="#EEEDFE"
          label="P&L Advisory"
          subtitle="Profitability overview by property"
          onPress={() => navigation.navigate('AdvisoryScreen')}
        />
        <MenuItem
          icon="cash-minus"
          color="#E24B4A"
          bg="#FCEBEB"
          label="Expenses"
          subtitle="Track property expenses"
          onPress={() => navigation.navigate('ExpensesScreen')}
        />

        <Text style={styles.sectionLabel}>DATA</Text>
        <MenuItem
          icon="cloud-upload-outline"
          color="#378ADD"
          bg="#EAF2FD"
          label="Backup & Restore"
          subtitle="Export or import your data"
          onPress={() => navigation.navigate('BackupScreen')}
        />

        <Text style={styles.sectionLabel}>SECURITY</Text>
        <MenuItem
          icon="lock-outline"
          color="#26215C"
          bg="#EEEDFE"
          label="Lock App"
          subtitle="Lock without signing out"
          onPress={handleLock}
        />
        <MenuItem
          icon="lock-reset"
          color="#BA7517"
          bg="#FEF3C7"
          label="Reset PIN"
          subtitle="You will need to set a new PIN"
          onPress={handleResetPin}
        />

        <View style={{ height: 16 }} />

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={20} color="#E24B4A" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    backgroundColor: '#26215C',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 18,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  content: { padding: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  menuSub: { fontSize: 12, color: '#888780', marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FCEBEB',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E24B4A',
  },
});
