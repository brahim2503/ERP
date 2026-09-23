// ============================================================
// SuppliersScreen — Supplier management
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { SearchBar } from '../components/SearchBar';
import { AppButton } from '../components/AppButton';
import { useStore, Supplier } from '../store/useStore';
import { fsGetCollection, fsAddDoc, fsSetDoc, fsDeleteDoc } from '../config/firebase';
import { formatCurrency } from '../utils/helpers';

export function SuppliersScreen() {
  const { suppliers, setSuppliers, settings } = useStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Supplier>>({ status: 'active' });

  const loadSuppliers = async () => {
    const data = await fsGetCollection('suppliers');
    setSuppliers(data as any);
  };

  useEffect(() => { loadSuppliers(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadSuppliers(); setRefreshing(false); };

  const filtered = useMemo(() =>
    suppliers.filter((s) =>
      s.name.includes(search) || (s.phone || '').includes(search)
    ), [suppliers, search]);

  const openAdd = () => { setForm({ status: 'active' }); setEditMode(false); setModalVisible(true); };
  const openEdit = (s: Supplier) => { setForm({ ...s }); setEditMode(true); setModalVisible(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { Alert.alert('خطأ', 'الاسم والهاتف مطلوبان'); return; }
    setSaving(true);
    try {
      if (editMode && form.id) {
        await fsSetDoc('suppliers', form.id, form);
        setSuppliers(suppliers.map((s) => s.id === form.id ? { ...s, ...form } as Supplier : s));
      } else {
        const id = await fsAddDoc('suppliers', { ...form, totalDebt: 0 });
        setSuppliers([{ id: id!, ...form, totalDebt: 0 } as Supplier, ...suppliers]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s: Supplier) => {
    Alert.alert('حذف المورد', `هل تريد حذف ${s.name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await fsDeleteDoc('suppliers', s.id);
          setSuppliers(suppliers.filter((x) => x.id !== s.id));
        },
      },
    ]);
  };

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: '#7c3aed20' }]}>
          <Text style={[styles.avatarText, { color: '#7c3aed' }]}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.supplierName}>{item.name}</Text>
            <View style={[styles.statusBadge, {
              backgroundColor: item.status === 'active' ? Colors.successBg : Colors.dangerBg,
            }]}>
              <Text style={{ fontSize: 10, fontFamily: 'Tajawal', fontWeight: '700', color: item.status === 'active' ? Colors.success : Colors.danger }}>
                {item.status === 'active' ? 'نشط' : 'موقوف'}
              </Text>
            </View>
          </View>
          <Text style={styles.supplierPhone}>📞 {item.phone}</Text>
          {item.state && <Text style={styles.supplierCity}>📍 {item.state} — {item.city}</Text>}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
        </View>
      </View>

      <View style={[styles.debtBox, {
        backgroundColor: (item.totalDebt || 0) > 0 ? Colors.dangerBg : Colors.successBg,
      }]}>
        <Text style={styles.debtLabel}>الدين المستحق للمورد:</Text>
        <Text style={[styles.debtValue, { color: (item.totalDebt || 0) > 0 ? Colors.danger : Colors.success }]}>
          {formatCurrency(item.totalDebt || 0, settings.currency)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الهاتف..." />

      <View style={styles.headerRow}>
        <AppButton title="+ إضافة مورد" onPress={openAdd} small />
        <Text style={styles.countText}>{filtered.length} مورد</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderSupplier}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد موردون</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalCard, Shadow.lg]}>
              <Text style={styles.modalTitle}>{editMode ? '✏️ تعديل المورد' : '➕ إضافة مورد جديد'}</Text>

              {[
                { key: 'name', label: '🏭 اسم المورد *', placeholder: 'اسم المورد' },
                { key: 'phone', label: '📞 الهاتف *', placeholder: '0551234567' },
                { key: 'whatsapp', label: '💬 واتساب', placeholder: '+213551234567' },
                { key: 'email', label: '✉️ البريد الإلكتروني', placeholder: 'email@example.com' },
                { key: 'address', label: '📍 العنوان', placeholder: 'الحي، الشارع...' },
                { key: 'state', label: '🗺️ الولاية', placeholder: 'اختر الولاية...' },
                { key: 'city', label: '🏙️ المدينة', placeholder: 'اسم المدينة' },
                { key: 'commercialRegisterNo', label: '📋 رقم السجل التجاري', placeholder: 'RC-...' },
                { key: 'taxId', label: '🧾 الرقم الجبائي (NIF)', placeholder: 'NIF-...' },
                { key: 'notes', label: '📝 ملاحظات', placeholder: 'أي ملاحظات...' },
              ].map(({ key, label, placeholder }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[key] || ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textMuted}
                    textAlign="right"
                  />
                </View>
              ))}

              {/* Status Toggle */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>📊 الحالة</Text>
                <View style={styles.statusRow}>
                  {(['active', 'suspended'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusOption, form.status === s && styles.statusOptionActive]}
                      onPress={() => setForm((f) => ({ ...f, status: s }))}
                    >
                      <Text style={[styles.statusOptionText, form.status === s && { color: '#fff' }]}>
                        {s === 'active' ? '✅ نشط' : '🚫 موقوف'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalBtns}>
                <AppButton title="إلغاء" onPress={() => setModalVisible(false)} variant="secondary" style={{ flex: 1 }} />
                <AppButton title={editMode ? 'حفظ التعديل' : 'إضافة'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage, paddingTop: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  countText: { fontSize: 13, color: Colors.textMuted, fontFamily: 'Tajawal' },
  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.md },
  avatarText: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 4 },
  supplierName: { fontSize: 15, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  supplierPhone: { fontSize: 12, color: Colors.textLight, fontFamily: 'Tajawal', textAlign: 'right' },
  supplierCity: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'right', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  debtBox: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: BorderRadius.sm, padding: Spacing.sm },
  debtLabel: { fontSize: 12, color: Colors.textLight, fontFamily: 'Tajawal' },
  debtValue: { fontSize: 14, fontWeight: '800', fontFamily: 'Tajawal' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'center', marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 14, fontFamily: 'Tajawal', color: Colors.textMain, backgroundColor: Colors.bgPage },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusOption: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statusOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusOptionText: { fontSize: 13, fontFamily: 'Tajawal', fontWeight: '700', color: Colors.textMain },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
});
