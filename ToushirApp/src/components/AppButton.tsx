// ============================================================
// AppButton — Primary/secondary button with loading state
// ============================================================
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../config/theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
  small?: boolean;
}

export function AppButton({
  title, onPress, variant = 'primary', loading, disabled, style, icon, small,
}: AppButtonProps) {
  const bg = {
    primary: Colors.primary,
    secondary: Colors.bgCard,
    danger: Colors.danger,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#fff',
    secondary: Colors.textMain,
    danger: '#fff',
    ghost: Colors.primary,
  }[variant];

  const border = {
    primary: Colors.primary,
    secondary: Colors.border,
    danger: Colors.danger,
    ghost: Colors.primary,
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        small && styles.small,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>}
          <Text style={[styles.text, { color: textColor }, small && styles.smallText]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 8,
  },
  small: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Tajawal',
  },
  smallText: {
    fontSize: 12,
  },
  icon: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
