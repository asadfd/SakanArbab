import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getAgent,
  getAllProperties,
  getAllPayments,
  getPaymentsThisMonth,
  getOverdueTenants,
  getContractById,
  ensureMonthlyPayments,
} from '../../database/database';
import db from '../../database/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name?.trim()) return '??';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatAmount(amount) {
  return Number(amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function currentMonthLabel() {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Data loader ─────────────────────────────────────────────────────────────

function loadDashboardData() {
  // Auto-generate pending payments for all active contracts up to current month
  ensureMonthlyPayments();

  const agent = getAgent();

  const totalBeds = db.getFirstSync(`SELECT COUNT(*) AS c FROM bed_units`)?.c ?? 0;
  const occupiedBeds = db.getFirstSync(
    `SELECT COUNT(*) AS c FROM bed_units WHERE status = 'OCCUPIED'`
  )?.c ?? 0;
  const availableBeds = db.getFirstSync(
    `SELECT COUNT(*) AS c FROM bed_units WHERE status = 'AVAILABLE'`
  )?.c ?? 0;
  const totalProperties = getAllProperties().length;

  const overdueList = getOverdueTenants();

  const thisMonthPayments = getPaymentsThisMonth();
  const totalCollected = thisMonthPayments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Last 5 payments with tenant name joined
  const recentPayments = db.getAllSync(
    `SELECT p.*, tc.tenant_name
     FROM payments p
     LEFT JOIN tenancy_contracts tc ON tc.id = p.tenancy_id
     ORDER BY p.created_at DESC
     LIMIT 5`
  );

  return {
    agent,
    totalBeds,
    occupiedBeds,
    availableBeds,
    totalProperties,
    overdueList,
    thisMonthPayments,
    totalCollected,
    recentPayments,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setData(loadDashboardData());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function onRefresh() {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }

  if (!data) return null;

  const {
    agent,
    totalBeds,
    occupiedBeds,
    availableBeds,
    totalProperties,
    overdueList,
    thisMonthPayments,
    totalCollected,
    recentPayments,
  } = data;

  const currency = agent?.currency ?? 'AED';
  const businessName = agent?.business_name ?? 'My Business';
  const agentName = agent?.full_name ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#26215C" />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {agent?.business_logo_uri ? (
            <Image source={{ uri: agent.business_logo_uri }} style={styles.logoImage} />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{getInitials(businessName)}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.businessName} numberOfLines={1}>{businessName}</Text>
            {!!agentName && <Text style={styles.agentName} numberOfLines={1}>{agentName}</Text>}
          </View>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('OverdueScreen')}
        >
          <MaterialCommunityIcons
            name={overdueList.length > 0 ? 'bell-badge' : 'bell-outline'}
            size={24}
            color={overdueList.length > 0 ? '#E24B4A' : '#26215C'}
          />
        </TouchableOpacity>
      </View>

      {/* ── Stats Cards ── */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard label="Total Beds" value={totalBeds} iconName="bed" color="#7F77DD" bg="#EEEDFE" />
          <StatCard label="Occupied" value={occupiedBeds} iconName="account-check" color="#E24B4A" bg="#FCEBEB" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Available" value={availableBeds} iconName="check-circle-outline" color="#1D9E75" bg="#EAF3DE" />
          <StatCard label="Properties" value={totalProperties} iconName="office-building" color="#378ADD" bg="#EAF2FD" />
        </View>
      </View>

      {/* ── This Month ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <Text style={styles.sectionSubtitle}>{currentMonthLabel()}</Text>
        </View>
        <View style={styles.monthCard}>
          <View style={styles.monthRow}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color="#1D9E75" />
            <Text style={styles.monthLabel}>Total Collected</Text>
            <Text style={styles.monthValue}>
              {currency} {formatAmount(totalCollected)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.monthRow}>
            <MaterialCommunityIcons name="receipt" size={20} color="#378ADD" />
            <Text style={styles.monthLabel}>Payments Logged</Text>
            <Text style={styles.monthValue}>{thisMonthPayments.length}</Text>
          </View>
        </View>
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <QuickActionBtn
            label="+ Property"
            onPress={() => navigation.navigate('Properties', { screen: 'PropertiesListScreen' })}
          />
          <QuickActionBtn
            label="+ Contract"
            onPress={() => navigation.navigate('Contracts', { screen: 'CreateContractScreen' })}
          />
          <QuickActionBtn
            label="+ Payment"
            onPress={() => navigation.navigate('Payments', { screen: 'LogPaymentScreen' })}
          />
        </View>
      </View>

      {/* ── Recent Payments ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments', { screen: 'PaymentsListScreen' })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentPayments.length === 0 ? (
          <Text style={styles.emptyText}>No payments recorded yet.</Text>
        ) : (
          recentPayments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentTxn} numberOfLines={1}>{p.txn_no}</Text>
                <Text style={styles.paymentTenant} numberOfLines={1}>
                  {p.tenant_name ?? '—'}
                </Text>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>
                  {currency} {formatAmount(p.amount)}
                </Text>
                <Text style={styles.paymentDate}>{formatDate(p.payment_date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, iconName, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickActionBtn({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    paddingBottom: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#26215C',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEEDFE',
  },
  initialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7F77DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  businessName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  agentName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  bellBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#888780',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888780',
  },
  viewAll: {
    fontSize: 13,
    color: '#26215C',
    fontWeight: '600',
  },

  // This Month
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  monthLabel: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
  },
  monthValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#26215C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Recent Payments
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentLeft: {
    flex: 1,
    marginRight: 12,
  },
  paymentTxn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  paymentTenant: {
    fontSize: 12,
    color: '#888780',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D9E75',
  },
  paymentDate: {
    fontSize: 11,
    color: '#888780',
    marginTop: 2,
  },
  emptyText: {
    color: '#888780',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
