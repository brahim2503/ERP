// ============================================================
// SearchBar — Reusable Arabic RTL search input
// ============================================================
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../config/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'بحث...', onClear }: SearchBarProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        textAlign="right"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => { onChangeText(''); onClear?.(); }}
          style={styles.clearBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 46,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    fontSize: 16,
    marginLeft: Spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: 'Tajawal',
    fontSize: 14,
    color: Colors.textMain,
    paddingHorizontal: Spacing.sm,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
