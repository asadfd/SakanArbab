import React, { useState, useEffect } from 'react';
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
  getBedById,
  getRoomById,
  getPropertyById,
  getAgent,
  getAvailableBeds,
  insertContract,
  updateBedStatus,
  insertEmailLog,
} from '../../database/database';
import { generateContractPDF } from '../../services/pdfService';
import { sendContractEmail } from '../../services/emailService';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 16 }, (_, i) => 2020 + i);

// ─── Date Picker Field ────────────────────────────────────────────────────────

function DatePickerField({ label, required, value, onChange, placeholder, error }) {
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

  function formatDisplay(iso) {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.dateField, error && styles.inputError]}
        onPress={open}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="calendar" size={18} color="#888780" />
        <Text style={[styles.dateFieldText, !value && { color: '#AAAAAA' }]}>
          {value ? formatDisplay(value) : (placeholder ?? 'Select date')}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#888780" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.dateModalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Day</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={tempDay}
                    onValueChange={setTempDay}
                    style={styles.picker}
                    dropdownIconColor="#26215C"
                  >
                    {DAYS.map((d) => <Picker.Item key={d} label={String(d)} value={d} />)}
                  </Picker>
                </View>
              </View>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Month</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={tempMonth}
                    onValueChange={setTempMonth}
                    style={styles.picker}
                    dropdownIconColor="#26215C"
                  >
                    {MONTHS.map((m, i) => <Picker.Item key={m} label={m} value={i + 1} />)}
                  </Picker>
                </View>
              </View>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Year</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={tempYear}
                    onValueChange={setTempYear}
                    style={styles.picker}
                    dropdownIconColor="#26215C"
                  >
                    {YEARS.map((y) => <Picker.Item key={y} label={String(y)} value={y} />)}
                  </Picker>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={confirm} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Confirm</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateContractScreen({ navigation, route }) {
  const { bedId: routeBedId } = route.params ?? {};

  // Bed state
  const [selectedBedId, setSelectedBedId] = useState(routeBedId ?? null);
  const [bed, setBed]                     = useState(null);
  const [room, setRoom]                   = useState(null);
  const [property, setProperty]           = useState(null);
  const [availableBeds, setAvailableBeds] = useState([]);

  // Form state
  const [tenantName, setTenantName]         = useState('');
  const [tenantPhone, setTenantPhone]       = useState('');
  const [tenantEmail, setTenantEmail]       = useState('');
  const [tenantIdNo, setTenantIdNo]         = useState('');
  const [checkInDate, setCheckInDate]       = useState('');
  const [checkOutDate, setCheckOutDate]     = useState('');
  const [monthlyRent, setMonthlyRent]       = useState('');
  const [depositAmount, setDepositAmount]   = useState('');
  const [paymentDueDay, setPaymentDueDay]   = useState('1');
  const [notes, setNotes]                   = useState('');

  // UI state
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [currency, setCurrency]   = useState('AED');
  const [agent, setAgent]         = useState(null);
  const [loadError, setLoadError] = useState(null);

  // ─── Load agent + available beds on mount ───────────────────────────────────

  useEffect(() => {
    try {
      const a = getAgent();
      setAgent(a);
      setCurrency(a?.currency ?? 'AED');

      if (!routeBedId) {
        const beds = getAvailableBeds();
        setAvailableBeds(beds ?? []);
        if (beds && beds.length > 0) setSelectedBedId(beds[0].id);
      }
    } catch (err) {
      console.error('[CreateContractScreen] init error:', err);
      setLoadError(err.message ?? 'Failed to load data');
    }
  }, []);

  // ─── Load bed info when selectedBedId changes ───────────────────────────────

  useEffect(() => {
    if (!selectedBedId) { setBed(null); setRoom(null); setProperty(null); return; }
    try {
      const b = getBedById(selectedBedId);
      setBed(b);
      if (b) {
        const r = getRoomById(b.room_id);
        setRoom(r);
        setProperty(r ? getPropertyById(r.property_id) : null);
        setMonthlyRent(b.actual_rent != null ? String(b.actual_rent) : '');
      }
    } catch (err) {
      console.error('[CreateContractScreen] bed load error:', err);
      setLoadError(err.message ?? 'Failed to load bed details');
    }
  }, [selectedBedId]);

  // ─── Validation ─────────────────────────────────────────────────────────────

  function validate() {
    const e = {};
    if (!agent?.id)                       e.agent = 'Agent profile not found. Go to Settings → Edit Business Profile first.';
    if (!selectedBedId)                   e.bed = 'Please select a bed';
    if (!tenantName.trim())               e.tenantName = 'Tenant name is required';
    if (!tenantEmail.trim())              e.tenantEmail = 'Email is required (for PDF delivery)';
    else if (!/\S+@\S+\.\S+/.test(tenantEmail.trim())) e.tenantEmail = 'Enter a valid email address';
    if (!checkInDate)                     e.checkInDate = 'Check-in date is required';
    const rent = parseFloat(monthlyRent);
    if (!monthlyRent || isNaN(rent) || rent <= 0) e.monthlyRent = 'Monthly rent must be greater than 0';
    const day = parseInt(paymentDueDay, 10);
    if (!paymentDueDay || isNaN(day) || day < 1 || day > 28) e.paymentDueDay = 'Enter a day between 1 and 28';
    return e;
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    setStatusMsg('Saving contract...');

    try {
      // 1. Insert contract
      const result = insertContract({
        bed_unit_id:    selectedBedId,
        agent_id:       agent?.id,
        tenant_name:    tenantName.trim(),
        tenant_phone:   tenantPhone.trim() || null,
        tenant_email:   tenantEmail.trim(),
        tenant_id_no:   tenantIdNo.trim() || null,
        check_in_date:  checkInDate,
        check_out_date: checkOutDate || null,
        monthly_rent:   parseFloat(monthlyRent),
        deposit_amount: parseFloat(depositAmount) || 0,
        payment_due_day: parseInt(paymentDueDay, 10),
        notes:          notes.trim() || null,
      });
      const contractId = result.lastInsertRowId;

      // 2. Mark bed as OCCUPIED
      updateBedStatus(selectedBedId, 'OCCUPIED');

      const contractData = {
        id:              contractId,
        bed_unit_id:     selectedBedId,
        tenant_name:     tenantName.trim(),
        tenant_phone:    tenantPhone.trim() || null,
        tenant_email:    tenantEmail.trim(),
        tenant_id_no:    tenantIdNo.trim() || null,
        check_in_date:   checkInDate,
        check_out_date:  checkOutDate || null,
        monthly_rent:    parseFloat(monthlyRent),
        deposit_amount:  parseFloat(depositAmount) || 0,
        payment_due_day: parseInt(paymentDueDay, 10),
        notes:           notes.trim() || null,
      };

      // 3. Generate PDF
      setStatusMsg('Generating contract PDF...');
      const pdf = await generateContractPDF(contractData, agent);

      // 4. Check connectivity
      const netState = await NetInfo.fetch();

      if (netState.isConnected) {
        setStatusMsg('Sending email to tenant...');
        try {
          await sendContractEmail(pdf, contractData, agent);
          insertEmailLog({
            type:            'CONTRACT',
            tenancy_id:      contractId,
            recipient_email: tenantEmail.trim(),
            status:          'SENT',
            sent_at:         new Date().toISOString(),
          });
          setSaving(false);
          setStatusMsg('');
          Alert.alert('Success', 'Contract created and email sent!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } catch {
          insertEmailLog({
            type:            'CONTRACT',
            tenancy_id:      contractId,
            recipient_email: tenantEmail.trim(),
            status:          'FAILED',
            sent_at:         new Date().toISOString(),
          });
          setSaving(false);
          setStatusMsg('');
          Alert.alert(
            'Contract Saved',
            'Contract saved. Email failed. You can resend from contract detail.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        insertEmailLog({
          type:            'CONTRACT',
          tenancy_id:      contractId,
          recipient_email: tenantEmail.trim(),
          status:          'FAILED',
          sent_at:         null,
        });
        setSaving(false);
        setStatusMsg('');
        Alert.alert(
          'Contract Saved',
          'Contract saved. Connect to internet to send email.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      console.error('[CreateContractScreen] save error', err);
      setSaving(false);
      setStatusMsg('');
      Alert.alert('Error', 'Failed to save contract. Please try again.');
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
        <Text style={styles.headerTitle}>New Tenancy Contract</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Error Banner ─────────────────────────────────────────────── */}
          {loadError ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#E24B4A" />
              <Text style={styles.errorBannerText}>{loadError}</Text>
            </View>
          ) : null}

          {/* ── Agent Warning ────────────────────────────────────────────── */}
          {errors.agent ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#E24B4A" />
              <Text style={styles.errorBannerText}>{errors.agent}</Text>
            </View>
          ) : null}

          {/* ── Bed Selection ─────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bed</Text>

            {routeBedId ? (
              /* Pre-selected from BedUnitDetailScreen */
              bed ? (
                <View style={styles.selectedBedBox}>
                  <View style={styles.selectedBedRow}>
                    <MaterialCommunityIcons name="office-building" size={13} color="#888780" />
                    <Text style={styles.selectedBedPath} numberOfLines={1}>
                      {property?.name ?? '—'}  ›  {room?.name ?? '—'}  ›  {bed.bed_label}
                    </Text>
                  </View>
                  <Text style={styles.selectedBedRent}>
                    Tenant Rent: {currency} {parseFloat(bed.actual_rent ?? 0).toFixed(2)} / mo
                  </Text>
                </View>
              ) : (
                <ActivityIndicator color="#26215C" />
              )
            ) : (
              /* Opened directly — show available beds picker */
              availableBeds.length === 0 ? (
                <View style={styles.noBedsBox}>
                  <MaterialCommunityIcons name="information-outline" size={18} color="#888780" />
                  <Text style={styles.noBedsText}>No available beds found.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>
                    Select Bed <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.pickerWrapper, errors.bed && styles.inputError]}>
                    <Picker
                      selectedValue={selectedBedId}
                      onValueChange={(v) => { setSelectedBedId(v); setErrors((e) => ({ ...e, bed: null })); }}
                      style={styles.picker}
                      dropdownIconColor="#26215C"
                    >
                      {availableBeds.map((b) => (
                        <Picker.Item
                          key={b.id}
                          label={`${b.bed_label}  —  ${b.room_name}  —  ${b.property_name}`}
                          value={b.id}
                        />
                      ))}
                    </Picker>
                  </View>
                  {errors.bed ? <Text style={styles.errorText}>{errors.bed}</Text> : null}

                  {/* Selected bed summary */}
                  {bed && (
                    <View style={styles.selectedBedBox}>
                      <Text style={styles.selectedBedRent}>
                        Tenant Rent: {currency} {parseFloat(bed.actual_rent ?? 0).toFixed(2)} / mo
                      </Text>
                    </View>
                  )}
                </>
              )
            )}
          </View>

          {/* ── Tenant Details ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tenant Details</Text>

            <Text style={styles.label}>Tenant Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.tenantName && styles.inputError]}
              value={tenantName}
              onChangeText={(v) => { setTenantName(v); setErrors((e) => ({ ...e, tenantName: null })); }}
              placeholder="Full name"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="words"
            />
            {errors.tenantName ? <Text style={styles.errorText}>{errors.tenantName}</Text> : null}

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={tenantPhone}
              onChangeText={setTenantPhone}
              placeholder="+971 50 000 0000"
              placeholderTextColor="#AAAAAA"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.tenantEmail && styles.inputError]}
              value={tenantEmail}
              onChangeText={(v) => { setTenantEmail(v); setErrors((e) => ({ ...e, tenantEmail: null })); }}
              placeholder="tenant@email.com"
              placeholderTextColor="#AAAAAA"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.tenantEmail ? <Text style={styles.errorText}>{errors.tenantEmail}</Text> : null}

            <Text style={styles.label}>ID / Passport Number</Text>
            <TextInput
              style={styles.input}
              value={tenantIdNo}
              onChangeText={setTenantIdNo}
              placeholder="ID or passport number"
              placeholderTextColor="#AAAAAA"
              autoCapitalize="characters"
            />
          </View>

          {/* ── Contract Terms ────────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contract Terms</Text>

            <DatePickerField
              label="Check-in Date"
              required
              value={checkInDate}
              onChange={(v) => { setCheckInDate(v); setErrors((e) => ({ ...e, checkInDate: null })); }}
              placeholder="Select check-in date"
              error={errors.checkInDate}
            />

            <DatePickerField
              label="Check-out Date"
              value={checkOutDate}
              onChange={setCheckOutDate}
              placeholder="Select check-out date (optional)"
            />

            <Text style={styles.label}>
              Monthly Rent ({currency}) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.monthlyRent && styles.inputError]}
              value={monthlyRent}
              onChangeText={(v) => { setMonthlyRent(v); setErrors((e) => ({ ...e, monthlyRent: null })); }}
              placeholder="0.00"
              placeholderTextColor="#AAAAAA"
              keyboardType="decimal-pad"
            />
            {errors.monthlyRent ? <Text style={styles.errorText}>{errors.monthlyRent}</Text> : null}

            <Text style={styles.label}>Deposit Amount ({currency})</Text>
            <TextInput
              style={styles.input}
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="0.00"
              placeholderTextColor="#AAAAAA"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>
              Payment Due Day <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.paymentDueDay && styles.inputError]}
              value={paymentDueDay}
              onChangeText={(v) => { setPaymentDueDay(v); setErrors((e) => ({ ...e, paymentDueDay: null })); }}
              placeholder="1"
              placeholderTextColor="#AAAAAA"
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.helperText}>Day of month when rent is due (e.g. 5 for 5th)</Text>
            {errors.paymentDueDay ? <Text style={styles.errorText}>{errors.paymentDueDay}</Text> : null}

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional terms or notes..."
              placeholderTextColor="#AAAAAA"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* ── Save Button ───────────────────────────────────────────────── */}
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
              <Text style={styles.saveBtnText}>Create Contract</Text>
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
  },
  backBtn:     { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 8 },

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

  selectedBedBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8D4F0',
  },
  selectedBedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  selectedBedPath: { fontSize: 13, color: '#26215C', fontWeight: '600', flex: 1 },
  selectedBedRent: { fontSize: 12, color: '#444' },

  noBedsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  noBedsText: { fontSize: 14, color: '#888780' },

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
    marginBottom: 16,
  },
  textArea:   { minHeight: 90, paddingTop: 12 },
  inputError: { borderColor: '#E24B4A' },
  errorText:  { color: '#E24B4A', fontSize: 12, marginTop: -12, marginBottom: 12 },
  helperText: { fontSize: 12, color: '#888780', marginTop: -12, marginBottom: 16 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  errorBannerText: { color: '#E24B4A', fontSize: 13, fontWeight: '600', flex: 1 },

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
  },
  dateFieldText: { fontSize: 15, color: '#1A1A2E', flex: 1 },

  datePickerRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  datePickerCol: { flex: 1 },
  datePickerColLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888780',
    textAlign: 'center',
    marginBottom: 4,
  },

  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: {
    backgroundColor: '#26215C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  dateModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
});
