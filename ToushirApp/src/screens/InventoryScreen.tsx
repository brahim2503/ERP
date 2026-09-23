// ============================================================
// InventoryScreen — Products & stock management
// ============================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { SearchBar } from '../components/SearchBar';
import { AppButton } from '../components/AppButton';
import { useStore, Product } from '../store/useStore';
import { fsGetCollection, fsAddDoc, fsSetDoc, fsDeleteDoc } from '../config/firebase';
import { formatCurrency } from '../utils/helpers';

export function InventoryScreen() {
  const { products, setProducts, settings } = useStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterLow, setFilterLow] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({});

  const loadProducts = async () => {
    const data = await fsGetCollection('products');
    setProducts(data as any);
  };

  useEffect(() => { loadProducts(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let list = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || '').includes(search) ||
      (p.category || '').includes(search)
    );
    if (filterLow) list = list.filter((p) => p.quantity <= (p.minStock || 5));
    return list;
  }, [products, search, filterLow]);

  const openAdd = () => { setForm({ unit: 'قطعة', minStock: 5 }); setEditMode(false); setModalVisible(true); };
  const openEdit = (p: Product) => { setForm({ ...p }); setEditMode(true); setModalVisible(true); };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('خطأ', 'اسم المنتج مطلوب'); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        salePrice: parseFloat(String(form.salePrice || 0)),
        costPrice: parseFloat(String(form.costPrice || 0)),
        quantity: parseInt(String(form.quantity || 0)),
        minStock: parseInt(String(form.minStock || 5)),
      };
      if (editMode && form.id) {
        await fsSetDoc('products', form.id, data);
        setProducts(products.map((p) => p.id === form.id ? { ...p, ...data } as Product : p));
      } else {
        const id = await fsAddDoc('products', data);
        setProducts([{ id: id!, ...data } as Product, ...products]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Product) => {
    Alert.alert('حذف المنتج', `هل تريد حذف ${p.name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await fsDeleteDoc('products', p.id);
          setProducts(products.filter((x) => x.id !== p.id));
        },
      },
    ]);
  };

  const isLowStock = (p: Product) => p.quantity <= (p.minStock || 5);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={[styles.card, Shadow.sm, isLowStock(item) && styles.lowStockCard]}>
      <View style={styles.cardTop}>
        <View style={styles.cardMeta}>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
          {isLowStock(item) && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>⚠️ مخزون منخفض</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}><Text>✏️</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}><Text>🗑️</Text></TouchableOpacity>
        </View>
      </View>

      <Text style={styles.productName}>{item.name}</Text>
      {item.barcode && <Text style={styles.barcode}>🔖 {item.barcode}</Text>}

      <View style={styles.priceRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>سعر البيع</Text>
          <Text style={[styles.priceValue, { color: Colors.primary }]}>{formatCurrency(item.salePrice, settings.currency)}</Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>سعر التكلفة</Text>
          <Text style={[styles.priceValue, { color: Colors.textLight }]}>{formatCurrency(item.costPrice, settings.currency)}</Text>
        </View>
        <View style={[styles.priceBox, styles.stockBox, {
          backgroundColor: isLowStock(item) ? Colors.dangerBg : Colors.successBg,
        }]}>
          <Text style={styles.priceLabel}>المخزون</Text>
          <Text style={[styles.priceValue, { color: isLowStock(item) ? Colors.danger : Colors.success }]}>
            {item.quantity} {item.unit || 'قطعة'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الباركود..." />

      <View style={styles.headerRow}>
        <AppButton title="+ إضافة منتج" onPress={openAdd} small />
        <TouchableOpacity
          style={[styles.filterBtn, filterLow && styles.filterBtnActive]}
          onPress={() => setFilterLow(!filterLow)}
        >
          <Text style={[styles.filterBtnText, filterLow && { color: '#fff' }]}>⚠️ مخزون منخفض</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>{filtered.length} منتج</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>لا توجد منتجات</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalCard, Shadow.lg]}>
              <Text style={styles.modalTitle}>{editMode ? '✏️ تعديل المنتج' : '➕ إضافة منتج جديد'}</Text>

              {[
                { key: 'name', label: '📦 اسم المنتج *', placeholder: 'اسم المنتج' },
                { key: 'barcode', label: '🔖 الباركود', placeholder: '6xxxxxx...' },
                { key: 'category', label: '🏷️ الفئة', placeholder: 'مواد غذائية، مشروبات...' },
                { key: 'unit', label: '📏 الوحدة', placeholder: 'قطعة، كيلو، لتر...' },
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

              {[
                { key: 'salePrice', label: '💰 سعر البيع', placeholder: '0' },
                { key: 'costPrice', label: '🏷️ سعر التكلفة', placeholder: '0' },
                { key: 'quantity', label: '📊 الكمية الحالية', placeholder: '0' },
                { key: 'minStock', label: '⚠️ الحد الأدنى للمخزون', placeholder: '5' },
              ].map(({ key, label, placeholder }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={String((form as any)[key] ?? '')}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    textAlign="center"
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  countText: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Tajawal', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.warning },
  filterBtnActive: { backgroundColor: Colors.warning },
  filterBtnText: { fontSize: 12, fontFamily: 'Tajawal', color: Colors.warning, fontWeight: '700' },
  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  lowStockCard: { borderLeftWidth: 3, borderLeftColor: Colors.danger },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontSize: 10, color: Colors.primary, fontFamily: 'Tajawal', fontWeight: '700' },
  lowBadge: { backgroundColor: Colors.dangerBg, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  lowBadgeText: { fontSize: 10, color: Colors.danger, fontFamily: 'Tajawal', fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  productName: { fontSize: 15, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 4 },
  barcode: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'right', marginBottom: 8 },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceBox: { flex: 1, alignItems: 'center', padding: Spacing.sm, backgroundColor: Colors.bgPage, borderRadius: BorderRadius.sm },
  stockBox: { borderRadius: BorderRadius.sm },
  priceLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: 'Tajawal', marginBottom: 2 },
  priceValue: { fontSize: 13, fontWeight: '800', fontFamily: 'Tajawal' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'center', marginBottom: Spacing.lg },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 14, fontFamily: 'Tajawal', color: Colors.textMain, backgroundColor: Colors.bgPage },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: Spacing.md },
});
