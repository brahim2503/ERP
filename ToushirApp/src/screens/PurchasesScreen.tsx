// ============================================================
// PurchasesScreen — Purchase invoices management
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { SearchBar } from '../components/SearchBar';
import { AppButton } from '../components/AppButton';
import { useStore, PurchaseInvoice, InvoiceItem } from '../store/useStore';
import { fsGetCollection, fsAddDoc, fsSetDoc } from '../config/firebase';
import { formatCurrency, formatDate, generateInvoiceNumber } from '../utils/helpers';

export function PurchasesScreen() {
  const { purchaseInvoices, setPurchaseInvoices, suppliers, products, settings } = useStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    supplierId: string;
    items: { productId: string; productName: string; qty: string; unitPrice: string }[];
    amountPaid: string;
    notes: string;
  }>({ supplierId: '', items: [], amountPaid: '0', notes: '' });

  const loadPurchases = async () => {
    const data = await fsGetCollection('purchaseInvoices');
    setPurchaseInvoices(data as any);
  };

  useEffect(() => { loadPurchases(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadPurchases(); setRefreshing(false); };

  const filtered = useMemo(() =>
    purchaseInvoices.filter((p) =>
      p.supplierName?.includes(search) || p.invoiceNumber?.includes(search)
    ), [purchaseInvoices, search]);

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: '', productName: '', qty: '1', unitPrice: '0' }],
    }));

  const updateItem = (idx: number, key: string, val: string) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [key]: val } : item),
    }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const calcTotal = () =>
    form.items.reduce((s, i) => s + parseFloat(i.qty || '0') * parseFloat(i.unitPrice || '0'), 0);

  const handleSave = async () => {
    if (!form.supplierId) { Alert.alert('خطأ', 'اختر المورد'); return; }
    if (form.items.length === 0) { Alert.alert('خطأ', 'أضف منتجاً واحداً على الأقل'); return; }
    setSaving(true);
    try {
      const supplier = suppliers.find((s) => s.id === form.supplierId);
      const total = calcTotal();
      const paid = parseFloat(form.amountPaid || '0');
      const invoice = {
        invoiceNumber: generateInvoiceNumber('PUR'),
        supplierId: form.supplierId,
        supplierName: supplier?.name || '',
        items: form.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: parseFloat(i.qty),
          unitPrice: parseFloat(i.unitPrice),
          total: parseFloat(i.qty) * parseFloat(i.unitPrice),
        })),
        totalAmount: total,
        amountPaid: paid,
        remainingAmount: Math.max(0, total - paid),
        status: 'confirmed' as const,
        date: new Date().toISOString(),
        notes: form.notes,
      };
      const id = await fsAddDoc('purchaseInvoices', invoice);
      setPurchaseInvoices([{ id: id!, ...invoice }, ...purchaseInvoices]);
      setModalVisible(false);
      setForm({ supplierId: '', items: [], amountPaid: '0', notes: '' });
      Alert.alert('✅ تم الحفظ', `فاتورة مشتريات ${invoice.invoiceNumber} محفوظة`);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusColor = { draft: Colors.textMuted, confirmed: Colors.success, cancelled: Colors.danger };
  const statusLabel = { draft: 'مسودة', confirmed: '✅ مؤكدة', cancelled: '❌ ملغاة' };

  const renderInvoice = ({ item }: { item: PurchaseInvoice }) => (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.cardTop}>
        <View style={[styles.statusBadge, { backgroundColor: (statusColor[item.status] || Colors.textMuted) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor[item.status] || Colors.textMuted }]}>
            {statusLabel[item.status] || item.status}
          </Text>
        </View>
        <View>
          <Text style={styles.invNumber}>{item.invoiceNumber}</Text>
          <Text style={styles.invDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <Text style={styles.supplierName}>🏭 {item.supplierName}</Text>
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>الإجمالي</Text>
          <Text style={[styles.amountValue, { color: Colors.primary }]}>{formatCurrency(item.totalAmount, settings.currency)}</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>المدفوع</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>{formatCurrency(item.amountPaid, settings.currency)}</Text>
        </View>
        <View style={[styles.amountBox, { backgroundColor: item.remainingAmount > 0 ? Colors.dangerBg : Colors.successBg }]}>
          <Text style={styles.amountLabel}>المتبقي</Text>
          <Text style={[styles.amountValue, { color: item.remainingAmount > 0 ? Colors.danger : Colors.success }]}>
            {formatCurrency(item.remainingAmount, settings.currency)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالمورد أو رقم الفاتورة..." />

      <View style={styles.headerRow}>
        <AppButton title="+ فاتورة مشتريات" onPress={() => { setForm({ supplierId: '', items: [], amountPaid: '0', notes: '' }); setModalVisible(true); }} small />
        <Text style={styles.countText}>{filtered.length} فاتورة</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد فواتير مشتريات</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalCard, Shadow.lg]}>
              <Text style={styles.modalTitle}>➕ فاتورة مشتريات جديدة</Text>

              {/* Supplier selector */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>🏭 اختر المورد *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {suppliers.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.supplierChip, form.supplierId === s.id && styles.supplierChipActive]}
                        onPress={() => setForm((f) => ({ ...f, supplierId: s.id }))}
                      >
                        <Text style={[styles.supplierChipText, form.supplierId === s.id && { color: '#fff' }]}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Items */}
              <View style={styles.field}>
                <View style={styles.itemsHeader}>
                  <AppButton title="+ إضافة منتج" onPress={addItem} small variant="ghost" />
                  <Text style={styles.fieldLabel}>📦 المنتجات</Text>
                </View>
                {form.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                      <Text style={{ color: Colors.danger }}>✕</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, { flex: 2 }]}
                      value={item.productName}
                      onChangeText={(v) => updateItem(idx, 'productName', v)}
                      placeholder="اسم المنتج"
                      placeholderTextColor={Colors.textMuted}
                      textAlign="right"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={item.qty}
                      onChangeText={(v) => updateItem(idx, 'qty', v)}
                      placeholder="الكمية"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={item.unitPrice}
                      onChangeText={(v) => updateItem(idx, 'unitPrice', v)}
                      placeholder="السعر"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                ))}
              </View>

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalValue}>{formatCurrency(calcTotal(), settings.currency)}</Text>
                <Text style={styles.totalLabel}>إجمالي الفاتورة:</Text>
              </View>

              {/* Amount paid */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>💵 المبلغ المدفوع</Text>
                <TextInput
                  style={styles.input}
                  value={form.amountPaid}
                  onChangeText={(v) => setForm((f) => ({ ...f, amountPaid: v }))}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              <View style={styles.modalBtns}>
                <AppButton title="إلغاء" onPress={() => setModalVisible(false)} variant="secondary" style={{ flex: 1 }} />
                <AppButton title="✅ حفظ الفاتورة" onPress={handleSave} loading={saving} style={{ flex: 2 }} />
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: 12, fontFamily: 'Tajawal', fontWeight: '700' },
  invNumber: { fontSize: 14, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right' },
  invDate: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'right' },
  supplierName: { fontSize: 14, fontFamily: 'Tajawal', color: Colors.textLight, textAlign: 'right', marginBottom: Spacing.sm },
  amountRow: { flexDirection: 'row', gap: 6 },
  amountBox: { flex: 1, alignItems: 'center', padding: Spacing.sm, backgroundColor: Colors.bgPage, borderRadius: BorderRadius.sm },
  amountLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: 'Tajawal', marginBottom: 2 },
  amountValue: { fontSize: 12, fontWeight: '800', fontFamily: 'Tajawal' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'center', marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: 13, fontFamily: 'Tajawal', color: Colors.textMain, backgroundColor: Colors.bgPage },
  supplierChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgPage },
  supplierChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  supplierChipText: { fontSize: 13, fontFamily: 'Tajawal', color: Colors.textMain, fontWeight: '700' },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm, alignItems: 'center' },
  removeBtn: { padding: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryBg, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  totalLabel: { fontSize: 14, fontFamily: 'Tajawal', color: Colors.textLight },
  totalValue: { fontSize: 18, fontWeight: '900', fontFamily: 'Tajawal', color: Colors.primary },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
});
