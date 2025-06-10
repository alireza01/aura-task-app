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
      async (event, session) => { // Make callback async
        const user = session?.user ?? null;
        setUser(user);
        let themeToApply = 'system'; // Default theme

        if (user) {
          try {
            const { data: settings, error: settingsError } = await supabase
              .from('user_settings')
              .select('theme')
              .eq('user_id', user.id)
              .single();

            if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116: row not found
              console.error('Error fetching theme from user_settings:', settingsError);
            }

            if (settings && settings.theme) {
              themeToApply = settings.theme;
            } else {
              // Fallback to user_metadata
              themeToApply = user.user_metadata?.theme ?? 'system';
            }
          } catch (e) {
            console.error('Exception fetching theme:', e);
            themeToApply = user.user_metadata?.theme ?? 'system'; // Fallback on error
          }
        }

        applyTheme(themeToApply);

        if (!isInitialized) {
          setInitialized(true);
        }
      }
    );

    // Initial check for session
    const checkInitialSession = async () => {
      if (isInitialized) return;

      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user ?? null;
      let themeToApply = 'system';

      if (user) {
        setUser(user);
        try {
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('theme')
            .eq('user_id', user.id)
            .single();

          if (settingsError && settingsError.code !== 'PGRST116') {
            console.error('Error fetching theme from user_settings on initial check:', settingsError);
          }

          if (settings && settings.theme) {
            themeToApply = settings.theme;
          } else {
            themeToApply = user.user_metadata?.theme ?? 'system';
          }
        } catch (e) {
          console.error('Exception fetching theme on initial check:', e);
          themeToApply = user.user_metadata?.theme ?? 'system';
        }
      } else {
        try {
          const { data: anonSignInData, error: anonSignInError } = await supabase.auth.signInAnonymously();
          if (anonSignInError) {
            console.error('Error signing in anonymously:', anonSignInError);
            setUser(null);
          } else if (anonSignInData?.user) {
            user = anonSignInData.user;
            setUser(user);
            // Anonymous users likely won't have settings, use default or metadata if somehow set
            // For anonymous, user_settings fetch might fail or return nothing, which is fine.
            // Fallback to metadata or system default.
            themeToApply = user.user_metadata?.theme ?? 'system';
            // Attempt to get from user_settings for anonymous user if there's a use case for it
            // This is less likely for anonymous but included for completeness if such a flow exists
            try {
                const { data: anonSettings, error: anonSettingsError } = await supabase
                    .from('user_settings')
                    .select('theme')
                    .eq('user_id', user.id) // user.id for anon user
                    .single();
                if (anonSettings && anonSettings.theme) {
                    themeToApply = anonSettings.theme;
                } else if (anonSettingsError && anonSettingsError.code !== 'PGRST116') {
                    console.error('Error fetching theme for anon user:', anonSettingsError);
                }
            } catch(e) {
                 console.error('Exception fetching theme for anon user:', e);
            }
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
