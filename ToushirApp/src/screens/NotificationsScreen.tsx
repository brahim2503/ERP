// ============================================================
// NotificationsScreen — Smart alerts panel
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { useNotifications, AppNotification } from '../hooks/useNotifications';
import { useStore } from '../store/useStore';
import { useWhatsApp } from '../hooks/useWhatsApp';

const SEVERITY_COLORS = {
  danger: { bg: Colors.dangerBg, border: Colors.danger, text: Colors.danger },
  warning: { bg: Colors.warningBg, border: Colors.warning, text: Colors.warning },
  info: { bg: Colors.infoBg, border: Colors.info, text: Colors.info },
};

export function NotificationsScreen() {
  const notifications = useNotifications();
  const { customers } = useStore();
  const { sendCustomMessage } = useWhatsApp();

  const handleWhatsApp = (notif: AppNotification) => {
    if (notif.type !== 'customer_debt') return;
    const customerId = notif.id.replace('cust_debt_', '');
    const customer = customers.find((c) => c.id === customerId);
    if (!customer?.whatsapp && !customer?.phone) return;
    const phone = customer.whatsapp || customer.phone || '';
    const msg = `السلام عليكم ${customer.name}،\n\nنذكركم بالرصيد المستحق: ${(customer.balance || 0).toLocaleString('ar-DZ')} دج\n\nشكرًا لتعاملكم معنا.`;
    sendCustomMessage(phone, msg);
  };

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const colors = SEVERITY_COLORS[item.severity];
    const canWhatsApp = item.type === 'customer_debt';

    return (
      <View style={[styles.card, { backgroundColor: colors.bg, borderLeftColor: colors.border }, Shadow.sm]}>
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{item.icon}</Text>
          <View style={styles.cardContent}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
          {canWhatsApp && (
            <TouchableOpacity onPress={() => handleWhatsApp(item)} style={styles.waBtn}>
              <Text style={styles.waBtnText}>💬</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>لا توجد تنبيهات</Text>
        <Text style={styles.emptySubtitle}>المخزون كافٍ ولا توجد ديون مستحقة</Text>
      </View>
    );
  }

  // Group by type
  const lowStock = notifications.filter((n) => n.type === 'low_stock');
  const debts = notifications.filter((n) => n.type === 'customer_debt' || n.type === 'supplier_debt');

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryBadge, { backgroundColor: Colors.dangerBg }]}>
                <Text style={[styles.summaryCount, { color: Colors.danger }]}>{lowStock.length}</Text>
                <Text style={styles.summaryLabel}>مخزون منخفض</Text>
              </View>
              <View style={[styles.summaryBadge, { backgroundColor: Colors.warningBg }]}>
                <Text style={[styles.summaryCount, { color: Colors.warning }]}>{debts.length}</Text>
                <Text style={styles.summaryLabel}>ديون مستحقة</Text>
              </View>
              <View style={[styles.summaryBadge, { backgroundColor: Colors.primaryBg }]}>
                <Text style={[styles.summaryCount, { color: Colors.primary }]}>{notifications.length}</Text>
                <Text style={styles.summaryLabel}>إجمالي التنبيهات</Text>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage },
  header: { marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryBadge: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md },
  summaryCount: { fontSize: 24, fontWeight: '900', fontFamily: 'Tajawal' },
  summaryLabel: { fontSize: 11, color: Colors.textLight, fontFamily: 'Tajawal', textAlign: 'center', marginTop: 2 },
  card: {
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  icon: { fontSize: 22, marginTop: 2 },
  cardContent: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', fontFamily: 'Tajawal', textAlign: 'right', marginBottom: 3 },
  body: { fontSize: 12, color: Colors.textLight, fontFamily: 'Tajawal', textAlign: 'right', lineHeight: 18 },
  waBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#25d36620',
    alignItems: 'center', justifyContent: 'center',
  },
  waBtnText: { fontSize: 18 },
  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.success, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'center' },
});
