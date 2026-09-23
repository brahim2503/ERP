// ============================================================
// ReportsScreen — Financial reports
// ============================================================
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { StatCard } from '../components/StatCard';
import { AppButton } from '../components/AppButton';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/helpers';

type Period = 'today' | 'week' | 'month' | 'year';

function filterByPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  const now = new Date();
  const start = new Date();
  if (period === 'today') start.setHours(0, 0, 0, 0);
  else if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setDate(now.getDate() - 30);
  else start.setFullYear(now.getFullYear() - 1);
  return items.filter((i) => new Date(i.date) >= start);
}

export function ReportsScreen() {
  const { salesInvoices, purchaseInvoices, customers, suppliers, settings } = useStore();
  const [period, setPeriod] = useState<Period>('month');

  const filteredSales = useMemo(() => filterByPeriod(salesInvoices, period), [salesInvoices, period]);
  const filteredPurchases = useMemo(() => filterByPeriod(purchaseInvoices, period), [purchaseInvoices, period]);

  const totalRevenue = filteredSales.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalCollected = filteredSales.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const totalSalesDebt = filteredSales.reduce((s, i) => s + (i.remainingAmount || 0), 0);
  const totalPurchases = filteredPurchases.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const netProfit = totalCollected - totalPurchases;
  const totalCustomerDebt = customers.reduce((s, c) => s + (c.balance || 0), 0);
  const totalSupplierDebt = suppliers.reduce((s, s2) => s + (s2.totalDebt || 0), 0);

  const creditInvoices = filteredSales.filter((i) => i.paymentType !== 'cash');
  const cashInvoices = filteredSales.filter((i) => i.paymentType === 'cash');

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' },
    { key: 'year', label: 'السنة' },
  ];

  const exportToCsv = () => {
    // Simple CSV text for sharing
    const rows = [
      ['رقم الفاتورة', 'التاريخ', 'الزبون', 'الإجمالي', 'المدفوع', 'المتبقي', 'نوع الدفع'],
      ...filteredSales.map((i) => [
        i.invoiceNumber,
        formatDate(i.date),
        i.customerName || 'زبون عام',
        i.totalAmount,
        i.amountPaid,
        i.remainingAmount,
        i.paymentType,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    // In a real app, use expo-sharing to share this CSV
    Alert.alert('تصدير البيانات', `تم تجهيز ${filteredSales.length} فاتورة للتصدير`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Period Filter */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Grid */}
      <View style={styles.cardGrid}>
        <StatCard title="إجمالي المبيعات" value={formatCurrency(totalRevenue, settings.currency)} icon="💰" color={Colors.primary} />
        <StatCard title="المحصّل" value={formatCurrency(totalCollected, settings.currency)} icon="✅" color={Colors.success} />
      </View>
      <View style={styles.cardGrid}>
        <StatCard title="ديون الزبائن" value={formatCurrency(totalSalesDebt, settings.currency)} icon="⚠️" color={Colors.warning} />
        <StatCard title="صافي الربح" value={formatCurrency(netProfit, settings.currency)} icon="📈" color={netProfit >= 0 ? Colors.success : Colors.danger} />
      </View>
      <View style={styles.cardGrid}>
        <StatCard title="إجمالي المشتريات" value={formatCurrency(totalPurchases, settings.currency)} icon="🛒" color="#7c3aed" />
        <StatCard title="ديون الموردين" value={formatCurrency(totalSupplierDebt, settings.currency)} icon="🏭" color={Colors.danger} />
      </View>

      {/* Invoice breakdown */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>📊 توزيع المبيعات</Text>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownValue}>{cashInvoices.length}</Text>
            <Text style={styles.breakdownLabel}>مبيعات نقدية</Text>
          </View>
          <View style={[styles.breakdownBox, { backgroundColor: Colors.warningBg }]}>
            <Text style={[styles.breakdownValue, { color: Colors.warning }]}>{creditInvoices.length}</Text>
            <Text style={styles.breakdownLabel}>مبيعات بالدين</Text>
          </View>
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownValue}>{filteredSales.length}</Text>
            <Text style={styles.breakdownLabel}>إجمالي الفواتير</Text>
          </View>
        </View>
      </View>

      {/* Top customers by debt */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>👥 أكثر الزبائن ديناً</Text>
        {customers
          .filter((c) => (c.balance || 0) > 0)
          .sort((a, b) => (b.balance || 0) - (a.balance || 0))
          .slice(0, 5)
          .map((c) => (
            <View key={c.id} style={styles.debtRow}>
              <Text style={[styles.debtAmount, { color: Colors.danger }]}>{formatCurrency(c.balance || 0, settings.currency)}</Text>
              <Text style={styles.debtName}>{c.name}</Text>
            </View>
          ))}
        {customers.filter((c) => (c.balance || 0) > 0).length === 0 && (
          <Text style={styles.emptyText}>✅ لا توجد ديون مستحقة</Text>
        )}
      </View>

      {/* Export button */}
      <AppButton
        title="📊 تصدير التقرير (CSV)"
        onPress={exportToCsv}
        variant="secondary"
        icon="📊"
        style={{ marginTop: Spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg, ...Shadow.sm },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm, alignItems: 'center' },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: 12, fontFamily: 'Tajawal', color: Colors.textLight, fontWeight: '600' },
  periodTextActive: { color: '#fff', fontWeight: '800' },
  cardGrid: { flexDirection: 'row', marginBottom: Spacing.xs },
  section: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: Spacing.md },
  breakdownRow: { flexDirection: 'row', gap: 8 },
  breakdownBox: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.successBg, borderRadius: BorderRadius.md },
  breakdownValue: { fontSize: 22, fontWeight: '900', fontFamily: 'Tajawal', color: Colors.success },
  breakdownLabel: { fontSize: 11, color: Colors.textLight, fontFamily: 'Tajawal', marginTop: 4, textAlign: 'center' },
  debtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  debtName: { fontSize: 14, fontFamily: 'Tajawal', color: Colors.textMain, fontWeight: '600' },
  debtAmount: { fontSize: 14, fontWeight: '800', fontFamily: 'Tajawal' },
  emptyText: { textAlign: 'center', color: Colors.success, fontFamily: 'Tajawal', paddingVertical: Spacing.md },
});
