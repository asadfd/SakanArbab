import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        <TouchableOpacity style={styles.menuItem} onPress={handleLock} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#EEEDFE' }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#26215C" />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Lock App</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#C0BFBA" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleResetPin} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#FCEBEB' }]}>
            <MaterialCommunityIcons name="lock-reset" size={20} color="#E24B4A" />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Reset PIN</Text>
            <Text style={styles.menuSub}>You will need to set a new PIN</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#C0BFBA" />
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
});
