// ============================================================
// CustomersScreen — Customer management with debt tracking
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { SearchBar } from '../components/SearchBar';
import { AppButton } from '../components/AppButton';
import { useStore, Customer } from '../store/useStore';
import { fsGetCollection, fsAddDoc, fsSetDoc, fsDeleteDoc } from '../config/firebase';
import { formatCurrency, generateId } from '../utils/helpers';
import { useWhatsApp } from '../hooks/useWhatsApp';

export function CustomersScreen() {
  const { customers, setCustomers, settings } = useStore();
  const { sendCustomMessage } = useWhatsApp();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({});

  const loadCustomers = async () => {
    const data = await fsGetCollection('customers');
    setCustomers(data as any);
  };

  useEffect(() => { loadCustomers(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadCustomers(); setRefreshing(false); };

  const filtered = useMemo(() =>
    customers.filter((c) =>
      c.name.includes(search) || (c.phone || '').includes(search)
    ), [customers, search]);

  const openAdd = () => { setForm({}); setEditMode(false); setModalVisible(true); };
  const openEdit = (c: Customer) => { setForm({ ...c }); setEditMode(true); setModalVisible(true); };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('خطأ', 'اسم الزبون مطلوب'); return; }
    setSaving(true);
    try {
      if (editMode && form.id) {
        await fsSetDoc('customers', form.id, form);
        setCustomers(customers.map((c) => c.id === form.id ? { ...c, ...form } as Customer : c));
      } else {
        const id = await fsAddDoc('customers', { ...form, balance: 0 });
        setCustomers([{ id: id!, ...form, balance: 0 } as Customer, ...customers]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = (c: Customer) => {
    if (!c.whatsapp && !c.phone) {
      Alert.alert('⚠️', 'لا يوجد رقم واتساب محفوظ');
      return;
    }
    const phone = c.whatsapp || c.phone || '';
    const msg = `السلام عليكم ${c.name}،

نذكركم بالرصيد المستحق: ${(c.balance || 0).toLocaleString('ar-DZ')} ${settings.currency}

شكرًا لتعاملكم معنا. نأمل تسوية المبلغ في أقرب وقت ممكن.`;
    sendCustomMessage(phone, msg);
  };

  const handleDelete = (c: Customer) => {
    Alert.alert('حذف الزبون', `هل تريد حذف ${c.name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await fsDeleteDoc('customers', c.id);
          setCustomers(customers.filter((x) => x.id !== c.id));
        },
      },
    ]);
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          {item.phone ? <Text style={styles.customerPhone}>📞 {item.phone}</Text> : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Text>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <Text>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.balanceBox, {
        backgroundColor: (item.balance || 0) > 0 ? Colors.dangerBg : Colors.successBg,
      }]}>
        <Text style={styles.balanceLabel}>الرصيد المستحق:</Text>
        <Text style={[styles.balanceValue, {
          color: (item.balance || 0) > 0 ? Colors.danger : Colors.success,
        }]}>
          {formatCurrency(item.balance || 0, settings.currency)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الهاتف..." />

      {/* Header with add button */}
      <View style={styles.headerRow}>
        <AppButton title="+ إضافة زبون" onPress={openAdd} small style={styles.addBtn} />
        <Text style={styles.countText}>{filtered.length} زبون</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد زبائن</Text>}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalCard, Shadow.lg]}>
              <Text style={styles.modalTitle}>{editMode ? '✏️ تعديل الزبون' : '➕ إضافة زبون جديد'}</Text>

              {[
                { key: 'name', label: '👤 الاسم *', placeholder: 'اسم الزبون', required: true },
                { key: 'phone', label: '📞 الهاتف', placeholder: '0551234567' },
                { key: 'whatsapp', label: '💬 واتساب', placeholder: '+213551234567' },
                { key: 'address', label: '📍 العنوان', placeholder: 'الحي، المدينة...' },
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
  addBtn: {},
  countText: { fontSize: 13, color: Colors.textMuted, fontFamily: 'Tajawal' },
  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.md },
  avatarText: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.primary },
  cardInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right' },
  customerPhone: { fontSize: 12, color: Colors.textLight, fontFamily: 'Tajawal', textAlign: 'right' },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  balanceBox: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: BorderRadius.sm, padding: Spacing.sm },
  balanceLabel: { fontSize: 12, color: Colors.textLight, fontFamily: 'Tajawal' },
  balanceValue: { fontSize: 14, fontWeight: '800', fontFamily: 'Tajawal' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: 40 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'center', marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 14, fontFamily: 'Tajawal', color: Colors.textMain, backgroundColor: Colors.bgPage },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
});
