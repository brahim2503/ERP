// ============================================================
// PosScreen — Point of Sale (نقطة البيع)
// Fast product scanning and cart management
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { SearchBar } from '../components/SearchBar';
import { AppButton } from '../components/AppButton';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useStore, Product } from '../store/useStore';
import { formatCurrency, generateInvoiceNumber } from '../utils/helpers';
import { fsAddDoc } from '../config/firebase';

export function PosScreen() {
  const {
    products, cart, addToCart, removeFromCart, updateCartQty, clearCart,
    getCartTotal, formatCurrency: fmtCurrency, settings, customers,
    salesInvoices, setSalesInvoices,
  } = useStore();
  const { sendCreditInvoice } = useWhatsApp();

  const [search, setSearch] = useState('');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const cartTotal = getCartTotal();
  const paid = parseFloat(amountPaid) || 0;
  const remaining = Math.max(0, cartTotal - paid);
  const paymentType = paid >= cartTotal ? 'cash' : paid > 0 ? 'partial' : 'credit';

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('السلة فارغة', 'أضف منتجات إلى السلة أولاً');
      return;
    }
    setSaving(true);
    try {
      const invoice = {
        invoiceNumber: generateInvoiceNumber('INV'),
        customerId: selectedCustomer || null,
        customerName: customers.find((c) => c.id === selectedCustomer)?.name || 'زبون عام',
        items: cart.map((c) => ({
          productId: c.product.id,
          productName: c.product.name,
          quantity: c.qty,
          unitPrice: c.product.salePrice,
          total: c.product.salePrice * c.qty,
        })),
        totalAmount: cartTotal,
        amountPaid: paid,
        remainingAmount: remaining,
        paymentType,
        date: new Date().toISOString(),
        whatsappSent: false,
      };

      const id = await fsAddDoc('salesInvoices', invoice);
      const saved = { id: id!, ...invoice } as any;
      setSalesInvoices([saved, ...salesInvoices]);
      clearCart();
      setCheckoutVisible(false);
      setAmountPaid('');
      setSelectedCustomer('');

      // Auto-send WhatsApp for credit/partial sales
      if (paymentType !== 'cash' && selectedCustomer) {
        Alert.alert(
          '✅ تم الحفظ',
          `تم حفظ الفاتورة ${invoice.invoiceNumber}\n\nهل تريد إرسال إشعار واتساب للزبون؟`,
          [
            { text: 'لا', style: 'cancel' },
            {
              text: '💬 إرسال واتساب',
              onPress: () => sendCreditInvoice(saved),
            },
          ]
        );
      } else {
        Alert.alert('✅ تم الحفظ', `تم حفظ الفاتورة ${invoice.invoiceNumber} بنجاح!`);
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'فشل حفظ الفاتورة: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productCard, Shadow.sm]}
      onPress={() => addToCart(item)}
      activeOpacity={0.8}
    >
      <View style={styles.productCategoryBadge}>
        <Text style={styles.productCategoryText}>{item.category || 'عام'}</Text>
      </View>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.productBottom}>
        <Text style={styles.productPrice}>{fmtCurrency(item.salePrice)}</Text>
        <View style={[styles.stockBadge, {
          backgroundColor: item.quantity > (item.minStock || 5) ? Colors.successBg : Colors.dangerBg,
        }]}>
          <Text style={[styles.stockText, {
            color: item.quantity > (item.minStock || 5) ? Colors.success : Colors.danger,
          }]}>
            {item.quantity} {item.unit || 'قطعة'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Left: Products grid */}
      <View style={styles.productsPanel}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الباركود..." />
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: Spacing.md }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا توجد منتجات</Text>
          }
        />
      </View>

      {/* Right: Cart */}
      <View style={styles.cartPanel}>
        <Text style={styles.cartTitle}>🛒 السلة ({cart.length})</Text>

        <ScrollView style={styles.cartList}>
          {cart.length === 0 ? (
            <Text style={styles.cartEmptyText}>اضغط على المنتج لإضافته</Text>
          ) : (
            cart.map((item) => (
              <View key={item.product.id} style={styles.cartItem}>
                <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>{fmtCurrency(item.product.salePrice)}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQty(item.product.id, item.qty - 1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.qty}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQty(item.product.id, item.qty + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>{fmtCurrency(item.product.salePrice * item.qty)}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Cart total */}
        <View style={styles.cartFooter}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الإجمالي:</Text>
            <Text style={styles.totalAmount}>{fmtCurrency(cartTotal)}</Text>
          </View>
          <View style={styles.footerBtns}>
            <AppButton
              title="🗑️ إفراغ"
              onPress={clearCart}
              variant="ghost"
              small
              style={{ flex: 1 }}
            />
            <AppButton
              title="💳 الدفع"
              onPress={() => setCheckoutVisible(true)}
              small
              style={{ flex: 2 }}
              disabled={cart.length === 0}
            />
          </View>
        </View>
      </View>

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalCard, Shadow.lg]}>
              <Text style={styles.modalTitle}>💳 إتمام عملية البيع</Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>{fmtCurrency(cartTotal)}</Text>
                  <Text style={styles.summaryLabel}>إجمالي الفاتورة</Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>💵 المبلغ المدفوع:</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                  placeholder={`0 ${settings.currency}`}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              {/* Payment type indicator */}
              <View style={[styles.payTypeBox, {
                backgroundColor: paymentType === 'cash' ? Colors.successBg : Colors.warningBg,
              }]}>
                <Text style={[styles.payTypeText, {
                  color: paymentType === 'cash' ? Colors.success : Colors.warning,
                }]}>
                  {paymentType === 'cash' ? '✅ دفع كامل (نقدي)' : `⚠️ دين: ${fmtCurrency(remaining)}`}
                </Text>
              </View>

              <View style={styles.modalBtns}>
                <AppButton title="إلغاء" onPress={() => setCheckoutVisible(false)} variant="secondary" style={{ flex: 1 }} />
                <AppButton title="✅ حفظ الفاتورة" onPress={handleCheckout} loading={saving} style={{ flex: 2 }} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: Colors.bgPage },
  productsPanel: { flex: 1.4, paddingTop: Spacing.md },
  cartPanel: {
    width: 280,
    backgroundColor: Colors.bgCard,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    flexDirection: 'column',
  },
  productRow: { justifyContent: 'space-between', marginHorizontal: 4 },
  productCard: {
    flex: 0.48,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  productCategoryBadge: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  productCategoryText: { fontSize: 10, color: Colors.primary, fontFamily: 'Tajawal', fontWeight: '700' },
  productName: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 8 },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 14, fontWeight: '900', fontFamily: 'Tajawal', color: Colors.primary },
  stockBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full },
  stockText: { fontSize: 10, fontWeight: '700', fontFamily: 'Tajawal' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: 40 },
  cartTitle: { fontSize: 15, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, textAlign: 'right' },
  cartList: { flex: 1, padding: Spacing.sm },
  cartEmptyText: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'center', marginTop: 30 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 6 },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 12, color: Colors.danger },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 12, fontFamily: 'Tajawal', color: Colors.textMain, fontWeight: '600', textAlign: 'right' },
  cartItemPrice: { fontSize: 10, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'right' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bgPage, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  qtyBtnText: { fontSize: 16, color: Colors.primary, fontWeight: '700', lineHeight: 20 },
  qtyValue: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 12, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.primary, minWidth: 50, textAlign: 'right' },
  cartFooter: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  totalLabel: { fontSize: 15, fontFamily: 'Tajawal', color: Colors.textLight },
  totalAmount: { fontSize: 18, fontWeight: '900', fontFamily: 'Tajawal', color: Colors.primary },
  footerBtns: { flexDirection: 'row', gap: 8 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'center', marginBottom: Spacing.lg },
  summaryBox: { backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontFamily: 'Tajawal', color: Colors.textLight },
  summaryValue: { fontSize: 18, fontWeight: '900', fontFamily: 'Tajawal', color: Colors.primary },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 6 },
  amountInput: { borderWidth: 2, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 24, fontFamily: 'Tajawal', fontWeight: '800', color: Colors.primary, backgroundColor: Colors.primaryBg },
  payTypeBox: { borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, alignItems: 'center' },
  payTypeText: { fontSize: 15, fontWeight: '700', fontFamily: 'Tajawal' },
  modalBtns: { flexDirection: 'row', gap: 10 },
});
