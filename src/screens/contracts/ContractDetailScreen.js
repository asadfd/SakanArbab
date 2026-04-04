import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Linking,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getContractById,
  getBedById,
  getRoomById,
  getPropertyById,
  getPaymentsByTenancy,
  getOverdueTenants,
  endContract,
  getAgent,
  canEndContract,
  updatePaymentToPaid,
  checkTxnExists,
} from '../../database/database';
import { generateContractPDF } from '../../services/pdfService';
import { sendContractEmail } from '../../services/emailService';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  ACTIVE: { bg: '#EAF3DE', text: '#1D9E75' },
  ENDED:  { bg: '#F1EFE8', text: '#888780' },
};

const PAYMENT_STATUS_STYLE = {
  PAID:    { bg: '#EAF3DE', text: '#1D9E75' },
  PENDING: { bg: '#FAEEDA', text: '#BA7517' },
  FAILED:  { bg: '#FCEBEB', text: '#E24B4A' },
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

function daysOverdue(paymentDueDay) {
  const today = new Date().getDate();
  return Math.max(0, today - paymentDueDay);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, onPress, valueStyle }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={icon} size={14} color="#888780" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={[styles.infoValue, styles.infoValueLink, valueStyle]}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.infoValue, valueStyle]} numberOfLines={2}>{value}</Text>
      )}
    </View>
  );
}

