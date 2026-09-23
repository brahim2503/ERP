// ============================================================
// AppNavigator — Main navigation structure
// Drawer (sidebar) + Stack navigation
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';

import { DashboardScreen } from '../screens/DashboardScreen';
import { PosScreen } from '../screens/PosScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { SuppliersScreen } from '../screens/SuppliersScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { LoginScreen } from '../screens/LoginScreen';

import { useStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import { Colors, Spacing, BorderRadius } from '../config/theme';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// ---- Custom Drawer Content ----
function CustomDrawerContent(props: any) {
  const { activeWorker, currentUser, settings } = useStore();
  const { signOut } = useAuth();

  return (
    <DrawerContentScrollView {...props} style={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogo}>
          <Text style={{ fontSize: 28 }}>📊</Text>
        </View>
        <View>
          <Text style={styles.drawerAppName}>{settings.storeName}</Text>
          <Text style={styles.drawerAppSub}>نظام إدارة المخزون ونقطة البيع</Text>
          <Text style={styles.drawerVersion}>v2.5</Text>
        </View>
      </View>

      {/* Nav Items */}
      <DrawerItemList {...props} />

      {/* Worker / User info at bottom */}
      <View style={styles.drawerFooter}>
        <View style={styles.workerPill}>
          <View style={styles.workerAvatar}>
            <Text style={styles.workerAvatarText}>
              {(activeWorker?.name || currentUser?.email || 'م').charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={styles.workerName}>{activeWorker?.name || currentUser?.email}</Text>
            <Text style={styles.workerRole}>{activeWorker?.role || 'مدير النظام'}</Text>
          </View>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

// ---- Main App Navigator (after login) ----
function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgCard },
        headerTitleStyle: { fontFamily: 'Tajawal', fontWeight: '800', fontSize: 17, color: Colors.textMain },
        headerTitleAlign: 'center',
        drawerStyle: { backgroundColor: Colors.bgSidebar, width: 280 },
        drawerLabelStyle: { fontFamily: 'Tajawal', fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
        drawerActiveTintColor: Colors.primaryLight,
        drawerInactiveTintColor: '#94a3b8',
        drawerActiveBackgroundColor: 'rgba(20,184,166,0.15)',
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'لوحة التحكم', drawerLabel: '📊  لوحة التحكم' }}
      />
      <Drawer.Screen
        name="POS"
        component={PosScreen}
        options={{ title: 'نقطة البيع', drawerLabel: '🛒  نقطة البيع (POS)' }}
      />
      <Drawer.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: 'إدارة الزبائن', drawerLabel: '👥  إدارة الزبائن' }}
      />
      <Drawer.Screen
        name="Suppliers"
        component={SuppliersScreen}
        options={{ title: 'إدارة الموردين', drawerLabel: '🏭  إدارة الموردين' }}
      />
      <Drawer.Screen
        name="Purchases"
        component={PurchasesScreen}
        options={{ title: 'فواتير المشتريات', drawerLabel: '🛍️  فواتير المشتريات' }}
      />
      <Drawer.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'إدارة المخزون', drawerLabel: '📦  إدارة المخزون' }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'التقارير المالية', drawerLabel: '📈  التقارير المالية' }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'إعدادات المتجر', drawerLabel: '⚙️  إعدادات المتجر' }}
      />
    </Drawer.Navigator>
  );
}

// ---- Root Navigator ----
export function AppNavigator() {
  const { currentUser } = useStore();

  // Auth listener initialized in useAuth hook
  useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <Stack.Screen name="App" component={AppDrawer} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { backgroundColor: Colors.bgSidebar },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: Spacing.xl + 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  drawerLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerAppName: { fontSize: 18, fontWeight: '900', fontFamily: 'Tajawal', color: '#f1f5f9' },
  drawerAppSub: { fontSize: 11, color: '#94a3b8', fontFamily: 'Tajawal' },
  drawerVersion: { fontSize: 10, color: Colors.primaryLight, fontFamily: 'Tajawal', marginTop: 2 },
  drawerFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: Spacing.xl,
  },
  workerPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  workerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: { fontSize: 16, fontWeight: '800', fontFamily: 'Tajawal', color: '#fff' },
  workerName: { fontSize: 13, fontWeight: '700', fontFamily: 'Tajawal', color: '#f1f5f9' },
  workerRole: { fontSize: 11, color: '#94a3b8', fontFamily: 'Tajawal' },
});
