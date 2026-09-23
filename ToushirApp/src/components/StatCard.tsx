// ============================================================
// StatCard — Dashboard statistics card
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../config/theme';

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color?: string;
  change?: number; // percentage change
  subtitle?: string;
}

export function StatCard({ title, value, icon, color = Colors.primary, change, subtitle }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <View style={[styles.card, Shadow.md]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Text style={[styles.icon, { color }]}>{icon}</Text>
        </View>
        {change !== undefined && (
          <View style={[styles.badge, { backgroundColor: isPositive ? Colors.successBg : Colors.dangerBg }]}>
            <Text style={[styles.badgeText, { color: isPositive ? Colors.success : Colors.danger }]}>
              {isPositive ? '▲' : '▼'} {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flex: 1,
    minWidth: 150,
    margin: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Tajawal',
    marginBottom: 2,
    textAlign: 'right',
  },
  title: {
    fontSize: 13,
    color: Colors.textLight,
    fontFamily: 'Tajawal',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Tajawal',
    marginTop: 2,
    textAlign: 'right',
  },
});
