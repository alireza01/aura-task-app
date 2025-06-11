// components/auth/app-initializer.tsx
"use client";

import { useEffect, useCallback } from 'react';
// Supabase client is not directly used here anymore, authSlice handles it.
// import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store'; // Import the new Zustand store
import { useTheme as useNextTheme } from 'next-themes';

export default function AppInitializer() {
  // Auth related actions/state from authSlice via useAppStore
  // const authIsInitialized = useAppStore(state => state.isInitialized); // authSlice's isInitialized
  const initializeAuthListener = useAppStore(state => state.initializeAuthListener);
  // const checkInitialSessionAction = useAppStore(state => state.checkInitialSession); // initializeAuthListener calls this

  // Theme related state from settingsSlice via useAppStore
  const currentThemeFromStore = useAppStore(state => state.theme);
  const { setTheme: applyThemeToNextThemes } = useNextTheme();

  // Memoize the auth listener initialization to prevent recreation on each render
  const setupAuthListener = useCallback(() => {
    const unsubscribe = initializeAuthListener();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initializeAuthListener]);

  // Initialize auth listener only once on mount
  useEffect(() => {
    return setupAuthListener();
  }, [setupAuthListener]);

  // Apply theme changes when store theme changes
  useEffect(() => {
    if (currentThemeFromStore) {
      applyThemeToNextThemes(currentThemeFromStore);
    }
  }, [currentThemeFromStore, applyThemeToNextThemes]);

  return null; // This component does not render anything.
}
