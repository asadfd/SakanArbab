import React, { useState, useCallback, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getAllProperties,
  getExpensesByPropertyAndMonth,
  insertExpense,
  updateExpense,
  deleteExpense,
  getAgent,
} from '../../database/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['ELECTRICITY', 'WATER', 'MAINTENANCE', 'INTERNET', 'OTHER'];

const CATEGORY_META = {
  ELECTRICITY: { icon: 'lightning-bolt',  color: '#F59E0B', bg: '#FEF3C7' },
  WATER:       { icon: 'water',           color: '#378ADD', bg: '#EFF6FF' },
  MAINTENANCE: { icon: 'tools',           color: '#888780', bg: '#F1EFE8' },
  INTERNET:    { icon: 'wifi',            color: '#3B5CE4', bg: '#EEF2FF' },
  OTHER:       { icon: 'clipboard-list',  color: '#7C3AED', bg: '#F5F3FF' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 10 }, (_, i) => 2020 + i);

const EMPTY_FORM = { category: 'ELECTRICITY', amount: '', date: '', description: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentYM() {
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
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

// ─── Month/Year Picker Modal ──────────────────────────────────────────────────

function MonthYearModal({ visible, value, onConfirm, onClose }) {
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
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose} onShow={onShow}>
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
            style={styles.saveBtn}
            onPress={() => onConfirm(`${tempYear}-${String(tempMonth).padStart(2, '0')}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>Confirm</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Date Picker Field (inside add/edit modal) ────────────────────────────────

function DatePickerField({ value, onChange, error }) {
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
    <>
      <TouchableOpacity
        style={[styles.dateField, error && styles.inputError]}
        onPress={open}
        activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="calendar" size={17} color="#888780" />
        <Text style={[styles.dateFieldText, !value && { color: '#AAAAAA' }]}>
          {value ? fmtDate(value) : 'Select date'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={17} color="#888780" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Expense Date</Text>
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Day</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={tempDay} onValueChange={setTempDay} style={styles.picker} mode="dropdown" dropdownIconColor="#26215C">
                    {DAYS.map((d) => <Picker.Item key={d} label={String(d)} value={d} />)}
                  </Picker>
                </View>
              </View>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerColLabel}>Month</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={tempMonth} onValueChange={setTempMonth} style={styles.picker} mode="dropdown" dropdownIconColor="#26215C">
                    {MONTHS.map((m, i) => <Picker.Item key={m} label={m.slice(0,3)} value={i + 1} />)}
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
            <TouchableOpacity style={styles.saveBtn} onPress={confirm} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Confirm</Text>
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────

function ExpenseRow({ expense, currency, onEdit, onDelete }) {
  const swipeRef = useRef(null);
  const meta = CATEGORY_META[expense.category] ?? CATEGORY_META.OTHER;

  function renderRightActions() {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          Alert.alert(
            'Delete Expense',
            `Delete this ${expense.category.toLowerCase()} expense of ${fmtAmount(expense.amount, currency)}?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]
          );
        }}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity style={styles.expenseRow} onPress={onEdit} activeOpacity={0.82}>
        <View style={[styles.categoryIcon, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.expenseMiddle}>
          <Text style={styles.categoryName}>{expense.category}</Text>
          {expense.description ? (
            <Text style={styles.expenseDesc} numberOfLines={1}>{expense.description}</Text>
          ) : null}
          <Text style={styles.expenseDate}>{fmtDate(expense.expense_date)}</Text>
        </View>
        <Text style={styles.expenseAmount}>{fmtAmount(expense.amount, currency)}</Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function ExpenseModal({ visible, editingExpense, propertyId, onSaved, onClose }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function onShow() {
    if (editingExpense) {
      setForm({
        category:    editingExpense.category ?? 'ELECTRICITY',
        amount:      editingExpense.amount != null ? String(editingExpense.amount) : '',
        date:        editingExpense.expense_date ?? todayIso(),
        description: editingExpense.description ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM, date: todayIso() });
    }
    setErrors({});
  }

  function validate() {
    const e = {};
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Amount must be greater than 0';
    if (!form.date) e.date = 'Date is required';
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category:     form.category,
          amount:       parseFloat(form.amount),
          expense_date: form.date,
          description:  form.description.trim() || null,
        });
      } else {
        await insertExpense({
          property_id:  propertyId,
          category:     form.category,
          amount:       parseFloat(form.amount),
          expense_date: form.date,
          description:  form.description.trim() || null,
        });
      }
      onSaved();
    } catch (err) {
      console.error('[ExpensesScreen] save error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose} onShow={onShow}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                style={styles.picker}
                mode="dropdown"
                dropdownIconColor="#26215C"
              >
                {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
              </Picker>
            </View>

            {/* Amount */}
            <Text style={styles.label}>Amount <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              value={form.amount}
              onChangeText={(v) => { setForm((f) => ({ ...f, amount: v })); setErrors((e) => ({ ...e, amount: null })); }}
              placeholder="0.00"
              placeholderTextColor="#AAAAAA"
              keyboardType="decimal-pad"
            />
            {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

            {/* Date */}
            <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
            <DatePickerField
              value={form.date}
              onChange={(v) => { setForm((f) => ({ ...f, date: v })); setErrors((e) => ({ ...e, date: null })); }}
              error={errors.date}
            />

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Optional notes..."
              placeholderTextColor="#AAAAAA"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>{editingExpense ? 'Save Changes' : 'Save Expense'}</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const [properties, setProperties]         = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [filterMonth, setFilterMonth]       = useState(currentYM());
  const [expenses, setExpenses]             = useState([]);
  const [currency, setCurrency]             = useState('AED');
  const [loading, setLoading]               = useState(true);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // ─── Load properties on mount ──────────────────────────────────────────────

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const [props, a] = await Promise.all([getAllProperties(), getAgent()]);
        setProperties(props ?? []);
        if (props && props.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(props[0].id);
        }
        setCurrency(a?.currency ?? 'AED');
      } catch (err) {
        console.error('[ExpensesScreen] properties load error:', err);
      }
    })();
  }, []));

  // ─── Load expenses when property or month changes ──────────────────────────

  const loadExpenses = useCallback(async () => {
    if (!selectedPropertyId) { setExpenses([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getExpensesByPropertyAndMonth(selectedPropertyId, filterMonth);
      setExpenses(list ?? []);
    } catch (err) {
      console.error('[ExpensesScreen] expenses load error:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId, filterMonth]);

  useFocusEffect(useCallback(() => { loadExpenses(); }, [loadExpenses]));

  // ─── Summary calculations ──────────────────────────────────────────────────

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount ?? 0), 0);

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catTotal = expenses
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
    if (catTotal > 0) acc[cat] = catTotal;
    return acc;
  }, {});

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handlePropertyChange(id) {
    setSelectedPropertyId(id);
  }

  function openAdd() {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  }

  function openEdit(expense) {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  }

  async function handleDelete(id) {
    try {
      await deleteExpense(id);
      loadExpenses();
    } catch (err) {
      console.error('[ExpensesScreen] delete error:', err);
      Alert.alert('Error', err?.message ?? 'Failed to delete expense.');
    }
  }

  function onExpenseSaved() {
    setExpenseModalOpen(false);
    loadExpenses();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Property Expenses</Text>
      </View>

      {/* Property selector */}
      {properties.length === 0 ? (
        <View style={styles.noPropertiesBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#888780" />
          <Text style={styles.noPropertiesText}>No properties found. Add a property first.</Text>
        </View>
      ) : (
        <View style={styles.selectorRow}>
          <View style={styles.propertyPickerWrapper}>
            <MaterialCommunityIcons name="office-building" size={16} color="#888780" style={styles.selectorIcon} />
            <Picker
              selectedValue={selectedPropertyId}
              onValueChange={handlePropertyChange}
              style={styles.propertyPicker}
              dropdownIconColor="#26215C"
            >
              {properties.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => setMonthModalOpen(true)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="calendar-month" size={15} color="#26215C" />
            <Text style={styles.monthBtnText}>{ymToDisplay(filterMonth)}</Text>
            <MaterialCommunityIcons name="chevron-down" size={15} color="#26215C" />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary card */}
      {selectedPropertyId && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryTotal}>{fmtAmount(total, currency)}</Text>
          </View>
          {Object.keys(byCategory).length > 0 && (
            <View style={styles.pillsRow}>
              {Object.entries(byCategory).map(([cat, amt]) => {
                const meta = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
                return (
                  <View key={cat} style={[styles.categoryPill, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon} size={11} color={meta.color} />
                    <Text style={[styles.categoryPillText, { color: meta.color }]}>
                      {cat.slice(0, 4)}  {fmtAmount(amt, currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Expense list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#26215C" />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            expenses.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              currency={currency}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="receipt" size={52} color="#E0E0E0" />
              <Text style={styles.emptyText}>
                No expenses recorded for{'\n'}
                {selectedProperty?.name ?? 'this property'} in {ymToDisplay(filterMonth)}.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {selectedPropertyId ? (
        <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      {/* Month picker modal */}
      <MonthYearModal
        visible={monthModalOpen}
        value={filterMonth}
        onConfirm={(ym) => { setFilterMonth(ym); setMonthModalOpen(false); }}
        onClose={() => setMonthModalOpen(false)}
      />

      {/* Add / Edit expense modal */}
      <ExpenseModal
        visible={expenseModalOpen}
        editingExpense={editingExpense}
        propertyId={selectedPropertyId}
        onSaved={onExpenseSaved}
        onClose={() => setExpenseModalOpen(false)}
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
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },

  noPropertiesBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  noPropertiesText: { fontSize: 13, color: '#888780', flex: 1 },

  selectorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E8E8E8',
  },
  propertyPickerWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#F8F8F8', overflow: 'hidden',
  },
  selectorIcon:   { marginLeft: 10 },
  propertyPicker: { flex: 1, color: '#1A1A2E', height: 44 },
  monthBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#26215C', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#F0F4FF',
  },
  monthBtnText: { fontSize: 12, fontWeight: '700', color: '#26215C' },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  summaryTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: { fontSize: 13, color: '#888780', fontWeight: '600' },
  summaryTotal: { fontSize: 18, fontWeight: '800', color: '#E24B4A' },
  pillsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryPillText: { fontSize: 11, fontWeight: '700' },

  listContent:      { padding: 16 },
  listContentEmpty: { flex: 1 },

  expenseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  categoryIcon:   { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expenseMiddle:  { flex: 1 },
  categoryName:   { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  expenseDesc:    { fontSize: 12, color: '#888780', marginTop: 1 },
  expenseDate:    { fontSize: 11, color: '#AAAAAA', marginTop: 2 },
  expenseAmount:  { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },

  deleteAction: {
    backgroundColor: '#E24B4A', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    width: 80, marginBottom: 10,
    gap: 4,
  },
  deleteActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#26215C',
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },

  // ── Modal shared ──────────────────────────────────────────────────────────
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle:        { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 20 },
  label:             { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 6 },
  required:          { color: '#E24B4A' },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#1A1A2E', backgroundColor: '#F8F8F8', marginBottom: 16,
  },
  textArea:   { minHeight: 80, paddingTop: 12 },
  inputError: { borderColor: '#E24B4A' },
  errorText:  { color: '#E24B4A', fontSize: 12, marginTop: -12, marginBottom: 12 },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    backgroundColor: '#F8F8F8', overflow: 'hidden', marginBottom: 16,
  },
  picker:     { color: '#1A1A2E', height: 50 },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: '#F8F8F8', marginBottom: 16,
  },
  dateFieldText: { fontSize: 15, color: '#1A1A2E', flex: 1 },
  datePickerRow:      { flexDirection: 'row', gap: 8, marginBottom: 20 },
  datePickerCol:      { flex: 1 },
  datePickerColLabel: { fontSize: 12, fontWeight: '600', color: '#888780', textAlign: 'center', marginBottom: 4 },
  saveBtn:        { backgroundColor: '#26215C', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText:    { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
