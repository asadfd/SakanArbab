import React, { useState, useCallback, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPropertyById,
  updateProperty,
  getRoomsByProperty,
  insertRoom,
  updateRoom,
  deleteRoom,
  getBedsByRoom,
} from '../../database/database';
import db from '../../database/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoomStats(roomId) {
  const beds = getBedsByRoom(roomId);
  const total = beds.length;
  const available = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  return { total, available, occupied };
}

function hasActiveContracts(roomId) {
  const row = db.getFirstSync(
    `SELECT COUNT(*) AS c
     FROM tenancy_contracts tc
     JOIN bed_units bu ON bu.id = tc.bed_unit_id
     WHERE bu.room_id = ? AND tc.status = 'ACTIVE'`,
    [roomId]
  );
  return (row?.c ?? 0) > 0;
}

function getPropertyStats(propertyId) {
  const roomCount = db.getFirstSync(
    `SELECT COUNT(*) AS c FROM rooms WHERE property_id = ?`, [propertyId]
  )?.c ?? 0;
  const bedCount = db.getFirstSync(
    `SELECT COUNT(*) AS c FROM bed_units bu JOIN rooms r ON r.id = bu.room_id WHERE r.property_id = ?`,
    [propertyId]
  )?.c ?? 0;
  const availCount = db.getFirstSync(
    `SELECT COUNT(*) AS c FROM bed_units bu JOIN rooms r ON r.id = bu.room_id WHERE r.property_id = ? AND bu.status = 'AVAILABLE'`,
    [propertyId]
  )?.c ?? 0;
  return { roomCount, bedCount, availCount };
}

