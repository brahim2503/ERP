// ============================================================
// LoginScreen — Firebase Auth (Email + PIN)
// Mirrors the login-overlay from index.html
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../config/theme';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';
import { fsGetCollection } from '../config/firebase';
import { AppButton } from '../components/AppButton';

type LoginMode = 'email' | 'pin';

export function LoginScreen() {
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, createAccount } = useAuth();
  const { workers, setActiveWorker } = useStore();

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.code === 'auth/invalid-credential'
        ? 'بريد إلكتروني أو كلمة مرور غير صحيحة'
        : 'فشل تسجيل الدخول: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createAccount(email.trim(), password);
    } catch (e: any) {
      setError('فشل إنشاء الحساب: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!username || !pin) {
      setError('يرجى إدخال اسم المستخدم ورمز PIN');
      return;
    }
    setLoading(true);
    setError('');

    // Check against workers list
    const worker = workers.find(
      (w) => w.name === username.trim() && w.pin === pin.trim()
    );

    if (worker) {
      setActiveWorker(worker);
      setLoading(false);
    } else {
      setError('اسم المستخدم أو رمز PIN غير صحيح');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>📊</Text>
          </View>
          <Text style={styles.appName}>توشير ERP</Text>
          <Text style={styles.appSubtitle}>نظام إدارة المخزون ونقطة البيع والموردين</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, Shadow.lg]}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'email' && styles.tabActive]}
              onPress={() => { setMode('email'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>
                ✉️ بالبريد الإلكتروني
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'pin' && styles.tabActive]}
              onPress={() => { setMode('pin'); setError(''); }}
            >
              <Text style={[styles.tabText, mode === 'pin' && styles.tabTextActive]}>
                🔑 رمز PIN السريع
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Mode */}
          {mode === 'email' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>✉️ البريد الإلكتروني:</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@gmail.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="left"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>🔒 كلمة المرور:</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  textAlign="left"
                />
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <AppButton title="🚀 تسجيل الدخول" onPress={handleEmailLogin} loading={loading} style={{ marginTop: Spacing.sm }} />

              <TouchableOpacity onPress={handleCreateAccount} style={styles.createAccountBtn}>
                <Text style={styles.createAccountText}>✨ إنشاء حساب جديد بهذا البريد</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PIN Mode */}
          {mode === 'pin' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>👤 اسم المستخدم:</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="أدخل اسم المستخدم (مثال: المدير)"
                  placeholderTextColor={Colors.textMuted}
                  textAlign="right"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>🔑 رمز الدخول (PIN):</Text>
                <TextInput
                  style={styles.input}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="أدخل رمز PIN"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                  maxLength={8}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <AppButton title="🚀 تسجيل الدخول السريع (PIN)" onPress={handlePinLogin} loading={loading} style={{ marginTop: Spacing.sm }} />
            </View>
          )}

          {/* Firebase badge */}
          <Text style={styles.firebaseBadge}>🔒 مدعوم بـ Firebase Auth</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoEmoji: {
    fontSize: 38,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Tajawal',
    color: '#fff',
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: 'Tajawal',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgPage,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Tajawal',
    color: Colors.textLight,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  form: {
    gap: Spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Tajawal',
    color: Colors.textMain,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    fontFamily: 'Tajawal',
    color: Colors.textMain,
    backgroundColor: Colors.bgPage,
  },
  errorBox: {
    backgroundColor: Colors.dangerBg,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontFamily: 'Tajawal',
    fontWeight: '700',
    textAlign: 'right',
  },
  createAccountBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  createAccountText: {
    fontSize: 13,
    color: Colors.primary,
    fontFamily: 'Tajawal',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  firebaseBadge: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontFamily: 'Tajawal',
  },
});
