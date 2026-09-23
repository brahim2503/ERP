// ============================================================
// SettingsScreen — Store configuration
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, Switch,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { AppButton } from '../components/AppButton';
import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';

export function SettingsScreen() {
  const { settings, setSettings, persistSettings, darkMode, toggleDarkMode, currentUser } = useStore();
  const { signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleSave = async () => {
    setSaving(true);
    setSettings(localSettings);
    await persistSettings();
    setSaving(false);
    Alert.alert('✅ تم الحفظ', 'تم حفظ الإعدادات بنجاح');
  };

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: signOut },
    ]);
  };

  const update = (key: string, val: string) =>
    setLocalSettings((s) => ({ ...s, [key]: val }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Store Info */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>🏪 معلومات المتجر</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>اسم المتجر</Text>
          <TextInput
            style={styles.input}
            value={localSettings.storeName}
            onChangeText={(v) => update('storeName', v)}
            placeholder="توشير ERP"
            placeholderTextColor={Colors.textMuted}
            textAlign="right"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>رمز العملة</Text>
          <TextInput
            style={styles.input}
            value={localSettings.currency}
            onChangeText={(v) => update('currency', v)}
            placeholder="دج"
            placeholderTextColor={Colors.textMuted}
            textAlign="center"
            maxLength={5}
          />
        </View>
      </View>

      {/* WhatsApp Settings */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>💬 إعدادات واتساب</Text>
        <Text style={styles.sectionHint}>مطلوب لإرسال الفواتير الآلية عبر WhatsApp Business API</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>مزود الخدمة</Text>
          <TextInput
            style={styles.input}
            value={localSettings.whatsappProvider}
            onChangeText={(v) => update('whatsappProvider', v)}
            placeholder="meta"
            placeholderTextColor={Colors.textMuted}
            textAlign="left"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Phone ID</Text>
          <TextInput
            style={styles.input}
            value={localSettings.whatsappPhoneId}
            onChangeText={(v) => update('whatsappPhoneId', v)}
            placeholder="109847293847120"
            placeholderTextColor={Colors.textMuted}
            textAlign="left"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Access Token</Text>
          <TextInput
            style={styles.input}
            value={localSettings.whatsappToken}
            onChangeText={(v) => update('whatsappToken', v)}
            placeholder="EAA..."
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            textAlign="left"
          />
        </View>
      </View>

      {/* Message Template */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>📄 قالب رسالة الدين</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={localSettings.templateText}
          onChangeText={(v) => update('templateText', v)}
          multiline
          numberOfLines={10}
          textAlign="right"
          textAlignVertical="top"
          placeholder="قالب الرسالة..."
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.templateHint}>
          المتغيرات المتاحة: {'{{customerName}}'} {'{{invoiceNumber}}'} {'{{totalAmount}}'} {'{{amountPaid}}'} {'{{remainingAmount}}'} {'{{productList}}'}
        </Text>
      </View>

      {/* UI Settings */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>🎨 واجهة المستخدم</Text>
        <View style={styles.switchRow}>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#fff"
          />
          <Text style={styles.switchLabel}>الوضع الليلي (Dark Mode)</Text>
        </View>
      </View>

      {/* Account */}
      <View style={[styles.section, Shadow.sm]}>
        <Text style={styles.sectionTitle}>👤 الحساب</Text>
        {currentUser && (
          <Text style={styles.emailText}>📧 {currentUser.email}</Text>
        )}
        <AppButton
          title="🔐 تسجيل الخروج"
          onPress={handleSignOut}
          variant="danger"
          style={{ marginTop: Spacing.md }}
        />
      </View>

      {/* Save */}
      <AppButton
        title="💾 حفظ الإعدادات"
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPage },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  section: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: Spacing.sm },
  sectionHint: { fontSize: 12, color: Colors.textMuted, fontFamily: 'Tajawal', textAlign: 'right', marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: Colors.textMain, textAlign: 'right', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 14, fontFamily: 'Tajawal', color: Colors.textMain, backgroundColor: Colors.bgPage },
  textArea: { height: 180, paddingTop: Spacing.md },
  templateHint: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Tajawal', marginTop: Spacing.sm, textAlign: 'right', lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.md },
  switchLabel: { fontSize: 14, fontFamily: 'Tajawal', color: Colors.textMain },
  emailText: { fontSize: 14, color: Colors.textLight, fontFamily: 'Tajawal', textAlign: 'right' },
});
