// components/auth/app-initializer.tsx
"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/hooks/use-app-store';
import { useThemeStore } from '@/lib/hooks/use-theme-store';
import { useTheme as useNextTheme } from 'next-themes'; // Import useNextTheme

export default function AppInitializer() {
  const { setUser, setInitialized, isInitialized } = useAppStore();
  const zustandSetTheme = useThemeStore(state => state.setTheme);
  const { setTheme: nextThemesSetTheme } = useNextTheme(); // Get setTheme from next-themes

  const applyTheme = (themeValue: string) => {
    zustandSetTheme(themeValue, true); // Update Zustand store, mark as fromInitializer
    nextThemesSetTheme(themeValue); // Update next-themes provider
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setUser(user);

        const userTheme = user?.user_metadata?.theme ?? 'system';
        applyTheme(userTheme);

        if (!isInitialized) {
          setInitialized(true);
        }
      }
    );

    // Initial check for session
    const checkInitialSession = async () => {
      if (isInitialized) return; // Already initialized by onAuthStateChange or previous run

      const { data: { session } } = await supabase.auth.getSession(); // Use getSession for initial check
      let user = session?.user ?? null;
      let themeToApply = 'system'; // Default

      if (user) {
        setUser(user);
        themeToApply = user.user_metadata?.theme ?? 'system';
      } else {
        // No active session, attempt anonymous sign-in
        try {
          const { data: anonSignInData, error: anonSignInError } = await supabase.auth.signInAnonymously();
          if (anonSignInError) {
            console.error('Error signing in anonymously:', anonSignInError);
            setUser(null);
          } else if (anonSignInData?.user) {
            user = anonSignInData.user;
            setUser(user);
            // Anonymous users might not have a theme in metadata, defaults to 'system'
            themeToApply = user.user_metadata?.theme ?? 'system';
          }
        } catch (error) {
          console.error('Exception during anonymous sign-in:', error);
          setUser(null);
        }
      }

      applyTheme(themeToApply);
      setInitialized(true);
    };

    // Only run checkInitialSession if not already initialized to prevent race conditions
    if (!isInitialized) {
        checkInitialSession();
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser, setInitialized, zustandSetTheme, nextThemesSetTheme, isInitialized]);

  return null;
}
