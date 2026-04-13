import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
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
  getAllProperties,
  insertProperty,
  updateProperty,
  deleteProperty,
  getPropertyStats,
} from '../../database/database';

const EMPTY_FORM = { name: '', address: '', city: '', description: '' };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PropertiesListScreen({ navigation }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const swipeableRefs = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllProperties();
      const withStats = await Promise.all(
        list.map(async (p) => ({ ...p, ...(await getPropertyStats(p.id)) }))
      );
      setProperties(withStats);
    } catch (err) {
      console.error('Properties load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openAdd() {
    setEditingProperty(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalVisible(true);
  }

  function openEdit(property) {
    // Close any open swipeable
    Object.values(swipeableRefs.current).forEach((r) => r?.close());
    setEditingProperty(property);
    setForm({
      name: property.name ?? '',
      address: property.address ?? '',
      city: property.city ?? '',
      description: property.description ?? '',
    });
    setFormError('');
    setModalVisible(true);
  }

  function handleDelete(property) {
    Object.values(swipeableRefs.current).forEach((r) => r?.close());
    Alert.alert(
      'Delete Property',
      `Delete "${property.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProperty(property.id);
              await load();
            } catch (err) {
              Alert.alert('Error', err?.message ?? 'Failed to delete property.');
            }
          },
        },
      ]
    );
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Property name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, {
          name: form.name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          description: form.description.trim() || null,
        });
      } else {
        await insertProperty({
          name: form.name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          description: form.description.trim() || null,
        });
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      setFormError(err?.message ?? 'Failed to save property.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Swipe Actions ─────────────────────────────────────────────────────────

  function renderRightActions(property) {
    return (
      <TouchableOpacity
        style={styles.swipeDelete}
        onPress={() => handleDelete(property)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </TouchableOpacity>
    );
  }

  function renderLeftActions(property) {
    return (
      <TouchableOpacity
        style={styles.swipeEdit}
        onPress={() => openEdit(property)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFFFFF" />
        <Text style={styles.swipeEditText}>Edit</Text>
      </TouchableOpacity>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Properties</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#26215C" />
        </View>
      ) : properties.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="office-building-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No properties yet</Text>
          <Text style={styles.emptySubtitle}>Tap + Add to create your first property</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>+ Add Property</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
              renderRightActions={() => renderRightActions(item)}
              renderLeftActions={() => renderLeftActions(item)}
              overshootRight={false}
              overshootLeft={false}
            >
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('PropertyDetailScreen', { propertyId: item.id })}
                onLongPress={() => openEdit(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardIconWrap}>
                    <MaterialCommunityIcons name="office-building" size={22} color="#7F77DD" />
                  </View>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    {(item.city || item.address) ? (
                      <Text style={styles.cardAddress} numberOfLines={1}>
                        {[item.city, item.address].filter(Boolean).join(' • ')}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#CCCCCC" />
                </View>

                <View style={styles.statsRow}>
                  <StatPill icon="door" label={`${item.roomCount} Room${item.roomCount !== 1 ? 's' : ''}`} />
                  <StatPill icon="bed" label={`${item.bedCount} Bed${item.bedCount !== 1 ? 's' : ''}`} />
                  <StatPill icon="check-circle-outline" label={`${item.availCount} Available`} color="#1D9E75" />
                </View>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingProperty ? 'Edit Property' : 'New Property'}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>
                Property Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, formError && styles.inputError]}
                value={form.name}
                onChangeText={(v) => { setForm((f) => ({ ...f, name: v })); setFormError(''); }}
                placeholder="e.g. Al Noor Building"
                placeholderTextColor="#AAAAAA"
                autoFocus
              />
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                placeholder="e.g. Dubai"
                placeholderTextColor="#AAAAAA"
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                placeholder="Street, building, area"
                placeholderTextColor="#AAAAAA"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Optional notes"
                placeholderTextColor="#AAAAAA"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingProperty ? 'Save Changes' : 'Add Property'}
                  </Text>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ icon, label, color = '#888780' }) {
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#26215C',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // List
  listContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEEDFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardMain: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E' },
  cardAddress: { fontSize: 12, color: '#888780', marginTop: 2 },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statPillText: { fontSize: 11, fontWeight: '600' },

  // Swipe actions
  swipeDelete: {
    backgroundColor: '#E24B4A',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  swipeDeleteText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  swipeEdit: {
    backgroundColor: '#378ADD',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginRight: 8,
    gap: 4,
  },
  swipeEditText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // Empty state
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  emptySubtitle: { fontSize: 13, color: '#888780', textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: '#26215C',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
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
  inputMultiline: { minHeight: 80, paddingTop: 11 },
  inputError: { borderColor: '#E24B4A' },
  errorText: { color: '#E24B4A', fontSize: 12, marginTop: -12, marginBottom: 12 },
  saveBtn: {
    backgroundColor: '#26215C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
