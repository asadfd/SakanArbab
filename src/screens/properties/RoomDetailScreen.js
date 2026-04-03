import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
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
  getRoomById,
  updateRoom,
  getBedsByRoom,
  insertBed,
  updateBed,
  getAgent,
} from '../../database/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['AVAILABLE', 'RESERVED', 'MAINTENANCE'];

const STATUS_STYLE = {
  AVAILABLE:   { bg: '#EAF3DE', text: '#1D9E75' },
  OCCUPIED:    { bg: '#FCEBEB', text: '#E24B4A' },
  RESERVED:    { bg: '#FAEEDA', text: '#BA7517' },
  MAINTENANCE: { bg: '#F1EFE8', text: '#888780' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoomStats(beds) {
  return {
    total:       beds.length,
    available:   beds.filter((b) => b.status === 'AVAILABLE').length,
    occupied:    beds.filter((b) => b.status === 'OCCUPIED').length,
    reserved:    beds.filter((b) => b.status === 'RESERVED').length,
    maintenance: beds.filter((b) => b.status === 'MAINTENANCE').length,
  };
}

function formatAmount(val) {
  const n = parseFloat(val ?? 0);
  return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const EMPTY_BED_FORM  = { label: '', status: 'AVAILABLE', ownerRent: '', actualRent: '', commission: '' };
const EMPTY_ROOM_FORM = { name: '', floor: '', description: '' };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RoomDetailScreen({ navigation, route }) {
  const { roomId } = route.params;

  const [room, setRoom]         = useState(null);
  const [beds, setBeds]         = useState([]);
  const [stats, setStats]       = useState({});
  const [currency, setCurrency] = useState('AED');
  const [loading, setLoading]   = useState(true);

  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [roomForm, setRoomForm]                 = useState(EMPTY_ROOM_FORM);
  const [roomFormError, setRoomFormError]       = useState('');
  const [roomSaving, setRoomSaving]             = useState(false);

  const [bedModalVisible, setBedModalVisible] = useState(false);
  const [editingBed, setEditingBed]           = useState(null);
  const [bedForm, setBedForm]                 = useState(EMPTY_BED_FORM);
  const [bedFormError, setBedFormError]       = useState('');
  const [bedSaving, setBedSaving]             = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const r = getRoomById(roomId);
    setRoom(r);
    const bedList = getBedsByRoom(roomId);
    setBeds(bedList);
    setStats(getRoomStats(bedList));
    const agent = getAgent();
    setCurrency(agent?.currency ?? 'AED');
    setLoading(false);
  }, [roomId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Room Edit ─────────────────────────────────────────────────────────────

  function openRoomEdit() {
    if (!room) return;
    setRoomForm({ name: room.name ?? '', floor: room.floor ?? '', description: room.description ?? '' });
    setRoomFormError('');
    setRoomModalVisible(true);
  }

  function handleRoomSave() {
    if (!roomForm.name.trim()) { setRoomFormError('Room name is required.'); return; }
    setRoomSaving(true);
    try {
      updateRoom(roomId, {
        name: roomForm.name.trim(),
        floor: roomForm.floor.trim() || null,
        description: roomForm.description.trim() || null,
      });
      setRoomModalVisible(false);
      load();
    } finally {
      setRoomSaving(false);
    }
  }

  // ─── Bed Actions ───────────────────────────────────────────────────────────

  function openAddBed() {
    setEditingBed(null);
    setBedForm(EMPTY_BED_FORM);
    setBedFormError('');
    setBedModalVisible(true);
  }

  function openEditBed(bed) {
    setEditingBed(bed);
    setBedForm({
      label:      bed.bed_label ?? '',
      status:     bed.status ?? 'AVAILABLE',
      ownerRent:  bed.owner_rent  != null ? String(bed.owner_rent)  : '',
      actualRent: bed.actual_rent != null ? String(bed.actual_rent) : '',
      commission: bed.commission  != null ? String(bed.commission)  : '',
    });
    setBedFormError('');
    setBedModalVisible(true);
  }

  function handleBedSave() {
    if (!bedForm.label.trim()) { setBedFormError('Bed label is required.'); return; }
    setBedSaving(true);
    try {
      const payload = {
        bed_label:   bedForm.label.trim().toUpperCase(),
        status:      bedForm.status,
        owner_rent:  parseFloat(bedForm.ownerRent)  || 0,
        actual_rent: parseFloat(bedForm.actualRent) || 0,
        commission:  parseFloat(bedForm.commission) || 0,
      };
      if (editingBed) {
        updateBed(editingBed.id, payload);
      } else {
        insertBed({ room_id: roomId, ...payload });
      }
      setBedModalVisible(false);
      load();
    } finally {
      setBedSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading || !room) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#26215C" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{room.name}</Text>
        <TouchableOpacity onPress={openRoomEdit} style={styles.editBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Room Info Card */}
        <View style={styles.infoCard}>
          {room.floor ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="layers-outline" size={15} color="#888780" />
              <Text style={styles.infoText}>Floor: {room.floor}</Text>
            </View>
          ) : null}
          {room.description ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="text-box-outline" size={15} color="#888780" />
              <Text style={styles.infoText}>{room.description}</Text>
            </View>
          ) : null}
          <View style={styles.pillRow}>
            <StatPill label={`${stats.total} Total`}          color="#26215C" bg="#EEEDFE" />
            <StatPill label={`${stats.available} Available`}  color="#1D9E75" bg="#EAF3DE" />
            <StatPill label={`${stats.occupied} Occupied`}    color="#E24B4A" bg="#FCEBEB" />
            {stats.reserved    > 0 && <StatPill label={`${stats.reserved} Reserved`}       color="#BA7517" bg="#FAEEDA" />}
            {stats.maintenance > 0 && <StatPill label={`${stats.maintenance} Maintenance`} color="#888780" bg="#F1EFE8" />}
          </View>
        </View>

        {/* Beds Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bed Units</Text>
          <TouchableOpacity style={styles.addBedBtn} onPress={openAddBed} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addBedBtnText}>Add Bed</Text>
          </TouchableOpacity>
        </View>

        {/* Beds Grid */}
        {beds.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bed-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No beds in this room yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAddBed} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>+ Add Bed</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={beds}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => {
              const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.AVAILABLE;
              return (
                <TouchableOpacity
                  style={styles.bedCard}
                  onPress={() => navigation.navigate('BedUnitDetailScreen', { bedId: item.id })}
                  onLongPress={() => openEditBed(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bedLabel}>{item.bed_label}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.text }]}>{item.status}</Text>
                  </View>
                  <Text style={styles.bedRent}>
                    {currency} {formatAmount(item.actual_rent)}
                    <Text style={styles.bedRentLabel}>/mo</Text>
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Add Button (when beds exist) */}
      {beds.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openAddBed} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Room Edit Modal */}
      <Modal visible={roomModalVisible} animationType="slide" transparent onRequestClose={() => setRoomModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRoomModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Room</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Room Name <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, roomFormError && styles.inputError]} value={roomForm.name} onChangeText={(v) => { setRoomForm((f) => ({ ...f, name: v })); setRoomFormError(''); }} placeholder="e.g. Room 101" placeholderTextColor="#AAAAAA" autoFocus />
              {roomFormError ? <Text style={styles.errorText}>{roomFormError}</Text> : null}
              <Text style={styles.label}>Floor</Text>
              <TextInput style={styles.input} value={roomForm.floor} onChangeText={(v) => setRoomForm((f) => ({ ...f, floor: v }))} placeholder="e.g. Ground, 1st, 2nd" placeholderTextColor="#AAAAAA" />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={roomForm.description} onChangeText={(v) => setRoomForm((f) => ({ ...f, description: v }))} placeholder="Optional notes" placeholderTextColor="#AAAAAA" multiline numberOfLines={3} textAlignVertical="top" />
              <TouchableOpacity style={[styles.saveBtn, roomSaving && styles.saveBtnDisabled]} onPress={handleRoomSave} disabled={roomSaving} activeOpacity={0.85}>
                {roomSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bed Add/Edit Modal */}
      <Modal visible={bedModalVisible} animationType="slide" transparent onRequestClose={() => setBedModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBedModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingBed ? 'Edit Bed' : 'New Bed'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Bed Label <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, bedFormError && styles.inputError]} value={bedForm.label} onChangeText={(v) => { setBedForm((f) => ({ ...f, label: v })); setBedFormError(''); }} placeholder="e.g. A1, B2" placeholderTextColor="#AAAAAA" autoCapitalize="characters" autoFocus />
              {bedFormError ? <Text style={styles.errorText}>{bedFormError}</Text> : null}

              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={bedForm.status} onValueChange={(v) => setBedForm((f) => ({ ...f, status: v }))} style={styles.picker} dropdownIconColor="#26215C">
                  {STATUS_OPTIONS.map((s) => <Picker.Item key={s} label={s} value={s} />)}
                </Picker>
              </View>

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
                {bedSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>{editingBed ? 'Save Changes' : 'Add Bed'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, color, bg }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
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
  backBtn:     { padding: 6 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginHorizontal: 8 },
  editBtn:     { padding: 6 },

  scrollContent: { padding: 16 },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#E8E8E8', gap: 10,
  },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#444' },
  pillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:     { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
  addBedBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#26215C', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, gap: 4,
  },
  addBedBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  gridRow:  { gap: 12, marginBottom: 12 },
  bedCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  bedLabel:      { fontSize: 26, fontWeight: 'bold', color: '#1A1A2E' },
  statusBadge:   { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  statusText:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  bedRent:       { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  bedRentLabel:  { fontSize: 11, fontWeight: '400', color: '#888780' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 15, color: '#888780' },
  emptyBtn:   { backgroundColor: '#26215C', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 11 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#26215C', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },

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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 20 },
  label:      { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  required:   { color: '#E24B4A' },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#1A1A2E', backgroundColor: '#F8F8F8', marginBottom: 16,
  },
  inputMultiline: { minHeight: 80, paddingTop: 11 },
  inputError:     { borderColor: '#E24B4A' },
  errorText:      { color: '#E24B4A', fontSize: 12, marginTop: -12, marginBottom: 12 },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#F8F8F8', overflow: 'hidden', marginBottom: 16,
  },
  picker: { color: '#1A1A2E', height: 50 },
  internalNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, marginBottom: 16,
  },
  internalNoteText: { flex: 1, fontSize: 12, color: '#888780', lineHeight: 18 },
  saveBtn:         { backgroundColor: '#26215C', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
