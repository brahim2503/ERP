// ============================================================
// TOUSHIR ERP — Theme & Design System
// Colors, typography, and spacing (mirrors index.css)
// ============================================================

export const Colors = {
  // Primary teal palette
  primary: '#0f766e',
  primaryDark: '#115e59',
  primaryLight: '#14b8a6',
  primaryBg: '#f0fdfa',

  // Backgrounds
  bgPage: '#f8fafc',
  bgCard: '#ffffff',
  bgSidebar: '#0f172a',

  // Text
  textMain: '#1e293b',
  textLight: '#64748b',
  textMuted: '#94a3b8',
  textOnDark: '#f1f5f9',

  // Status
  success: '#16a34a',
  successBg: '#f0fdf4',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  warning: '#d97706',
  warningBg: '#fffbeb',
  info: '#2563eb',
  infoBg: '#eff6ff',

  // Borders
  border: '#e2e8f0',
  borderFocus: '#14b8a6',

  // Dark mode
  darkBg: '#0f172a',
  darkCard: '#1e293b',
  darkBorder: '#334155',
  darkText: '#f1f5f9',
};

export const Typography = {
  fontFamily: 'Tajawal',
  h1: { fontSize: 24, fontWeight: '800' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 17, fontWeight: '700' as const },
  h4: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '400' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
