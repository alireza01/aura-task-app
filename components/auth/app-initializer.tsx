// components/auth/app-initializer.tsx
"use client";

import { useEffect } from 'react';
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

  useEffect(() => {
    // Initialize the auth listener.
    // The initializeAuthListener action in authSlice is responsible for:
    // 1. Setting up the onAuthStateChange listener.
    // 2. Calling checkInitialSession internally if auth state isn't initialized yet.
    // This simplifies AppInitializer significantly.
    const unsubscribe = initializeAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initializeAuthListener]);

  useEffect(() => {
    // This effect ensures that whenever the theme changes in the Zustand store
    // (e.g., loaded from user settings by settingsSlice, or changed by ThemeSelector),
    // it's applied to the DOM via next-themes.
    if (currentThemeFromStore) {
      applyThemeToNextThemes(currentThemeFromStore);
    }
  }, [currentThemeFromStore, applyThemeToNextThemes]);

  return null; // This component does not render anything.
}