const EMPTY_ROOM_FORM = { name: '', floor: '', description: '' };
const EMPTY_PROP_FORM = { name: '', address: '', city: '', description: '' };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PropertyDetailScreen({ navigation, route }) {
  const { propertyId } = route.params;

  const [property, setProperty] = useState(null);
  const [stats, setStats] = useState({ roomCount: 0, bedCount: 0, availCount: 0 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [propModalVisible, setPropModalVisible] = useState(false);
  const [propForm, setPropForm] = useState(EMPTY_PROP_FORM);
  const [propFormError, setPropFormError] = useState('');
  const [propSaving, setPropSaving] = useState(false);

  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [roomFormError, setRoomFormError] = useState('');
  const [roomSaving, setRoomSaving] = useState(false);

  const swipeableRefs = useRef({});

  const load = useCallback(() => {
    setLoading(true);
    const prop = getPropertyById(propertyId);
    setProperty(prop);
    setStats(getPropertyStats(propertyId));
    const roomList = getRoomsByProperty(propertyId);
    setRooms(roomList.map((r) => ({ ...r, ...getRoomStats(r.id) })));
    setLoading(false);
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Property Edit ─────────────────────────────────────────────────────────

  function openPropEdit() {
    if (!property) return;
    setPropForm({
      name: property.name ?? '',
      address: property.address ?? '',
      city: property.city ?? '',
      description: property.description ?? '',
    });
    setPropFormError('');
    setPropModalVisible(true);
  }

  async function handlePropSave() {
    if (!propForm.name.trim()) { setPropFormError('Property name is required.'); return; }
    setPropSaving(true);
    try {
      updateProperty(propertyId, {
        name: propForm.name.trim(),
        address: propForm.address.trim() || null,
        city: propForm.city.trim() || null,
        description: propForm.description.trim() || null,
      });
      setPropModalVisible(false);
      load();
    } finally {
      setPropSaving(false);
    }
  }

  // ─── Room Actions ──────────────────────────────────────────────────────────

  function openAddRoom() {
    setEditingRoom(null);
    setRoomForm(EMPTY_ROOM_FORM);
    setRoomFormError('');
    setRoomModalVisible(true);
  }

  function openEditRoom(room) {
    Object.values(swipeableRefs.current).forEach((r) => r?.close());
    setEditingRoom(room);
    setRoomForm({
      name: room.name ?? '',
      floor: room.floor ?? '',
      description: room.description ?? '',
    });
    setRoomFormError('');
    setRoomModalVisible(true);
  }

  function handleDeleteRoom(room) {
    Object.values(swipeableRefs.current).forEach((r) => r?.close());
    if (hasActiveContracts(room.id)) {
      Alert.alert('Cannot Delete', 'This room has active contracts. End all contracts first.');
      return;
    }
    Alert.alert(
      'Delete Room',
      `Delete "${room.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteRoom(room.id); load(); } },
      ]
    );
  }

  async function handleRoomSave() {
    if (!roomForm.name.trim()) { setRoomFormError('Room name is required.'); return; }
    setRoomSaving(true);
    try {
      if (editingRoom) {
        updateRoom(editingRoom.id, {
          name: roomForm.name.trim(),
          floor: roomForm.floor.trim() || null,
          description: roomForm.description.trim() || null,
        });
      } else {
        insertRoom({
          property_id: propertyId,
          name: roomForm.name.trim(),
          floor: roomForm.floor.trim() || null,
          description: roomForm.description.trim() || null,
        });
      }
      setRoomModalVisible(false);
      load();
    } finally {
      setRoomSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading || !property) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#26215C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{property.name}</Text>
        <TouchableOpacity onPress={openPropEdit} style={styles.editBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Property Info Card */}
        <View style={styles.infoCard}>
          {(property.city || property.address) ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#888780" />
              <Text style={styles.infoText}>
                {[property.city, property.address].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
          {property.description ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color="#888780" />
              <Text style={styles.infoText}>{property.description}</Text>
            </View>
          ) : null}
          <View style={styles.pillRow}>
            <InfoPill icon="door" label={`${stats.roomCount} Rooms`} />
            <InfoPill icon="bed" label={`${stats.bedCount} Beds`} />
            <InfoPill icon="check-circle-outline" label={`${stats.availCount} Available`} color="#1D9E75" />
          </View>
        </View>

        {/* Rooms Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Rooms</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rooms.length}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addRoomBtn} onPress={openAddRoom} activeOpacity={0.8}>
            <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addRoomBtnText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {/* Rooms List */}
        {rooms.length === 0 ? (
          <View style={styles.emptyRooms}>
            <MaterialCommunityIcons name="door-open" size={40} color="#CCCCCC" />
            <Text style={styles.emptyText}>No rooms yet. Add your first room.</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <Swipeable
              key={room.id}
              ref={(ref) => { swipeableRefs.current[room.id] = ref; }}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.swipeDelete}
                  onPress={() => handleDeleteRoom(room)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.swipeDeleteText}>Delete</Text>
                </TouchableOpacity>
              )}
              overshootRight={false}
            >
              <TouchableOpacity
                style={styles.roomCard}
                onPress={() => navigation.navigate('RoomDetailScreen', { roomId: room.id })}
                onLongPress={() => openEditRoom(room)}
                activeOpacity={0.85}
              >
                <View style={styles.roomCardTop}>
                  <View style={styles.roomIconWrap}>
                    <MaterialCommunityIcons name="door" size={20} color="#378ADD" />
                  </View>
                  <View style={styles.roomCardMain}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    {room.floor ? <Text style={styles.roomFloor}>Floor: {room.floor}</Text> : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#CCCCCC" />
                </View>
                <View style={styles.pillRow}>
                  <InfoPill icon="bed" label={`${room.total} Beds`} />
                  <InfoPill icon="check-circle-outline" label={`${room.available} Available`} color="#1D9E75" />
                  <InfoPill icon="account" label={`${room.occupied} Occupied`} color="#E24B4A" />
                </View>
              </TouchableOpacity>
            </Swipeable>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Property Edit Modal */}
      <Modal visible={propModalVisible} animationType="slide" transparent onRequestClose={() => setPropModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPropModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Property</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Property Name <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, propFormError && styles.inputError]} value={propForm.name} onChangeText={(v) => { setPropForm((f) => ({ ...f, name: v })); setPropFormError(''); }} placeholder="e.g. Al Noor Building" placeholderTextColor="#AAAAAA" autoFocus />
              {propFormError ? <Text style={styles.errorText}>{propFormError}</Text> : null}
              <Text style={styles.label}>City</Text>
              <TextInput style={styles.input} value={propForm.city} onChangeText={(v) => setPropForm((f) => ({ ...f, city: v }))} placeholder="e.g. Dubai" placeholderTextColor="#AAAAAA" />
              <Text style={styles.label}>Address</Text>
              <TextInput style={styles.input} value={propForm.address} onChangeText={(v) => setPropForm((f) => ({ ...f, address: v }))} placeholder="Street, building, area" placeholderTextColor="#AAAAAA" />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={propForm.description} onChangeText={(v) => setPropForm((f) => ({ ...f, description: v }))} placeholder="Optional notes" placeholderTextColor="#AAAAAA" multiline numberOfLines={3} textAlignVertical="top" />
              <TouchableOpacity style={[styles.saveBtn, propSaving && styles.saveBtnDisabled]} onPress={handlePropSave} disabled={propSaving} activeOpacity={0.85}>
                {propSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Room Add/Edit Modal */}
      <Modal visible={roomModalVisible} animationType="slide" transparent onRequestClose={() => setRoomModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRoomModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingRoom ? 'Edit Room' : 'New Room'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Room Name <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, roomFormError && styles.inputError]} value={roomForm.name} onChangeText={(v) => { setRoomForm((f) => ({ ...f, name: v })); setRoomFormError(''); }} placeholder="e.g. Room 101" placeholderTextColor="#AAAAAA" autoFocus />
              {roomFormError ? <Text style={styles.errorText}>{roomFormError}</Text> : null}
              <Text style={styles.label}>Floor</Text>
              <TextInput style={styles.input} value={roomForm.floor} onChangeText={(v) => setRoomForm((f) => ({ ...f, floor: v }))} placeholder="e.g. Ground, 1st, 2nd" placeholderTextColor="#AAAAAA" />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={roomForm.description} onChangeText={(v) => setRoomForm((f) => ({ ...f, description: v }))} placeholder="Optional notes" placeholderTextColor="#AAAAAA" multiline numberOfLines={3} textAlignVertical="top" />
              <TouchableOpacity style={[styles.saveBtn, roomSaving && styles.saveBtnDisabled]} onPress={handleRoomSave} disabled={roomSaving} activeOpacity={0.85}>
                {roomSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>{editingRoom ? 'Save Changes' : 'Add Room'}</Text>}
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

function InfoPill({ icon, label, color = '#888780' }) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={13} color={color} />
      <Text style={[styles.statPillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26215C',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtn: { padding: 6 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginHorizontal: 8 },
  editBtn: { padding: 6 },

  scrollContent: { padding: 16 },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F4F4F4', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  statPillText: { fontSize: 11, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
  badge: {
    backgroundColor: '#26215C', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  addRoomBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#26215C', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, gap: 4,
  },
  addRoomBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  roomCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  roomCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roomIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EAF2FD', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  roomCardMain: { flex: 1 },
  roomName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  roomFloor: { fontSize: 12, color: '#888780', marginTop: 2 },

  swipeDelete: {
    backgroundColor: '#E24B4A', justifyContent: 'center',
    alignItems: 'center', width: 80, borderRadius: 12,
    marginLeft: 8, marginBottom: 10, gap: 4,
  },
  swipeDeleteText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  emptyRooms: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#888780', textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  required: { color: '#E24B4A' },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#1A1A2E', backgroundColor: '#F8F8F8', marginBottom: 16,
  },
  inputMultiline: { minHeight: 80, paddingTop: 11 },
  inputError: { borderColor: '#E24B4A' },
  errorText: { color: '#E24B4A', fontSize: 12, marginTop: -12, marginBottom: 12 },
  saveBtn: {
    backgroundColor: '#26215C', borderRadius: 10,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
