import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllProperties, getPLByProperty, getPLSummary, getAgent } from '../../database/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS  = Array.from({ length: 10 }, (_, i) => 2020 + i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ymToDisplay(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtAmount(amount, currency) {
  const n = parseFloat(amount ?? 0);
  return `${currency} ${isNaN(n) ? '0.00' : Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function marginPct(net, income) {
  if (!income || income === 0) return null;
  return ((net / income) * 100).toFixed(1);
}

// ─── Month Picker Modal ───────────────────────────────────────────────────────

function MonthPickerModal({ visible, value, onConfirm, onClose }) {
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempYear, setTempYear]   = useState(new Date().getFullYear());

  function onShow() {
    if (value) {
      const [y, m] = value.split('-');
      setTempMonth(Number(m));
      setTempYear(Number(y));
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} onShow={onShow}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Month</Text>
          <View style={styles.datePickerRow}>
            <View style={[styles.datePickerCol, { flex: 2 }]}>
              <Text style={styles.datePickerColLabel}>Month</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={tempMonth} onValueChange={setTempMonth} style={styles.picker} dropdownIconColor="#26215C">
                  {MONTHS.map((m, i) => <Picker.Item key={m} label={m} value={i + 1} />)}
                </Picker>
              </View>
            </View>
            <View style={styles.datePickerCol}>
              <Text style={styles.datePickerColLabel}>Year</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={tempYear} onValueChange={setTempYear} style={styles.picker} dropdownIconColor="#26215C">
                  {YEARS.map((y) => <Picker.Item key={y} label={String(y)} value={y} />)}
                </Picker>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(`${tempYear}-${String(tempMonth).padStart(2, '0')}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── P&L Row inside a card ────────────────────────────────────────────────────

