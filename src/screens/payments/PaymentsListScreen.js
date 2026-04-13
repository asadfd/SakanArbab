import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAllPaymentsWithDetails, insertEmailLog, getAgent } from '../../database/database';
import { generateReceiptPDF } from '../../services/pdfService';
import { sendReceiptEmail } from '../../services/emailService';

// ─── Enable LayoutAnimation on Android ───────────────────────────────────────

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  PAID:    { bg: '#EAF3DE', text: '#1D9E75' },
  PENDING: { bg: '#FAEEDA', text: '#BA7517' },
  FAILED:  { bg: '#FCEBEB', text: '#E24B4A' },
};

const AMOUNT_COLOR = {
  PAID:    '#1D9E75',
  PENDING: '#BA7517',
  FAILED:  '#E24B4A',
};

const MODE_STYLE = {
  CASH:   { bg: '#EAF3DE', text: '#1D9E75' },
  UPI:    { bg: '#EAF0FF', text: '#3B5CE4' },
  BANK:   { bg: '#F0F4FF', text: '#26215C' },
  CHEQUE: { bg: '#F8F0FF', text: '#7C3AED' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS  = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i);

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

function ymToDisplay(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Month/Year Picker Modal ──────────────────────────────────────────────────

function MonthYearModal({ visible, value, onConfirm, onClose }) {
  const today = new Date();
  const [tempMonth, setTempMonth] = useState(today.getMonth() + 1);
  const [tempYear, setTempYear]   = useState(today.getFullYear());

  function open() {
    if (value) {
      const [y, m] = value.split('-');
      setTempMonth(Number(m));
      setTempYear(Number(y));
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose} onShow={open}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Month</Text>
          <View style={styles.datePickerRow}>
            <View style={[styles.datePickerCol, { flex: 2 }]}>
              <Text style={styles.datePickerColLabel}>Month</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={tempMonth} onValueChange={setTempMonth} style={styles.picker} mode="dropdown" dropdownIconColor="#26215C">
                  {MONTHS.map((m, i) => <Picker.Item key={m} label={m} value={i + 1} />)}
                </Picker>
              </View>
            </View>
            <View style={styles.datePickerCol}>
              <Text style={styles.datePickerColLabel}>Year</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={tempYear} onValueChange={setTempYear} style={styles.picker} mode="dropdown" dropdownIconColor="#26215C">
                  {YEARS.map((y) => <Picker.Item key={y} label={String(y)} value={y} />)}
                </Picker>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => { onConfirm(`${tempYear}-${String(tempMonth).padStart(2, '0')}`); }}
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

// ─── Payment Card ─────────────────────────────────────────────────────────────

function PaymentCard({ payment, currency, agent, expanded, onToggle }) {
  const ss  = STATUS_STYLE[payment.status]  ?? STATUS_STYLE.PENDING;
  const ms  = MODE_STYLE[payment.payment_mode] ?? { bg: '#F0F0F0', text: '#555' };
  const amtColor = AMOUNT_COLOR[payment.status] ?? '#1A1A2E';
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      const pdf = await generateReceiptPDF(payment, { tenant_name: payment.tenant_name, tenant_email: payment.tenant_email, bed_label: payment.bed_label, property_name: payment.property_name }, agent);
      await sendReceiptEmail(pdf, payment, { tenant_name: payment.tenant_name, tenant_email: payment.tenant_email }, agent);
      await insertEmailLog({
        type:            'RECEIPT',
        tenancy_id:      payment.tenancy_id,
        recipient_email: payment.tenant_email,
        status:          'SENT',
        sent_at:         new Date().toISOString(),
      });
      Alert.alert('Sent', 'Receipt email sent successfully.');
    } catch (err) {
      await insertEmailLog({
        type:            'RECEIPT',
        tenancy_id:      payment.tenancy_id,
        recipient_email: payment.tenant_email ?? '',
        status:          'FAILED',
        sent_at:         new Date().toISOString(),
      });
      Alert.alert('Not Sent', err?.message ?? 'Email was not sent.');
    } finally {
      setResending(false);
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onToggle}
      activeOpacity={0.88}
    >
      {/* Main row */}
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <Text style={styles.txnNo} numberOfLines={1}>{payment.txn_no}</Text>
          <Text style={styles.tenantName} numberOfLines={1}>{payment.tenant_name ?? '—'}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{fmtDate(payment.payment_date)}</Text>
            {payment.payment_for_month ? (
              <Text style={styles.metaText}>· For: {ymToDisplay(payment.payment_for_month)}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amount, { color: amtColor }]}>
            {fmtAmount(payment.amount, currency)}
          </Text>
          <View style={styles.badgesCol}>
            <View style={[styles.badge, { backgroundColor: ss.bg }]}>
              <Text style={[styles.badgeText, { color: ss.text }]}>{payment.status}</Text>
            </View>
            {payment.payment_mode ? (
              <View style={[styles.badge, { backgroundColor: ms.bg }]}>
                <Text style={[styles.badgeText, { color: ms.text }]}>{payment.payment_mode}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Expanded section */}
      {expanded && (
        <View style={styles.expandedSection}>
          <View style={styles.expandedDivider} />
          {/* Bed info */}
          <View style={styles.expandedRow}>
            <MaterialCommunityIcons name="office-building" size={13} color="#888780" />
            <Text style={styles.expandedText} numberOfLines={1}>
              {payment.property_name ?? '—'}  ›  {payment.room_name ?? '—'}  ›  {payment.bed_label ?? '—'}
            </Text>
          </View>
          {payment.notes ? (
            <View style={styles.expandedRow}>
              <MaterialCommunityIcons name="note-text-outline" size={13} color="#888780" />
              <Text style={styles.expandedText}>{payment.notes}</Text>
            </View>
          ) : null}
          {payment.agent_name ? (
            <View style={styles.expandedRow}>
              <MaterialCommunityIcons name="account-tie" size={13} color="#888780" />
              <Text style={styles.expandedText}>{payment.agent_name}</Text>
            </View>
          ) : null}
          {/* Resend receipt */}
          {payment.tenant_email ? (
            <TouchableOpacity
              style={[styles.resendBtn, resending && { opacity: 0.6 }]}
              onPress={handleResend}
              disabled={resending}
              activeOpacity={0.85}
            >
              {resending
                ? <ActivityIndicator size="small" color="#26215C" />
                : <MaterialCommunityIcons name="email-send-outline" size={15} color="#26215C" />
              }
              <Text style={styles.resendBtnText}>
                {resending ? 'Opening mail...' : 'Resend Receipt'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentsListScreen() {
  const [payments, setPayments]     = useState([]);
  const [currency, setCurrency]     = useState('AED');
  const [agent, setAgent]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [filterOpen, setFilterOpen]       = useState(false);
  const [filterStatus, setFilterStatus]   = useState('ALL');
  const [filterMode, setFilterMode]       = useState('ALL');
  const [filterMonth, setFilterMonth]     = useState('');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, a] = await Promise.all([getAllPaymentsWithDetails(), getAgent()]);
      setPayments(list ?? []);
      setAgent(a);
      setCurrency(a?.currency ?? 'AED');
    } catch (err) {
      console.error('[PaymentsListScreen] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Apply filters locally ────────────────────────────────────────────────

  const filtered = payments.filter((p) => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus)             return false;
    if (filterMode   !== 'ALL' && p.payment_mode !== filterMode)         return false;
    if (filterMonth  && p.payment_for_month !== filterMonth)             return false;
    return true;
  });

  const totalPaid = filtered
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + parseFloat(p.amount ?? 0), 0);

  const hasActiveFilters = filterStatus !== 'ALL' || filterMode !== 'ALL' || !!filterMonth;

  function resetFilters() {
    setFilterStatus('ALL');
    setFilterMode('ALL');
    setFilterMonth('');
  }

  function toggleExpand(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function toggleFilterPanel() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilterOpen((v) => !v);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
        <TouchableOpacity
          style={[styles.filterIconBtn, hasActiveFilters && styles.filterIconBtnActive]}
          onPress={toggleFilterPanel}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={22}
            color={hasActiveFilters ? '#FFFFFF' : '#FFFFFF'}
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{fmtAmount(totalPaid, currency)}</Text>
          <Text style={styles.summaryLabel}>Total Collected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>Payments</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{MONTHS[new Date().getMonth()]}</Text>
          <Text style={styles.summaryLabel}>Current Month</Text>
        </View>
      </View>

      {/* Filter panel */}
      {filterOpen && (
        <View style={styles.filterPanel}>
          {/* Status */}
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chipRow}>
            {['ALL', 'PAID', 'PENDING', 'FAILED'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, filterStatus === s && styles.chipActive]}
                onPress={() => setFilterStatus(s)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mode */}
          <Text style={styles.filterLabel}>Payment Mode</Text>
          <View style={styles.chipRow}>
            {['ALL', 'CASH', 'UPI', 'BANK', 'CHEQUE'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, filterMode === m && styles.chipActive]}
                onPress={() => setFilterMode(m)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, filterMode === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month */}
          <Text style={styles.filterLabel}>Month</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity
              style={styles.monthField}
              onPress={() => setMonthPickerOpen(true)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="calendar-month" size={16} color="#888780" />
              <Text style={[styles.monthFieldText, !filterMonth && { color: '#AAAAAA' }]}>
                {filterMonth ? ymToDisplay(filterMonth) : 'All months'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="#888780" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {filterMonth ? (
              <TouchableOpacity onPress={() => setFilterMonth('')} style={styles.clearMonthBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#888780" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Reset */}
          {hasActiveFilters && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.8}>
              <MaterialCommunityIcons name="refresh" size={15} color="#E24B4A" />
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
            <PaymentCard
              payment={item}
              currency={currency}
              agent={agent}
              expanded={expandedId === item.id}
              onToggle={() => toggleExpand(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cash-remove" size={52} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                {hasActiveFilters ? 'No payments match the current filters.' : 'No payments yet.'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={resetFilters} style={styles.resetBtnInline}>
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Month picker modal */}
      <MonthYearModal
        visible={monthPickerOpen}
        value={filterMonth || currentYM()}
        onConfirm={(ym) => { setFilterMonth(ym); setMonthPickerOpen(false); }}
        onClose={() => setMonthPickerOpen(false)}
      />
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
  filterIconBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  filterIconBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterDot: {
    position: 'absolute', top: 4, right: 4,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#1D9E75',
  },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  summaryLabel:   { fontSize: 11, color: '#888780' },
  summaryDivider: { width: 1, backgroundColor: '#E8E8E8', marginHorizontal: 4 },

  filterPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#888780', marginBottom: 8, marginTop: 4 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#F8F8F8',
  },
  chipActive:     { backgroundColor: '#26215C', borderColor: '#26215C' },
  chipText:       { fontSize: 12, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#FFFFFF' },
  monthRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  monthField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F8F8F8',
  },
  monthFieldText: { flex: 1, fontSize: 14, color: '#1A1A2E' },
  clearMonthBtn:  { padding: 4 },
  resetBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  resetBtnInline: { marginTop: 12 },
  resetBtnText:   { fontSize: 13, fontWeight: '600', color: '#E24B4A' },

  listContent:      { padding: 16 },
  listContentEmpty: { flex: 1 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardMain:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft:   { flex: 1, marginRight: 12 },
  txnNo:      { fontSize: 13, fontWeight: '700', color: '#1A1A2E', fontVariant: ['tabular-nums'], letterSpacing: 0.3 },
  tenantName: { fontSize: 14, color: '#26215C', fontWeight: '600', marginTop: 2 },
  metaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  metaText:   { fontSize: 11, color: '#888780' },
  cardRight:  { alignItems: 'flex-end', gap: 6 },
  amount:     { fontSize: 16, fontWeight: '800' },
  badgesCol:  { alignItems: 'flex-end', gap: 4 },
  badge:      { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  expandedSection: { marginTop: 12 },
  expandedDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 },
  expandedRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 7 },
  expandedText:    { fontSize: 12, color: '#555', flex: 1 },
  resendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1, borderColor: '#26215C', borderRadius: 8,
    paddingVertical: 9, marginTop: 6,
  },
  resendBtnText: { fontSize: 13, fontWeight: '600', color: '#26215C' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', lineHeight: 22 },

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
