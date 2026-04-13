import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getAgent, getOverdueTenantsWithDetails } from '../../database/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function daysOverdue(paymentDueDay) {
  const today = dayjs();
  const dueDate = today.date(paymentDueDay);
  const diff = today.diff(dueDate, 'day');
  return diff > 0 ? diff : 1;
}

function formatAmount(amount) {
  return Number(amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OverdueScreen({ navigation }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('AED');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const [agent, overdue] = await Promise.all([
            getAgent(),
            getOverdueTenantsWithDetails(),
          ]);
          if (cancelled) return;
          setCurrency(agent?.currency ?? 'AED');
          setTenants(overdue);
        } catch (err) {
          console.error('Overdue load error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Overdue Payments</Text>
          <Text style={styles.headerSubtitle}>Tenants past their payment due date</Text>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#26215C" />
        </View>
      ) : tenants.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => String(item.contract_id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OverdueCard
              item={item}
              currency={currency}
              onViewContract={() =>
                navigation.navigate('ContractDetailScreen', { contractId: item.contract_id })
              }
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Overdue Card ─────────────────────────────────────────────────────────────

function OverdueCard({ item, currency, onViewContract }) {
  const days = daysOverdue(item.payment_due_day);

  return (
    <View style={styles.card}>
      {/* Top row: name + overdue badge */}
      <View style={styles.cardHeader}>
        <Text style={styles.tenantName} numberOfLines={1}>{item.tenant_name}</Text>
        <View style={styles.overdueBadge}>
          <Text style={styles.overdueBadgeText}>{days} day{days !== 1 ? 's' : ''} overdue</Text>
        </View>
      </View>

      {/* Location breadcrumb */}
      <View style={styles.breadcrumb}>
        <MaterialCommunityIcons name="office-building" size={13} color="#888780" />
        <Text style={styles.breadcrumbText} numberOfLines={1}>
          {item.property_name}
          <Text style={styles.breadcrumbSep}> › </Text>
          {item.room_name}
          <Text style={styles.breadcrumbSep}> › </Text>
          {item.bed_label}
        </Text>
      </View>

      {/* Rent + due day */}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="cash" size={14} color="#1D9E75" />
          <Text style={styles.metaText}>
            {currency} {formatAmount(item.monthly_rent)} / month
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="calendar-clock" size={14} color="#BA7517" />
          <Text style={styles.metaText}>
            Due on {ordinal(item.payment_due_day)} of each month
          </Text>
        </View>
      </View>

      {/* Action */}
      <TouchableOpacity style={styles.viewBtn} onPress={onViewContract} activeOpacity={0.8}>
        <Text style={styles.viewBtnText}>View Contract</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#26215C" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.centered}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name="check-circle" size={56} color="#1D9E75" />
      </View>
      <Text style={styles.emptyTitle}>All tenants are up to date!</Text>
      <Text style={styles.emptySubtitle}>No overdue payments this month</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E24B4A',
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    padding: 2,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },

  // List
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A2E',
    flex: 1,
    marginRight: 10,
  },
  overdueBadge: {
    backgroundColor: '#FCEBEB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  overdueBadgeText: {
    color: '#E24B4A',
    fontSize: 11,
    fontWeight: '700',
  },

  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#888780',
    flex: 1,
  },
  breadcrumbSep: {
    color: '#C0BFBA',
  },

  // Meta
  cardMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#1A1A2E',
  },

  // View button
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#26215C',
    borderRadius: 8,
    paddingVertical: 9,
    gap: 6,
  },
  viewBtnText: {
    color: '#26215C',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty / Loading
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888780',
  },
});
