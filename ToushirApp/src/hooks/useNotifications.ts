// ============================================================
// useNotifications — Smart in-app alerts
// Mirrors the notifications system from app.js
// ============================================================
import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export interface AppNotification {
  id: string;
  type: 'low_stock' | 'customer_debt' | 'supplier_debt' | 'info';
  title: string;
  body: string;
  icon: string;
  severity: 'danger' | 'warning' | 'info';
  date: Date;
}

export function useNotifications(): AppNotification[] {
  const { products, customers, suppliers } = useStore();

  const notifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];
    const now = new Date();

    // 1. Low stock alerts
    products
      .filter((p) => p.quantity <= (p.minStock ?? 5))
      .forEach((p) => {
        list.push({
          id: `low_stock_${p.id}`,
          type: 'low_stock',
          icon: '📦',
          severity: p.quantity === 0 ? 'danger' : 'warning',
          title: p.quantity === 0 ? 'نفاد المخزون!' : 'مخزون منخفض',
          body: `${p.name} — المتبقي: ${p.quantity} ${p.unit || 'قطعة'} (الحد الأدنى: ${p.minStock ?? 5})`,
          date: now,
        });
      });

    // 2. Customer debt alerts (balance > 0)
    customers
      .filter((c) => (c.balance || 0) > 0)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 5) // top 5 debtors
      .forEach((c) => {
        list.push({
          id: `cust_debt_${c.id}`,
          type: 'customer_debt',
          icon: '👤',
          severity: (c.balance || 0) > 10000 ? 'danger' : 'warning',
          title: 'دين زبون',
          body: `${c.name} — الرصيد المستحق: ${(c.balance || 0).toLocaleString('ar-DZ')} دج`,
          date: now,
        });
      });

    // 3. Supplier debt alerts
    suppliers
      .filter((s) => (s.totalDebt || 0) > 0)
      .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
      .slice(0, 3)
      .forEach((s) => {
        list.push({
          id: `supp_debt_${s.id}`,
          type: 'supplier_debt',
          icon: '🏭',
          severity: 'warning',
          title: 'دين للمورد',
          body: `${s.name} — المستحق: ${(s.totalDebt || 0).toLocaleString('ar-DZ')} دج`,
          date: now,
        });
      });

    return list;
  }, [products, customers, suppliers]);

  return notifications;
}
