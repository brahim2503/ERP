// ============================================================
// DashboardScreen — Main KPI dashboard
// Mirrors the dashboard view from the web app
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow, Typography } from '../config/theme';
import { StatCard } from '../components/StatCard';
import { useStore } from '../store/useStore';
import { fsGetCollection } from '../config/firebase';
import { formatCurrency, formatDate, percentChange } from '../utils/helpers';

const { width } = Dimensions.get('window');

type PeriodFilter = 'today' | 'week' | 'month' | 'year';

export function DashboardScreen() {
  const {
    products, customers, suppliers, salesInvoices, purchaseInvoices,
    setProducts, setCustomers, setSuppliers, setSalesInvoices, setPurchaseInvoices,
    settings,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('today');

  const loadData = async () => {
    try {
      const [prods, custs, supps, sales, purchases] = await Promise.all([
        fsGetCollection('products'),
        fsGetCollection('customers'),
        fsGetCollection('suppliers'),
        fsGetCollection('salesInvoices'),
        fsGetCollection('purchaseInvoices'),
      ]);
      setProducts(prods as any);
      setCustomers(custs as any);
      setSuppliers(supps as any);
      setSalesInvoices(sales as any);
      setPurchaseInvoices(purchases as any);
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ---- KPI calculations ----
  const totalRevenue = salesInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const totalPaid = salesInvoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
  const totalDebt = salesInvoices.reduce((s, inv) => s + (inv.remainingAmount || 0), 0);
  const lowStockCount = products.filter((p) => (p.quantity || 0) <= (p.minStock || 5)).length;
  const totalSupplierDebt = suppliers.reduce((s, sup) => s + (sup.totalDebt || 0), 0);

  // Recent sales
  const recentSales = [...salesInvoices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const periods: { key: PeriodFilter; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' },
    { key: 'year', label: 'السنة' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      {/* Period Filter */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main KPI Cards */}
      <View style={styles.cardGrid}>
        <StatCard
          title="إجمالي المبيعات"
          value={formatCurrency(totalRevenue, settings.currency)}
          icon="💰"
          color={Colors.primary}
        />
        <StatCard
          title="المبالغ المحصلة"
          value={formatCurrency(totalPaid, settings.currency)}
          icon="✅"
          color={Colors.success}
        />
      </View>
      <View style={styles.cardGrid}>
        <StatCard
          title="الديون المعلقة"
          value={formatCurrency(totalDebt, settings.currency)}
          icon="⚠️"
          color={Colors.warning}
        />
        <StatCard
          title="ديون الموردين"
          value={formatCurrency(totalSupplierDebt, settings.currency)}
          icon="🏭"
          color={Colors.danger}
        />
      </View>
      <View style={styles.cardGrid}>
        <StatCard
          title="عدد المنتجات"
          value={products.length.toString()}
          icon="📦"
          color={Colors.info}
        />
        <StatCard
          title="مخزون منخفض"
          value={lowStockCount.toString()}
          icon="🔴"
          color={lowStockCount > 0 ? Colors.danger : Colors.success}
          subtitle={lowStockCount > 0 ? 'يحتاج إعادة تموين' : 'المخزون كافٍ'}
        />
      </View>
      <View style={styles.cardGrid}>
        <StatCard
          title="عدد الزبائن"
          value={customers.length.toString()}
          icon="👥"
          color={Colors.primaryLight}
        />
        <StatCard
          title="عدد الموردين"
          value={suppliers.length.toString()}
          icon="🏭"
          color="#7c3aed"
        />
      </View>

      {/* Recent Sales */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>🧾 آخر المبيعات</Text>
        {recentSales.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد مبيعات بعد</Text>
        ) : (
          recentSales.map((inv) => (
            <View key={inv.id} style={styles.saleRow}>
              <View>
                <Text style={styles.invoiceNo}>{inv.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{formatDate(inv.date)}</Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.invoiceTotal}>{formatCurrency(inv.totalAmount, settings.currency)}</Text>
                <View style={[styles.payBadge, {
                  backgroundColor: inv.paymentType === 'cash' ? Colors.successBg : Colors.warningBg,
                }]}>
                  <Text style={[styles.payBadgeText, {
                    color: inv.paymentType === 'cash' ? Colors.success : Colors.warning,
                  }]}>
                    {inv.paymentType === 'cash' ? '💵 نقدي' : '🔄 دين'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: 12, fontFamily: 'Tajawal', color: Colors.textLight, fontWeight: '600' },
  periodTextActive: { color: '#fff', fontWeight: '800' },
  cardGrid: { flexDirection: 'row', marginBottom: Spacing.xs },
  section: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Tajawal',
    color: Colors.textMain,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Tajawal',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  invoiceNo: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain },
  invoiceDate: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: 2 },
  saleRight: { alignItems: 'flex-end', gap: 4 },
  invoiceTotal: { fontSize: 14, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.primary },
  payBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  payBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: 'Tajawal' },
});
