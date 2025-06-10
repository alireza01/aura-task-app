// components/auth/app-initializer.tsx
"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Ensure this path is correct
import { useAppStore } from '@/lib/hooks/use-app-store'; // Ensure this path is correct
import { useThemeStore } from '@/lib/hooks/use-theme-store'; // Ensure this path is correct
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // No longer needed

export default function AppInitializer() {
  const { setUser, setInitialized } = useAppStore();
  const { setTheme } = useThemeStore(); // Changed from fetchAndSetTheme to setTheme based on guide's code for onAuthStateChange
  // const supabaseClient = createClientComponentClient(); // No longer needed, use imported supabase

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const user = session?.user ?? null;
        setUser(user);

        // Set the theme from user metadata if it exists, otherwise default.
        // The guide uses 'system' as a default if not found in metadata.
        const userTheme = user?.user_metadata?.theme ?? 'system';
        // Directly set the theme in the store.
        // The store's setTheme will update the state and trigger API call if implemented that way,
        // but here it's about reflecting the loaded theme, not saving a new choice.
        // The useThemeStore's setTheme also handles the API call.
        // For initial load, we might want to avoid re-saving the theme if it's just loaded.
        // The guide's setTheme in useThemeStore immediately calls the API.
        // This might need adjustment if we want to avoid saving on initial load.
        // However, the guide's useThemeStore.setTheme does an async API call without awaiting here.
        // Let's stick to the guide's direct usage of setTheme.
        setTheme(userTheme);

        setInitialized(true);
      }
    );

    // Initial check for session, in case onAuthStateChange doesn't fire immediately
    // or for the very first load.
    const checkInitialSession = async () => {
      let user = useAppStore.getState().user;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }

      if (user && !useAppStore.getState().isInitialized) {
        setUser(user);
        const userTheme = user?.user_metadata?.theme ?? 'system';
        setTheme(userTheme);
        setInitialized(true);
      } else if (!user && !useAppStore.getState().isInitialized) {
        try {
          // Attempt anonymous sign-in
          const { data: anonSignInData, error: anonSignInError } = await supabase.auth.signInAnonymously();
          if (anonSignInError) {
            console.error('Error signing in anonymously:', anonSignInError);
            setUser(null); // Ensure user is null if sign-in fails
            setTheme('system'); // Default theme
          } else if (anonSignInData?.user) {
            setUser(anonSignInData.user);
            const userTheme = anonSignInData.user?.user_metadata?.theme ?? 'system';
            setTheme(userTheme);
          }
        } catch (error) {
          console.error('Exception during anonymous sign-in:', error);
          setUser(null);
          setTheme('system');
        }
        setInitialized(true);
      }
    };

    checkInitialSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser, setInitialized, setTheme]); // supabaseClient removed from dependencies as we use the global one

  return null; // This component does not render anything
}
