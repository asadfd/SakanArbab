import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllContractsWithDetails, getOverdueTenants, getAgent } from '../../database/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['ACTIVE', 'ALL', 'ENDED'];

const STATUS_STYLE = {
  ACTIVE: { bg: '#EAF3DE', text: '#1D9E75' },
  ENDED:  { bg: '#F1EFE8', text: '#888780' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtAmount(amount, currency) {
  const n = parseFloat(amount ?? 0);
  return `${currency} ${isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const EMPTY_MESSAGES = {
  ACTIVE: 'No active contracts.\nTap "+ New" to create one.',
  ENDED:  'No ended contracts yet.',
  ALL:    'No contracts yet.\nTap "+ New" to create one.',
};

// ─── Contract Card ────────────────────────────────────────────────────────────

function ContractCard({ contract, currency, isOverdue, onPress }) {
  const ss = STATUS_STYLE[contract.status] ?? STATUS_STYLE.ENDED;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      {/* Top row: name + badges */}
      <View style={styles.cardTopRow}>
        <Text style={styles.tenantName} numberOfLines={1}>{contract.tenant_name}</Text>
        <View style={styles.badgesRow}>
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>OVERDUE</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
            <Text style={[styles.statusBadgeText, { color: ss.text }]}>{contract.status}</Text>
          </View>
        </View>
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <MaterialCommunityIcons name="office-building" size={12} color="#888780" />
        <Text style={styles.breadcrumbText} numberOfLines={1}>
          {contract.property_name ?? '—'}  ›  {contract.room_name ?? '—'}  ›  {contract.bed_label ?? '—'}
        </Text>
      </View>

      {/* Details row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="cash" size={13} color="#888780" />
          <Text style={styles.detailText}>{fmtAmount(contract.monthly_rent, currency)} / mo</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="calendar-arrow-right" size={13} color="#888780" />
          <Text style={styles.detailText}>{fmtDate(contract.check_in_date)}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="calendar-clock" size={13} color="#888780" />
          <Text style={styles.detailText}>Due: {ordinal(contract.payment_due_day ?? 1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContractsListScreen({ navigation }) {
  const [activeTab, setActiveTab]     = useState('ACTIVE');
  const [contracts, setContracts]     = useState([]);
  const [overdueIds, setOverdueIds]   = useState(new Set());
  const [search, setSearch]           = useState('');
  const [currency, setCurrency]       = useState('AED');
  const [loading, setLoading]         = useState(true);

  const loadFor = useCallback(async (tab) => {
    setLoading(true);
    try {
      const statusFilter = tab === 'ALL' ? null : tab;
      const [contractList, overdue, agent] = await Promise.all([
        getAllContractsWithDetails(statusFilter),
        getOverdueTenants(),
        getAgent(),
      ]);
      setContracts(contractList);
      setOverdueIds(new Set(overdue.map((c) => c.id)));
      setCurrency(agent?.currency ?? 'AED');
    } catch (err) {
      console.error('Contracts load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadFor(activeTab); }, [loadFor, activeTab]));

  const filtered = contracts.filter((c) =>
    c.tenant_name?.toLowerCase().includes(search.toLowerCase())
  );

  function handleTabChange(tab) {
    setSearch('');
    setActiveTab(tab);
    loadFor(tab);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tenancy Contracts</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('CreateContractScreen')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color="#888780" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by tenant name..."
          placeholderTextColor="#AAAAAA"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={17} color="#AAAAAA" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#26215C" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ContractCard
              contract={item}
              currency={currency}
              isOverdue={overdueIds.has(item.id)}
              onPress={() => navigation.navigate('ContractDetailScreen', { contractId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={52} color="#E0E0E0" />
              <Text style={styles.emptyText}>{EMPTY_MESSAGES[activeTab]}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#26215C',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1D9E75',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  newBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive:     { borderBottomColor: '#26215C' },
  tabText:       { fontSize: 13, fontWeight: '600', color: '#888780' },
  tabTextActive: { color: '#26215C' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E', padding: 0 },

  listContent:      { padding: 16, paddingTop: 12 },
  listContentEmpty: { flex: 1 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tenantName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', flex: 1, marginRight: 8 },

  badgesRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  overdueBadge:     { backgroundColor: '#FCEBEB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  overdueBadgeText: { fontSize: 10, fontWeight: '700', color: '#E24B4A', letterSpacing: 0.5 },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  breadcrumbText: { fontSize: 12, color: '#888780', flex: 1 },

  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#555' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
});
