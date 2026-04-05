import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getBedById,
  updateBed,
  updateBedStatus,
  getRoomById,
  getPropertyById,
  getContractByBedId,
  getPaymentsByBed,
  getAgent,
} from '../../database/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  AVAILABLE:   { bg: '#EAF3DE', text: '#1D9E75' },
  OCCUPIED:    { bg: '#FCEBEB', text: '#E24B4A' },
  RESERVED:    { bg: '#FAEEDA', text: '#BA7517' },
  MAINTENANCE: { bg: '#F1EFE8', text: '#888780' },
};

const STATUS_TRANSITIONS = {
  AVAILABLE:   ['RESERVED', 'MAINTENANCE'],
  RESERVED:    ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE'],
  OCCUPIED:    [],
};

const PAYMENT_STATUS_STYLE = {
  PAID:    { bg: '#EAF3DE', text: '#1D9E75' },
  PENDING: { bg: '#FAEEDA', text: '#BA7517' },
  WAIVED:  { bg: '#F1EFE8', text: '#888780' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(val, currency) {
  const n = parseFloat(val ?? 0);
  const formatted = isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${formatted}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const EMPTY_BED_FORM = { label: '', status: 'AVAILABLE', ownerRent: '', actualRent: '', commission: '' };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BedUnitDetailScreen({ navigation, route }) {
  const { bedId } = route.params;

  const [bed, setBed]           = useState(null);
  const [room, setRoom]         = useState(null);
  const [property, setProperty] = useState(null);
  const [contract, setContract] = useState(null);
  const [payments, setPayments] = useState([]);
  const [currency, setCurrency] = useState('AED');
  const [loading, setLoading]   = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [bedForm, setBedForm]                   = useState(EMPTY_BED_FORM);
  const [bedFormError, setBedFormError]         = useState('');
  const [bedSaving, setBedSaving]               = useState(false);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [newStatus, setNewStatus]                   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const b = getBedById(bedId);
    setBed(b);
    if (b) {
      const r = getRoomById(b.room_id);
      setRoom(r);
      if (r) setProperty(getPropertyById(r.property_id));
      setContract(getContractByBedId(bedId));
      setPayments(getPaymentsByBed(bedId).slice(0, 5));
    }
    const agent = getAgent();
    setCurrency(agent?.currency ?? 'AED');
    setLoading(false);
  }, [bedId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Edit Bed ──────────────────────────────────────────────────────────────

  function openEditModal() {
    if (!bed) return;
    setBedForm({
      label:      bed.bed_label ?? '',
      status:     bed.status ?? 'AVAILABLE',
      ownerRent:  bed.owner_rent  != null ? String(bed.owner_rent)  : '',
      actualRent: bed.actual_rent != null ? String(bed.actual_rent) : '',
      commission: bed.commission  != null ? String(bed.commission)  : '',
    });
    setBedFormError('');
    setEditModalVisible(true);
  }

  function handleBedSave() {
    if (!bedForm.label.trim()) { setBedFormError('Bed label is required.'); return; }
    setBedSaving(true);
    try {
      updateBed(bedId, {
        bed_label:   bedForm.label.trim().toUpperCase(),
        status:      bedForm.status,
        owner_rent:  parseFloat(bedForm.ownerRent)  || 0,
        actual_rent: parseFloat(bedForm.actualRent) || 0,
        commission:  parseFloat(bedForm.commission) || 0,
      });
      setEditModalVisible(false);
      load();
    } finally {
      setBedSaving(false);
    }
  }

  // ─── Change Status ─────────────────────────────────────────────────────────

  function openStatusModal() {
    const options = STATUS_TRANSITIONS[bed?.status ?? ''];
    if (!options?.length) return;
    setNewStatus(options[0]);
    setStatusModalVisible(true);
  }

  function handleStatusChange() {
    if (!newStatus) return;
    Alert.alert(
      'Change Status',
      `Change status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateBedStatus(bedId, newStatus);
            setStatusModalVisible(false);
            load();
          },
        },
      ]
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading || !bed) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#26215C" /></View>;
  }

  const ss = STATUS_STYLE[bed.status] ?? STATUS_STYLE.AVAILABLE;
  const net = (parseFloat(bed.actual_rent) || 0) - (parseFloat(bed.owner_rent) || 0) - (parseFloat(bed.commission) || 0);
  const canChangeStatus = (STATUS_TRANSITIONS[bed.status] ?? []).length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bed {bed.bed_label}</Text>
        <View style={[styles.headerBadge, { backgroundColor: ss.bg }]}>
          <Text style={[styles.headerBadgeText, { color: ss.text }]}>{bed.status}</Text>
        </View>
        <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Breadcrumb */}
        {(property || room) && (
          <View style={styles.breadcrumb}>
            <MaterialCommunityIcons name="office-building" size={13} color="#888780" />
            <Text style={styles.breadcrumbText} numberOfLines={1}>{property?.name ?? '—'}</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color="#CCCCCC" />
            <MaterialCommunityIcons name="door" size={13} color="#888780" />
            <Text style={styles.breadcrumbText} numberOfLines={1}>{room?.name ?? '—'}</Text>
          </View>
        )}

        {/* Financial Details */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="eye-off-outline" size={15} color="#888780" />
            <Text style={styles.cardTitleInternal}>Financial Details — Internal (Not shown to tenants)</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Tenant Rent</Text>
            <Text style={styles.finValue}>{formatAmount(bed.actual_rent, currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Owner Rent</Text>
            <Text style={styles.finValue}>{formatAmount(bed.owner_rent, currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Commission</Text>
            <Text style={styles.finValue}>{formatAmount(bed.commission, currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.finRow}>
            <Text style={[styles.finLabel, { fontWeight: '700' }]}>Net / Month</Text>
            <Text style={[styles.finValue, { color: net >= 0 ? '#1D9E75' : '#E24B4A', fontWeight: '700' }]}>
              {formatAmount(net, currency)}
            </Text>
          </View>
        </View>

        {/* Current Tenant */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Tenant</Text>
          {contract ? (
            <>
              <View style={styles.tenantRow}>
                <MaterialCommunityIcons name="account" size={15} color="#888780" />
                <Text style={styles.tenantValue}>{contract.tenant_name}</Text>
              </View>
              {contract.tenant_phone ? (
                <View style={styles.tenantRow}>
                  <MaterialCommunityIcons name="phone" size={15} color="#888780" />
                  <Text style={styles.tenantValue}>{contract.tenant_phone}</Text>
                </View>
              ) : null}
              {contract.tenant_email ? (
                <View style={styles.tenantRow}>
                  <MaterialCommunityIcons name="email-outline" size={15} color="#888780" />
                  <Text style={styles.tenantValue}>{contract.tenant_email}</Text>
                </View>
              ) : null}
              <View style={styles.tenantGrid}>
                <View style={styles.tenantGridItem}>
                  <Text style={styles.tenantGridLabel}>Check-in</Text>
                  <Text style={styles.tenantGridValue}>{formatDate(contract.check_in_date)}</Text>
                </View>
                <View style={styles.tenantGridItem}>
                  <Text style={styles.tenantGridLabel}>Check-out</Text>
                  <Text style={styles.tenantGridValue}>{formatDate(contract.check_out_date)}</Text>
                </View>
                <View style={styles.tenantGridItem}>
                  <Text style={styles.tenantGridLabel}>Monthly Rent</Text>
                  <Text style={styles.tenantGridValue}>{formatAmount(contract.monthly_rent, currency)}</Text>
                </View>
                <View style={styles.tenantGridItem}>
                  <Text style={styles.tenantGridLabel}>Deposit</Text>
                  <Text style={styles.tenantGridValue}>{formatAmount(contract.deposit_amount, currency)}</Text>
                </View>
              </View>
              <View style={styles.dueDayRow}>
                <MaterialCommunityIcons name="calendar-clock" size={14} color="#378ADD" />
                <Text style={styles.dueDayText}>
                  Payment due on {ordinal(contract.payment_due_day)} of each month
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewContractBtn}
                onPress={() => navigation.navigate('ContractDetailScreen', { contractId: contract.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.viewContractText}>View Contract</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#26215C" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noTenantRow}>
              <MaterialCommunityIcons name="account-off-outline" size={20} color="#CCCCCC" />
              <Text style={styles.noTenantText}>No active tenant</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsCol}>
          {bed.status === 'AVAILABLE' && (
            <TouchableOpacity
              style={styles.createContractBtn}
              onPress={() => navigation.navigate('CreateContractScreen', { bedId: bed.id })}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="file-plus-outline" size={18} color="#FFFFFF" />
              <Text style={styles.createContractText}>Create Tenancy Contract</Text>
            </TouchableOpacity>
          )}
          {canChangeStatus && (
            <TouchableOpacity style={styles.changeStatusBtn} onPress={openStatusModal} activeOpacity={0.85}>
              <MaterialCommunityIcons name="swap-horizontal" size={17} color="#26215C" />
              <Text style={styles.changeStatusText}>Change Status</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments', { screen: 'PaymentsListScreen' })} activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No payments recorded yet.</Text>
        ) : (
          payments.map((p) => {
            const ps = PAYMENT_STATUS_STYLE[p.status] ?? PAYMENT_STATUS_STYLE.PENDING;
            return (
              <View key={p.id} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Text style={styles.paymentTxn} numberOfLines={1}>{p.txn_no}</Text>
                  <Text style={styles.paymentDate}>{formatDate(p.payment_date)}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>{formatAmount(p.amount, currency)}</Text>
                  <View style={[styles.paymentBadge, { backgroundColor: ps.bg }]}>
                    <Text style={[styles.paymentBadgeText, { color: ps.text }]}>{p.status}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Bed Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Bed</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Bed Label <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, bedFormError && styles.inputError]} value={bedForm.label} onChangeText={(v) => { setBedForm((f) => ({ ...f, label: v })); setBedFormError(''); }} placeholder="e.g. A1" placeholderTextColor="#AAAAAA" autoCapitalize="characters" autoFocus />
              {bedFormError ? <Text style={styles.errorText}>{bedFormError}</Text> : null}

              {bed.status !== 'OCCUPIED' && (
                <>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={bedForm.status} onValueChange={(v) => setBedForm((f) => ({ ...f, status: v }))} style={styles.picker} mode="dialog" dropdownIconColor="#26215C">
                      {['AVAILABLE', 'RESERVED', 'MAINTENANCE'].map((s) => <Picker.Item key={s} label={s} value={s} />)}
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.label}>Tenant Rent ({currency}/mo)</Text>
              <TextInput style={styles.input} value={bedForm.actualRent} onChangeText={(v) => setBedForm((f) => ({ ...f, actualRent: v }))} placeholder="0" placeholderTextColor="#AAAAAA" keyboardType="decimal-pad" />

              <Text style={styles.label}>Owner Rent — Internal ({currency}/mo)</Text>
              <TextInput style={styles.input} value={bedForm.ownerRent} onChangeText={(v) => setBedForm((f) => ({ ...f, ownerRent: v }))} placeholder="0" placeholderTextColor="#AAAAAA" keyboardType="decimal-pad" />

              <Text style={styles.label}>Commission — Internal ({currency}/mo)</Text>
              <TextInput style={styles.input} value={bedForm.commission} onChangeText={(v) => setBedForm((f) => ({ ...f, commission: v }))} placeholder="0" placeholderTextColor="#AAAAAA" keyboardType="decimal-pad" />

              <View style={styles.internalNote}>
                <MaterialCommunityIcons name="eye-off-outline" size={14} color="#888780" />
                <Text style={styles.internalNoteText}>Owner Rent and Commission are internal — never shown to tenants</Text>
              </View>

              <TouchableOpacity style={[styles.saveBtn, bedSaving && styles.saveBtnDisabled]} onPress={handleBedSave} disabled={bedSaving} activeOpacity={0.85}>
                {bedSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Status Modal */}
      <Modal visible={statusModalVisible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setStatusModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalBackdrop} onPress={() => setStatusModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Status</Text>
            <Text style={styles.currentStatusLabel}>
              Current: <Text style={{ color: STATUS_STYLE[bed.status]?.text }}>{bed.status}</Text>
            </Text>
            <Text style={styles.label}>New Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={newStatus} onValueChange={setNewStatus} style={styles.picker} mode="dialog" dropdownIconColor="#26215C">
                {(STATUS_TRANSITIONS[bed.status] ?? []).map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleStatusChange} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Confirm Change</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#26215C',
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 16,
  },
  backBtn:         { padding: 6 },
  headerTitle:     { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 8, marginRight: 8 },
  headerBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  headerBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  editBtn:         { padding: 6, marginLeft: 'auto' },

  scrollContent: { padding: 16 },

  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: '#E8E8E8',
  },
  breadcrumbText: { fontSize: 12, color: '#444', flexShrink: 1 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  cardTitle:         { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  cardTitleRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14 },
  cardTitleInternal: { flex: 1, fontSize: 12, fontWeight: '600', color: '#888780', lineHeight: 18 },

  finRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  finLabel: { fontSize: 14, color: '#444' },
  finValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  divider:  { height: 1, backgroundColor: '#F0F0F0' },

  tenantRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tenantValue:     { fontSize: 14, color: '#1A1A2E' },
  tenantGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 10 },
  tenantGridItem:  { width: '47%' },
  tenantGridLabel: { fontSize: 11, color: '#888780', marginBottom: 2 },
  tenantGridValue: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  dueDayRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 12 },
  dueDayText:      { fontSize: 12, color: '#378ADD' },
  viewContractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#26215C', borderRadius: 8, paddingVertical: 10, marginTop: 4,
  },
  viewContractText: { color: '#26215C', fontSize: 14, fontWeight: '600' },
  noTenantRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  noTenantText:     { fontSize: 14, color: '#AAAAAA' },

  actionsCol:        { gap: 10, marginBottom: 20 },
  createContractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1D9E75', borderRadius: 10, paddingVertical: 14,
  },
  createContractText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  changeStatusBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#26215C', borderRadius: 10, paddingVertical: 13,
  },
  changeStatusText: { color: '#26215C', fontSize: 15, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  viewAll:      { fontSize: 13, color: '#26215C', fontWeight: '600' },

  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E8E8E8',
  },
  paymentLeft:      { flex: 1, marginRight: 12 },
  paymentTxn:       { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  paymentDate:      { fontSize: 11, color: '#888780', marginTop: 2 },
  paymentRight:     { alignItems: 'flex-end', gap: 4 },
  paymentAmount:    { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  paymentBadge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  paymentBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyText:        { color: '#888780', fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  currentStatusLabel: { fontSize: 14, color: '#444', marginBottom: 16 },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:   { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 20 },
  label:        { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  required:     { color: '#E24B4A' },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#1A1A2E', backgroundColor: '#F8F8F8', marginBottom: 16,
  },
  inputError:   { borderColor: '#E24B4A' },
  errorText:    { color: '#E24B4A', fontSize: 12, marginTop: -12, marginBottom: 12 },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#F8F8F8', overflow: 'hidden', marginBottom: 16,
  },
  picker:       { color: '#1A1A2E', height: 50 },
  internalNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, marginBottom: 16,
  },
  internalNoteText: { flex: 1, fontSize: 12, color: '#888780', lineHeight: 18 },
  saveBtn:          { backgroundColor: '#26215C', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
