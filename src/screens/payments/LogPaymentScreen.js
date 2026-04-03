import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import {
  getContractById,
  getBedById,
  getRoomById,
  getPropertyById,
  getAllContractsWithDetails,
  checkTxnExists,
  insertPayment,
  insertEmailLog,
  getAgent,
} from '../../database/database';
import { generateReceiptPDF } from '../../services/pdfService';
import { sendReceiptEmail } from '../../services/emailService';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_MODES    = ['CASH', 'UPI', 'BANK', 'CHEQUE'];
const PAYMENT_STATUSES = ['PAID', 'PENDING', 'FAILED'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 16 }, (_, i) => 2020 + i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

// ─── Date Picker Field ────────────────────────────────────────────────────────

function DatePickerField({ label, required, value, onChange, error }) {
  const today = new Date();
  const [visible, setVisible]     = useState(false);
  const [tempDay, setTempDay]     = useState(today.getDate());
  const [tempMonth, setTempMonth] = useState(today.getMonth() + 1);
  const [tempYear, setTempYear]   = useState(today.getFullYear());

  function open() {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setTempDay(d.getDate());
      setTempMonth(d.getMonth() + 1);
      setTempYear(d.getFullYear());
    }
    setVisible(true);
  }

  function confirm() {
    const m = String(tempMonth).padStart(2, '0');
    const d = String(tempDay).padStart(2, '0');
    onChange(`${tempYear}-${m}-${d}`);
    setVisible(false);
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      <TouchableOpacity
        style={[styles.dateField, error && styles.inputError]}
        onPress={open}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="calendar" size={18} color="#888780" />
        <Text style={[styles.dateFieldText, !value && { color: '#AAAAAA' }]}>
          {value ? fmtDate(value) : 'Select date'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#888780" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Day</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={tempDay} onValueChange={setTempDay} style={styles.picker} dropdownIconColor="#26215C">
                    {DAYS.map((d) => <Picker.Item key={d} label={String(d)} value={d} />)}
                  </Picker>
                </View>
              </View>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Month</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={tempMonth} onValueChange={setTempMonth} style={styles.picker} dropdownIconColor="#26215C">
                    {MONTHS.map((m, i) => <Picker.Item key={m} label={m.slice(0,3)} value={i + 1} />)}
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
            <TouchableOpacity style={styles.confirmBtn} onPress={confirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Month/Year Picker Field ──────────────────────────────────────────────────

function MonthYearPickerField({ label, required, value, onChange, error }) {
  const today = new Date();
  const [visible, setVisible]     = useState(false);
  const [tempMonth, setTempMonth] = useState(today.getMonth() + 1);
  const [tempYear, setTempYear]   = useState(today.getFullYear());

  function open() {
    if (value) {
      const [y, m] = value.split('-');
      setTempMonth(Number(m));
      setTempYear(Number(y));
    }
    setVisible(true);
  }

  function confirm() {
    const m = String(tempMonth).padStart(2, '0');
    onChange(`${tempYear}-${m}`);
    setVisible(false);
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      <TouchableOpacity
        style={[styles.dateField, error && styles.inputError]}
        onPress={open}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="calendar-month" size={18} color="#888780" />
        <Text style={[styles.dateFieldText, !value && { color: '#AAAAAA' }]}>
          {value ? ymToDisplay(value) : 'Select month'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#888780" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
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
            <TouchableOpacity style={styles.confirmBtn} onPress={confirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogPaymentScreen({ navigation, route }) {
  const { contractId: routeContractId } = route.params ?? {};

  // Contract selection
  const [selectedContractId, setSelectedContractId] = useState(routeContractId ?? null);
  const [contract, setContract]                     = useState(null);
  const [activeContracts, setActiveContracts]       = useState([]);

  // Payment fields
  const [txnNo, setTxnNo]                   = useState('');
  const [txnError, setTxnError]             = useState('');
  const [amount, setAmount]                 = useState('');
  const [paymentDate, setPaymentDate]       = useState(todayIso());
  const [paymentMode, setPaymentMode]       = useState('CASH');
  const [paymentForMonth, setPaymentForMonth] = useState(currentMonthYM());
  const [paymentStatus, setPaymentStatus]   = useState('PAID');
  const [notes, setNotes]                   = useState('');

  // UI
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [currency, setCurrency]   = useState('AED');
  const [agent, setAgent]         = useState(null);

  const txnCheckTimer = useRef(null);

  // ─── Load agent + contracts on mount ────────────────────────────────────────

  useEffect(() => {
    const a = getAgent();
    setAgent(a);
    setCurrency(a?.currency ?? 'AED');

    if (!routeContractId) {
      const list = getAllContractsWithDetails('ACTIVE');
      setActiveContracts(list);
      if (list.length > 0) setSelectedContractId(list[0].id);
    }
  }, []);

  // ─── Load contract details when selectedContractId changes ──────────────────

  useEffect(() => {
    if (!selectedContractId) { setContract(null); return; }

    // Try to find in already-loaded list first (avoids extra JOINs)
    const fromList = activeContracts.find((c) => c.id === selectedContractId);
    if (fromList) {
      setContract(fromList);
      setAmount(fromList.monthly_rent != null ? String(fromList.monthly_rent) : '');
      return;
    }

    // Loaded from route param — need to enrich with bed/room/property names
    const c = getContractById(selectedContractId);
    if (!c) { setContract(null); return; }
    const bed      = getBedById(c.bed_unit_id);
    const room     = bed ? getRoomById(bed.room_id) : null;
    const property = room ? getPropertyById(room.property_id) : null;
    setContract({
      ...c,
      bed_label:     bed?.bed_label ?? '—',
      room_name:     room?.name ?? '—',
      property_name: property?.name ?? '—',
    });
    setAmount(c.monthly_rent != null ? String(c.monthly_rent) : '');
  }, [selectedContractId]);

  // ─── Real-time txn duplicate check ──────────────────────────────────────────

  function handleTxnChange(val) {
    setTxnNo(val);
    setTxnError('');
    clearTimeout(txnCheckTimer.current);
    if (!val.trim()) return;
    txnCheckTimer.current = setTimeout(() => {
      if (checkTxnExists(val.trim())) {
        setTxnError('Transaction number already used');
      }
    }, 400);
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate() {
    const e = {};
    if (!selectedContractId)                    e.contract = 'Please select a contract';
    if (!txnNo.trim())                          e.txnNo = 'Transaction number is required';
    else if (checkTxnExists(txnNo.trim()))      e.txnNo = 'Transaction number already used';
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0)      e.amount = 'Amount must be greater than 0';
    if (!paymentDate)                           e.paymentDate = 'Payment date is required';
    if (!paymentForMonth)                       e.paymentForMonth = 'Payment month is required';
    if (!paymentMode)                           e.paymentMode = 'Payment mode is required';
    return e;
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    setStatusMsg('Saving payment...');

    try {
      // 1. Insert payment
      const paymentData = {
        tenancy_id:        contract.id,
        bed_unit_id:       contract.bed_unit_id,
        agent_id:          agent?.id,
        txn_no:            txnNo.trim(),
        amount:            parseFloat(amount),
        payment_date:      paymentDate,
        payment_mode:      paymentMode,
        payment_for_month: paymentForMonth,
        status:            paymentStatus,
        notes:             notes.trim() || null,
      };
      insertPayment(paymentData);

      // 2. Generate receipt PDF
      setStatusMsg('Generating receipt...');
      const pdf = await generateReceiptPDF(paymentData, contract, agent);

      // 3. Check connectivity + send receipt email
      const netState = await NetInfo.fetch();

      if (netState.isConnected && contract.tenant_email) {
        setStatusMsg('Sending receipt email...');
        try {
          await sendReceiptEmail(pdf, paymentData, contract, agent);
          insertEmailLog({
            type:            'RECEIPT',
            tenancy_id:      contract.id,
            recipient_email: contract.tenant_email,
            status:          'SENT',
            sent_at:         new Date().toISOString(),
          });
          setSaving(false);
          setStatusMsg('');
          Alert.alert('Payment Saved', 'Payment logged and receipt email sent!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } catch {
          insertEmailLog({
            type:            'RECEIPT',
            tenancy_id:      contract.id,
            recipient_email: contract.tenant_email,
            status:          'FAILED',
            sent_at:         new Date().toISOString(),
          });
          setSaving(false);
          setStatusMsg('');
          Alert.alert('Payment Saved', 'Payment logged. Receipt email failed.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } else {
        if (contract.tenant_email) {
          insertEmailLog({
            type:            'RECEIPT',
            tenancy_id:      contract.id,
            recipient_email: contract.tenant_email,
            status:          'FAILED',
            sent_at:         null,
          });
        }
        setSaving(false);
        setStatusMsg('');
        Alert.alert('Payment Saved', 'Payment logged. Connect to internet to send receipt.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.error('[LogPaymentScreen] save error', err);
      setSaving(false);
      setStatusMsg('');
      Alert.alert('Error', 'Failed to save payment. Please try again.');
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Payment</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Contract Selection ──────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contract</Text>

            {routeContractId ? (
              /* Pre-selected */
              contract ? (
                <View style={styles.contractBox}>
                  <Text style={styles.contractTenant}>{contract.tenant_name}</Text>
                  <View style={styles.contractMeta}>
                    <MaterialCommunityIcons name="office-building" size={12} color="#888780" />
                    <Text style={styles.contractMetaText} numberOfLines={1}>
                      {contract.property_name}  ›  {contract.room_name}  ›  {contract.bed_label}
                    </Text>
                  </View>
                  <Text style={styles.contractRent}>
                    Monthly Rent: {fmtAmount(contract.monthly_rent, currency)}
                  </Text>
                </View>
              ) : (
                <ActivityIndicator color="#26215C" />
              )
            ) : (
              /* Picker */
              activeContracts.length === 0 ? (
                <View style={styles.noContractsBox}>
                  <MaterialCommunityIcons name="information-outline" size={18} color="#888780" />
                  <Text style={styles.noContractsText}>No active contracts found.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>
                    Select Contract <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.pickerWrapper, errors.contract && styles.inputError]}>
                    <Picker
                      selectedValue={selectedContractId}
                      onValueChange={(v) => {
                        setSelectedContractId(v);
                        setErrors((e) => ({ ...e, contract: null }));
                      }}
                      style={styles.picker}
                      dropdownIconColor="#26215C"
                    >
                      {activeContracts.map((c) => (
                        <Picker.Item
                          key={c.id}
                          label={`${c.tenant_name}  —  ${c.bed_label}  —  ${c.property_name}`}
                          value={c.id}
                        />
                      ))}
                    </Picker>
                  </View>
                  {errors.contract ? <Text style={styles.errorText}>{errors.contract}</Text> : null}

                  {contract && (
                    <View style={styles.contractBox}>
                      <Text style={styles.contractRent}>
                        Monthly Rent: {fmtAmount(contract.monthly_rent, currency)}
                      </Text>
                    </View>
                  )}
                </>
              )
            )}
          </View>

          {/* ── Payment Fields ──────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Details</Text>

            {/* Transaction Number */}
            <Text style={styles.label}>Transaction Number <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, (errors.txnNo || txnError) && styles.inputError]}
              value={txnNo}
              onChangeText={handleTxnChange}
              placeholder="e.g. TXN202601001"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="characters"
            />
            {txnError ? (
              <Text style={styles.errorText}>{txnError}</Text>
            ) : errors.txnNo ? (
              <Text style={styles.errorText}>{errors.txnNo}</Text>
            ) : (
              <Text style={styles.helperText}>Enter your transaction reference number</Text>
            )}

            {/* Amount */}
            <Text style={styles.label}>Amount ({currency}) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              value={amount}
              onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: null })); }}
              placeholder="0.00"
              placeholderTextColor="#AAAAAA"
              keyboardType="decimal-pad"
            />
            {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

            {/* Payment Date */}
            <DatePickerField
              label="Payment Date"
              required
              value={paymentDate}
              onChange={(v) => { setPaymentDate(v); setErrors((e) => ({ ...e, paymentDate: null })); }}
              error={errors.paymentDate}
            />

            {/* Payment Mode */}
            <Text style={styles.label}>Payment Mode <Text style={styles.required}>*</Text></Text>
            <View style={[styles.pickerWrapper, errors.paymentMode && styles.inputError]}>
              <Picker
                selectedValue={paymentMode}
                onValueChange={(v) => { setPaymentMode(v); setErrors((e) => ({ ...e, paymentMode: null })); }}
                style={styles.picker}
                dropdownIconColor="#26215C"
              >
                {PAYMENT_MODES.map((m) => <Picker.Item key={m} label={m} value={m} />)}
              </Picker>
            </View>
            {errors.paymentMode ? <Text style={styles.errorText}>{errors.paymentMode}</Text> : null}

            {/* Payment For Month */}
            <MonthYearPickerField
              label="Payment For Month"
              required
              value={paymentForMonth}
              onChange={(v) => { setPaymentForMonth(v); setErrors((e) => ({ ...e, paymentForMonth: null })); }}
              error={errors.paymentForMonth}
            />

            {/* Status */}
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={paymentStatus}
                onValueChange={setPaymentStatus}
                style={styles.picker}
                dropdownIconColor="#26215C"
              >
                {PAYMENT_STATUSES.map((s) => <Picker.Item key={s} label={s} value={s} />)}
              </Picker>
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes..."
              placeholderTextColor="#AAAAAA"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Save Button ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.saveBtnText}>{statusMsg || 'Saving...'}</Text>
              </View>
            ) : (
              <Text style={styles.saveBtnText}>Save Payment</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26215C',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn:     { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },

  scrollContent: { padding: 16 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },

  contractBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8D4F0',
    gap: 4,
  },
  contractTenant:  { fontSize: 15, fontWeight: '700', color: '#26215C' },
  contractMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contractMetaText:{ fontSize: 12, color: '#888780', flex: 1 },
  contractRent:    { fontSize: 13, color: '#444', fontWeight: '500' },

  noContractsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  noContractsText: { fontSize: 14, color: '#888780' },

  label:    { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  required: { color: '#E24B4A' },

  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#F8F8F8',
    marginBottom: 6,
  },
  textArea:   { minHeight: 80, paddingTop: 12, marginBottom: 0 },
  inputError: { borderColor: '#E24B4A' },
  errorText:  { color: '#E24B4A', fontSize: 12, marginBottom: 12 },
  helperText: { fontSize: 12, color: '#888780', marginBottom: 12 },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    overflow: 'hidden',
    marginBottom: 16,
  },
  picker: { color: '#1A1A2E', height: 50 },

  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#F8F8F8',
    marginBottom: 6,
  },
  dateFieldText: { fontSize: 15, color: '#1A1A2E', flex: 1 },

  datePickerRow:     { flexDirection: 'row', gap: 8, marginBottom: 20 },
  datePickerCol:     { flex: 1 },
  datePickerColLabel:{ fontSize: 12, fontWeight: '600', color: '#888780', textAlign: 'center', marginBottom: 4 },

  savingRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn:         { backgroundColor: '#26215C', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:     { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  confirmBtn:     { backgroundColor: '#26215C', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