function PaymentRow({ payment, currency }) {
  const ps = PAYMENT_STATUS_STYLE[payment.status] ?? PAYMENT_STATUS_STYLE.PENDING;
  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentLeft}>
        <Text style={styles.paymentTxn} numberOfLines={1}>{payment.txn_no}</Text>
        <Text style={styles.paymentMeta}>
          {fmtDate(payment.payment_date)}
          {payment.payment_mode ? `  ·  ${payment.payment_mode}` : ''}
        </Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>{fmtAmount(payment.amount, currency)}</Text>
        <View style={[styles.paymentBadge, { backgroundColor: ps.bg }]}>
          <Text style={[styles.paymentBadgeText, { color: ps.text }]}>{payment.status}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContractDetailScreen({ navigation, route }) {
  const { contractId } = route.params;

  const [contract, setContract]   = useState(null);
  const [bed, setBed]             = useState(null);
  const [room, setRoom]           = useState(null);
  const [property, setProperty]   = useState(null);
  const [payments, setPayments]   = useState([]);
  const [isOverdue, setIsOverdue] = useState(false);
  const [currency, setCurrency]   = useState('AED');
  const [agent, setAgent]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [emailBusy, setEmailBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const c = getContractById(contractId);
    setContract(c);

    if (c) {
      const b = getBedById(c.bed_unit_id);
      setBed(b);
      if (b) {
        const r = getRoomById(b.room_id);
        setRoom(r);
        setProperty(r ? getPropertyById(r.property_id) : null);
      }
      setPayments(getPaymentsByTenancy(contractId));
      const overdueList = getOverdueTenants();
      setIsOverdue(overdueList.some((o) => o.id === contractId));
    }

    const a = getAgent();
    setAgent(a);
    setCurrency(a?.currency ?? 'AED');
    setLoading(false);
  }, [contractId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Payment summary ─────────────────────────────────────────────────────────

  const paidPayments    = payments.filter((p) => p.status === 'PAID');
  const totalPaid       = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount ?? 0), 0);
  const lastPaymentDate = paidPayments.length > 0 ? paidPayments[0].payment_date : null;
  const monthsPaid      = paidPayments.length;

  // ─── Resend email ────────────────────────────────────────────────────────────

  async function handleResendEmail() {
    if (!contract) return;
    setEmailBusy(true);
    try {
      const pdf = await generateContractPDF(contract, agent);
      await sendContractEmail(pdf, contract, agent);
      Alert.alert('Sent', 'Contract email sent successfully.');
    } catch (err) {
      Alert.alert('Not Sent', err?.message ?? 'Email was not sent.');
    } finally {
      setEmailBusy(false);
    }
  }

  // ─── End tenancy ─────────────────────────────────────────────────────────────

  function handleEndTenancy() {
    const check = canEndContract(contractId);
    if (!check.allowed) {
      Alert.alert('Cannot End Tenancy', check.reason);
      return;
    }

    Alert.alert(
      'End Tenancy',
      `End tenancy for ${contract?.tenant_name}? This will set the bed to Available.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Tenancy',
          style: 'destructive',
          onPress: () => {
            endContract(contractId);
            Alert.alert('Done', 'Tenancy ended. Bed is now available.', [
              { text: 'OK', onPress: () => { load(); } },
            ]);
          },
        },
      ]
    );
  }

  // ─── Edit pending payment ───────────────────────────────────────────────────

  const [editPayment, setEditPayment]     = useState(null);
  const [editTxn, setEditTxn]             = useState('');
  const [editAmount, setEditAmount]       = useState('');
  const [editDate, setEditDate]           = useState('');
  const [editMode, setEditMode]           = useState('CASH');
  const [editNotes, setEditNotes]         = useState('');
  const [editError, setEditError]         = useState('');
  const [editSaving, setEditSaving]       = useState(false);

  function openEditPayment(payment) {
    setEditPayment(payment);
    setEditTxn('');
    setEditAmount(String(payment.amount ?? ''));
    const today = new Date();
    setEditDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setEditMode('CASH');
    setEditNotes('');
    setEditError('');
  }

  function handleSavePayment() {
    const txn = editTxn.trim();
    if (!txn) { setEditError('Transaction number is required'); return; }
    if (checkTxnExists(txn)) { setEditError('Transaction number already exists'); return; }
    const amt = parseFloat(editAmount);
    if (!editAmount || isNaN(amt) || amt <= 0) { setEditError('Amount must be greater than 0'); return; }
    if (!editDate) { setEditError('Payment date is required'); return; }

    setEditSaving(true);
    try {
      updatePaymentToPaid(editPayment.id, {
        txn_no: txn,
        amount: amt,
        payment_date: editDate,
        payment_mode: editMode,
        notes: editNotes.trim() || null,
      });
      setEditPayment(null);
      load();
    } catch (err) {
      setEditError(err.message ?? 'Failed to update payment');
    } finally {
      setEditSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading || !contract) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#26215C" /></View>;
  }

  const ss = STATUS_STYLE[contract.status] ?? STATUS_STYLE.ENDED;
  const isActive = contract.status === 'ACTIVE';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{contract.tenant_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
          <Text style={[styles.statusBadgeText, { color: ss.text }]}>{contract.status}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Overdue banner */}
        {isOverdue && isActive && (
          <View style={styles.overdueBanner}>
            <MaterialCommunityIcons name="alert-circle" size={17} color="#E24B4A" />
            <Text style={styles.overdueBannerText}>
              Rent overdue by {daysOverdue(contract.payment_due_day)} days
            </Text>
          </View>
        )}

        {/* Contract Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contract Details</Text>

          {/* Bed path */}
          <View style={styles.bedPath}>
            <MaterialCommunityIcons name="office-building" size={13} color="#888780" />
            <Text style={styles.bedPathText} numberOfLines={1}>
              {property?.name ?? '—'}  ›  {room?.name ?? '—'}  ›  {bed?.bed_label ?? '—'}
            </Text>
          </View>

          <View style={styles.divider} />

          <InfoRow icon="account"       label="Tenant"      value={contract.tenant_name} />
          <InfoRow
            icon="phone"
            label="Phone"
            value={contract.tenant_phone ?? '—'}
            onPress={contract.tenant_phone ? () => Linking.openURL(`tel:${contract.tenant_phone}`) : undefined}
          />
          <InfoRow
            icon="email-outline"
            label="Email"
            value={contract.tenant_email ?? '—'}
            onPress={contract.tenant_email ? () => Linking.openURL(`mailto:${contract.tenant_email}`) : undefined}
          />
          <InfoRow icon="card-account-details-outline" label="ID / Passport" value={contract.tenant_id_no ?? '—'} />

          <View style={styles.divider} />

          <InfoRow icon="calendar-arrow-right" label="Check-in"    value={fmtDate(contract.check_in_date)} />
          <InfoRow icon="calendar-arrow-left"  label="Check-out"   value={contract.check_out_date ? fmtDate(contract.check_out_date) : 'Open-ended'} />
          <InfoRow icon="cash"                 label="Monthly Rent" value={fmtAmount(contract.monthly_rent, currency)} valueStyle={styles.rentValue} />
          <InfoRow icon="shield-lock-outline"  label="Deposit"     value={fmtAmount(contract.deposit_amount, currency)} />
          <InfoRow icon="calendar-clock"       label="Payment Due"  value={`${ordinal(contract.payment_due_day ?? 1)} of each month`} />
          {contract.notes ? <InfoRow icon="note-text-outline" label="Notes" value={contract.notes} /> : null}
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{fmtAmount(totalPaid, currency)}</Text>
            <Text style={styles.summaryLabel}>Total Paid</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{monthsPaid}</Text>
            <Text style={styles.summaryLabel}>Months Paid</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{lastPaymentDate ? fmtDate(lastPaymentDate) : '—'}</Text>
            <Text style={styles.summaryLabel}>Last Payment</Text>
          </View>
        </View>

        {/* Payments section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{payments.length}</Text>
          </View>
          {isActive && (
            <TouchableOpacity
              style={styles.logPaymentBtn}
              onPress={() => navigation.navigate('Payments', {
                screen: 'LogPaymentScreen',
                params: { contractId: contract.id },
              })}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={15} color="#FFFFFF" />
              <Text style={styles.logPaymentText}>Log Payment</Text>
            </TouchableOpacity>
          )}
        </View>

        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No payments recorded yet.</Text>
        ) : (
          payments.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={p.status === 'PENDING' ? 0.7 : 1}
              onPress={() => p.status === 'PENDING' && isActive && openEditPayment(p)}
            >
              <PaymentRow payment={p} currency={currency} />
            </TouchableOpacity>
          ))
        )}

        {/* Hint for pending payments */}
        {isActive && payments.some((p) => p.status === 'PENDING') && (
          <Text style={styles.pendingHint}>Tap a PENDING payment to mark it as PAID</Text>
        )}

        {/* Action buttons — ACTIVE only */}
        {isActive && (
          <View style={styles.actionsCol}>
            <TouchableOpacity
              style={[styles.emailBtn, emailBusy && styles.btnDisabled]}
              onPress={handleResendEmail}
              disabled={emailBusy}
              activeOpacity={0.85}
            >
              {emailBusy ? (
                <ActivityIndicator size="small" color="#26215C" />
              ) : (
                <MaterialCommunityIcons name="email-send-outline" size={18} color="#26215C" />
              )}
              <Text style={styles.emailBtnText}>
                {emailBusy ? 'Opening mail...' : 'Resend Contract Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endBtn}
              onPress={handleEndTenancy}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="door-open" size={18} color="#FFFFFF" />
              <Text style={styles.endBtnText}>End Tenancy</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Edit Payment Modal ─────────────────────────────────────────── */}
      <Modal visible={!!editPayment} animationType="slide" transparent onRequestClose={() => setEditPayment(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditPayment(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Record Payment</Text>
            {editPayment && (
              <Text style={styles.modalSubtitle}>
                For: {editPayment.payment_for_month}  ·  {fmtAmount(editPayment.amount, currency)}
              </Text>
            )}

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {editError ? (
                <View style={styles.editErrorBanner}>
                  <Text style={styles.editErrorText}>{editError}</Text>
                </View>
              ) : null}

              <Text style={styles.modalLabel}>Transaction No. <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.modalInput}
                value={editTxn}
                onChangeText={(v) => { setEditTxn(v); setEditError(''); }}
                placeholder="e.g. TXN-001"
                placeholderTextColor="#AAAAAA"
                autoCapitalize="characters"
              />

              <Text style={styles.modalLabel}>Amount ({currency}) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.modalInput}
                value={editAmount}
                onChangeText={(v) => { setEditAmount(v); setEditError(''); }}
                placeholder="0.00"
                placeholderTextColor="#AAAAAA"
                keyboardType="decimal-pad"
              />

              <Text style={styles.modalLabel}>Payment Date <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.modalInput}
                value={editDate}
                onChangeText={(v) => { setEditDate(v); setEditError(''); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#AAAAAA"
              />

              <Text style={styles.modalLabel}>Payment Mode</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={editMode}
                  onValueChange={setEditMode}
                  style={styles.picker}
                  dropdownIconColor="#26215C"
                >
                  <Picker.Item label="Cash" value="CASH" />
                  <Picker.Item label="UPI" value="UPI" />
                  <Picker.Item label="Bank Transfer" value="BANK" />
                  <Picker.Item label="Cheque" value="CHEQUE" />
                </Picker>
              </View>

              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Optional notes..."
                placeholderTextColor="#AAAAAA"
                multiline
              />

              <TouchableOpacity
                style={[styles.savePaymentBtn, editSaving && styles.btnDisabled]}
                onPress={handleSavePayment}
                disabled={editSaving}
                activeOpacity={0.85}
              >
                {editSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.savePaymentBtnText}>Mark as PAID</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26215C',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn:         { padding: 6 },
  headerTitle:     { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  statusBadge:     { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  scrollContent: { padding: 16 },

  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  overdueBannerText: { fontSize: 14, fontWeight: '600', color: '#E24B4A' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },

  bedPath: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  bedPathText: { fontSize: 13, color: '#26215C', fontWeight: '600', flex: 1 },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
  },
  infoLeft:      { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  infoLabel:     { fontSize: 13, color: '#888780' },
  infoValue:     { fontSize: 13, color: '#1A1A2E', fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
  infoValueLink: { color: '#378ADD', textDecorationLine: 'underline' },
  rentValue:     { color: '#26215C', fontWeight: '700', fontSize: 14 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  summaryLabel:   { fontSize: 11, color: '#888780' },
  summaryDivider: { width: 1, backgroundColor: '#F0F0F0', marginHorizontal: 4 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  countBadge:      { backgroundColor: '#E8E8E8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText:  { fontSize: 12, fontWeight: '700', color: '#555' },
  logPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#26215C',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  logPaymentText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  paymentLeft:      { flex: 1, marginRight: 12 },
  paymentTxn:       { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  paymentMeta:      { fontSize: 11, color: '#888780', marginTop: 2 },
  paymentRight:     { alignItems: 'flex-end', gap: 4 },
  paymentAmount:    { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  paymentBadge:     { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  paymentBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyText:        { color: '#AAAAAA', fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  actionsCol: { gap: 10, marginTop: 8, marginBottom: 4 },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#26215C',
    borderRadius: 10,
    paddingVertical: 13,
  },
  emailBtnText: { color: '#26215C', fontSize: 15, fontWeight: '600' },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E24B4A',
    borderRadius: 10,
    paddingVertical: 14,
  },
  endBtnText:  { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  pendingHint: { fontSize: 12, color: '#BA7517', textAlign: 'center', marginTop: 2, marginBottom: 10 },

  // ─── Edit Payment Modal ──────────────────────────────────────────
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:    { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#888780', marginBottom: 16 },
  modalLabel:    { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  required:      { color: '#E24B4A' },
  modalInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#1A1A2E', backgroundColor: '#F8F8F8', marginBottom: 16,
  },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#F8F8F8', overflow: 'hidden', marginBottom: 16,
  },
  picker: { color: '#1A1A2E', height: 50 },
  editErrorBanner: {
    backgroundColor: '#FCEBEB', borderRadius: 8, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: '#E24B4A',
  },
  editErrorText: { color: '#E24B4A', fontSize: 13, fontWeight: '600' },
  savePaymentBtn: {
    backgroundColor: '#1D9E75', borderRadius: 10,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  savePaymentBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
