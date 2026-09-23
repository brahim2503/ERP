// ============================================================
// README — Toushir ERP Mobile App
// ============================================================
# توشير ERP — تطبيق الجوال

## نظرة عامة

تطبيق **React Native** (Expo) لنظام توشير ERP، يتصل بنفس قاعدة بيانات Firebase الموجودة.

## متطلبات التشغيل

- Node.js v16+
- Expo Go app على هاتفك (Android/iOS)

## تشغيل التطبيق

\`\`\`bash
cd ToushirApp
npm install
npm start
\`\`\`

ثم امسح QR Code بتطبيق **Expo Go** على هاتفك.

## هيكل المشروع

\`\`\`
src/
├── config/
│   ├── firebase.ts       # Firebase (نفس مشروع erp-mark)
│   └── theme.ts          # ألوان وتصميم
├── store/
│   └── useStore.ts       # Zustand state
├── hooks/
│   └── useAuth.ts        # Firebase Auth
├── navigation/
│   └── AppNavigator.tsx  # Drawer + Stack navigation
├── screens/
│   ├── LoginScreen.tsx   # تسجيل الدخول
│   ├── DashboardScreen.tsx
│   ├── PosScreen.tsx     # نقطة البيع
│   ├── CustomersScreen.tsx
│   ├── SuppliersScreen.tsx
│   ├── PurchasesScreen.tsx
│   ├── InventoryScreen.tsx
│   ├── ReportsScreen.tsx
│   └── SettingsScreen.tsx
├── components/
│   ├── StatCard.tsx
│   ├── SearchBar.tsx
│   └── AppButton.tsx
└── utils/
    └── helpers.ts
\`\`\`

## الميزات

- 🔐 تسجيل الدخول بالبريد الإلكتروني أو PIN
- 📊 لوحة تحكم مع KPIs
- 🛒 نقطة بيع سريعة
- 👥 إدارة الزبائن
- 🏭 إدارة الموردين
- 📦 فواتير المشتريات
- 📦 إدارة المخزون
- 📈 تقارير مالية
- ⚙️ إعدادات المتجر
- 🌙 الوضع الليلي
- 🇩🇿 واجهة عربية RTL كاملة

## Firebase

نفس مشروع Firebase: \`erp-mark\`
- Firestore لحفظ البيانات
- Firebase Auth لتسجيل الدخول
