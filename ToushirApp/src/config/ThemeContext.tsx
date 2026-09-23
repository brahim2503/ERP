// ============================================================
// ThemeContext — Dynamic dark/light mode
// ============================================================
import React, { createContext, useContext, ReactNode } from 'react';
import { useStore } from '../store/useStore';
import { Colors } from './theme';

interface ThemeColors {
  bg: string;
  card: string;
  border: string;
  textMain: string;
  textLight: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  sidebar: string;
  inputBg: string;
}

interface ThemeContextValue {
  dark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  colors: {
    bg: Colors.bgPage,
    card: Colors.bgCard,
    border: Colors.border,
    textMain: Colors.textMain,
    textLight: Colors.textLight,
    textMuted: Colors.textMuted,
    primary: Colors.primary,
    primaryLight: Colors.primaryLight,
    sidebar: Colors.bgSidebar,
    inputBg: Colors.bgPage,
  },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { darkMode } = useStore();

  const lightColors: ThemeColors = {
    bg: Colors.bgPage,
    card: Colors.bgCard,
    border: Colors.border,
    textMain: Colors.textMain,
    textLight: Colors.textLight,
    textMuted: Colors.textMuted,
    primary: Colors.primary,
    primaryLight: Colors.primaryLight,
    sidebar: Colors.bgSidebar,
    inputBg: Colors.bgPage,
  };

  const darkColors: ThemeColors = {
    bg: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    textMain: '#f1f5f9',
    textLight: '#94a3b8',
    textMuted: '#64748b',
    primary: Colors.primaryLight,
    primaryLight: Colors.primary,
    sidebar: '#020617',
    inputBg: '#0f172a',
  };

  return (
    <ThemeContext.Provider
      value={{
        dark: darkMode,
        colors: darkMode ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