function PLRow({ label, value, color, bold, dark }) {
  return (
    <View style={styles.plRow}>
      <Text style={[styles.plLabel, dark && { color: '#555' }, bold && { fontWeight: '700', color: '#1A1A2E' }]}>
        {label}
      </Text>
      <Text style={[styles.plValue, { color }, bold && { fontSize: 15, fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdvisoryScreen({ navigation }) {
  const [month, setMonth]               = useState(currentYM());
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [properties, setProperties]     = useState([]);
  const [summary, setSummary]           = useState(null);
  const [propertyPLs, setPropertyPLs]   = useState([]);
  const [currency, setCurrency]         = useState('AED');
  const [loading, setLoading]           = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const a   = getAgent();
    setCurrency(a?.currency ?? 'AED');
    const props = getAllProperties();
    setProperties(props);

    // Per-property P&L (add real net = income - owner_cost - commission - expenses)
    const plList = props.map((p) => {
      const pl = getPLByProperty(p.id, month);
      return {
        ...p,
        income:     pl.income,
        owner_cost: pl.owner_cost,
        commission: pl.commission,
        expenses:   pl.expenses,
        net:        pl.income - pl.owner_cost - pl.commission - pl.expenses,
      };
    });
    setPropertyPLs(plList);

    // Overall summary — sum across all properties
    const overall = {
      total_income:     plList.reduce((s, p) => s + p.income,     0),
      total_owner_cost: plList.reduce((s, p) => s + p.owner_cost, 0),
      total_commission: plList.reduce((s, p) => s + p.commission, 0),
      total_expenses:   plList.reduce((s, p) => s + p.expenses,   0),
    };
    overall.net_profit = overall.total_income - overall.total_owner_cost - overall.total_commission - overall.total_expenses;
    setSummary(overall);

    setLoading(false);
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Best performer — property with highest net
  const bestProperty = propertyPLs.length > 0
    ? propertyPLs.reduce((best, p) => (p.net > best.net ? p : best), propertyPLs[0])
    : null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>P&L Advisory</Text>
        <Text style={styles.headerSubtitle}>Your profitability overview</Text>
      </View>

      {/* Month selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#26215C" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthLabel}
          onPress={() => setMonthModalOpen(true)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="calendar-month" size={16} color="#26215C" />
          <Text style={styles.monthLabelText}>{ymToDisplay(month)}</Text>
          <MaterialCommunityIcons name="chevron-down" size={15} color="#26215C" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setMonth((m) => shiftMonth(m, +1))}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="chevron-right" size={24} color="#26215C" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#26215C" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Overall Summary Card ──────────────────────────────────── */}
          {summary && (
            <View style={styles.overallCard}>
              <View style={styles.overallTitleRow}>
                <MaterialCommunityIcons name="chart-bar" size={18} color="#26215C" />
                <Text style={styles.overallTitle}>Overall — {ymToDisplay(month)}</Text>
              </View>

              <View style={styles.internalBadge}>
                <MaterialCommunityIcons name="eye-off-outline" size={12} color="#888780" />
                <Text style={styles.internalBadgeText}>Internal — Not shown to tenants</Text>
              </View>

              <View style={styles.divider} />

              <PLRow
                label="Total Income Collected"
                value={fmtAmount(summary.total_income, currency)}
                color="#1D9E75"
              />
              <PLRow
                label="Total Owner Costs"
                value={`− ${fmtAmount(summary.total_owner_cost, currency)}`}
                color="#E24B4A"
              />
              <PLRow
                label="Total Commission"
                value={`− ${fmtAmount(summary.total_commission, currency)}`}
                color="#BA7517"
              />
              <PLRow
                label="Total Expenses"
                value={`− ${fmtAmount(summary.total_expenses, currency)}`}
                color="#E24B4A"
              />

              <View style={styles.divider} />

              <View style={styles.netRow}>
                <Text style={styles.netLabel}>NET PROFIT</Text>
                <Text style={[styles.netValue, { color: summary.net_profit >= 0 ? '#1D9E75' : '#E24B4A' }]}>
                  {summary.net_profit < 0 ? '− ' : ''}{fmtAmount(summary.net_profit, currency)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Per-Property Cards ────────────────────────────────────── */}
          {properties.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="office-building-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>No properties found.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>By Property</Text>
              {propertyPLs.map((p) => {
                const isBest  = bestProperty?.id === p.id && p.net > 0;
                const margin  = marginPct(p.net, p.income);

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.propertyCard, isBest && styles.propertyCardBest]}
                    onPress={() => navigation.navigate('RoomPLScreen', { property: p })}
                    activeOpacity={0.85}
                  >
                    {/* Title row */}
                    <View style={styles.propertyTitleRow}>
                      <Text style={styles.propertyName} numberOfLines={1}>{p.name}</Text>
                      <View style={styles.propertyBadges}>
                        {isBest && (
                          <View style={styles.bestBadge}>
                            <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.bestBadgeText}>Best</Text>
                          </View>
                        )}
                        {margin !== null && (
                          <View style={[styles.marginBadge, { backgroundColor: p.net >= 0 ? '#EAF3DE' : '#FCEBEB' }]}>
                            <Text style={[styles.marginBadgeText, { color: p.net >= 0 ? '#1D9E75' : '#E24B4A' }]}>
                              {p.net < 0 ? '−' : ''}{Math.abs(Number(margin))}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <PLRow dark label="Income"     value={fmtAmount(p.income,     currency)} color="#1D9E75" />
                    <PLRow dark label="Owner Cost" value={`− ${fmtAmount(p.owner_cost, currency)}`} color="#E24B4A" />
                    <PLRow dark label="Commission" value={`− ${fmtAmount(p.commission, currency)}`} color="#BA7517" />
                    <PLRow dark label="Expenses"   value={`− ${fmtAmount(p.expenses,   currency)}`} color="#E24B4A" />

                    <View style={[styles.divider, { backgroundColor: '#F0F0F0' }]} />

                    <PLRow
                      dark bold
                      label="Net"
                      value={(p.net < 0 ? '− ' : '') + fmtAmount(p.net, currency)}
                      color={p.net >= 0 ? '#1D9E75' : '#E24B4A'}
                    />

                    <View style={styles.viewDetailRow}>
                      <Text style={styles.viewDetailText}>View room breakdown</Text>
                      <MaterialCommunityIcons name="arrow-right" size={14} color="#26215C" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ── Internal disclaimer ───────────────────────────────────── */}
          <View style={styles.disclaimer}>
            <MaterialCommunityIcons name="lock-outline" size={13} color="#AAAAAA" />
            <Text style={styles.disclaimerText}>
              P&L figures are internal. Never share this screen with tenants.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Month picker modal */}
      <MonthPickerModal
        visible={monthModalOpen}
        value={month}
        onConfirm={(ym) => { setMonth(ym); setMonthModalOpen(false); }}
        onClose={() => setMonthModalOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    backgroundColor: '#26215C',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 18,
  },
  headerTitle:    { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  monthArrow: { padding: 8 },
  monthLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#F0F4FF', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  monthLabelText: { fontSize: 15, fontWeight: '700', color: '#26215C' },

  scrollContent: { padding: 16 },

  // ── Overall Card ──────────────────────────────────────────────────────────
  overallCard: {
    backgroundColor: '#26215C',
    borderRadius: 14, padding: 18,
    marginBottom: 20,
  },
  overallTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  overallTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  internalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  internalBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  netRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
  },
  netLabel: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
  netValue: { fontSize: 20, fontWeight: '800' },

  // P&L Row — used in both overall (white text) and property cards (dark text)
  plRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 7,
  },
  plLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  plValue: { fontSize: 13, fontWeight: '600' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#888780',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 10,
  },

  // ── Property Cards ────────────────────────────────────────────────────────
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 16,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  propertyCardBest: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  propertyTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  propertyName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', flex: 1 },
  propertyBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  bestBadgeText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  marginBadge:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  marginBadgeText: { fontSize: 11, fontWeight: '700' },

  viewDetailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, marginTop: 10,
  },
  viewDetailText: { fontSize: 12, color: '#26215C', fontWeight: '600' },

  // ── Disclaimer ────────────────────────────────────────────────────────────
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#F8F8F8',
    borderRadius: 8, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  disclaimerText: {
    flex: 1, fontSize: 12, color: '#AAAAAA',
    fontStyle: 'italic', lineHeight: 18,
  },

  emptyState: {
    alignItems: 'center', paddingVertical: 60, gap: 12,
  },
  emptyText: { fontSize: 14, color: '#AAAAAA' },

  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:        { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  datePickerRow:     { flexDirection: 'row', gap: 8, marginBottom: 20 },
  datePickerCol:     { flex: 1 },
  datePickerColLabel:{ fontSize: 12, fontWeight: '600', color: '#888780', textAlign: 'center', marginBottom: 4 },
  pickerWrapper:     { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#F8F8F8', overflow: 'hidden' },
  picker:            { color: '#1A1A2E', height: 50 },
  confirmBtn:        { backgroundColor: '#26215C', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText:    { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
