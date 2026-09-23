// ============================================================
// TOUSHIR ERP — Root App Component
// Sets up RTL, loads fonts, and mounts the navigator
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { AppNavigator } from './src/navigation/AppNavigator';

// Force RTL for Arabic UI
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          // Tajawal Arabic font (matches web app)
          Tajawal: require('./assets/fonts/Tajawal-Regular.ttf'),
          'Tajawal-Medium': require('./assets/fonts/Tajawal-Medium.ttf'),
          'Tajawal-Bold': require('./assets/fonts/Tajawal-Bold.ttf'),
          'Tajawal-ExtraBold': require('./assets/fonts/Tajawal-ExtraBold.ttf'),
          'Tajawal-Black': require('./assets/fonts/Tajawal-Black.ttf'),
        });
      } catch (e) {
        // If fonts fail to load, continue with system font
        console.warn('Font load failed, using system font:', e);
      } finally {
        setFontsLoaded(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
