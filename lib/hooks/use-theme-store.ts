// lib/hooks/use-theme-store.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client'; // Ensure this path is correct

type ThemeState = {
  theme: string;
  setTheme: (theme: string) => Promise<void>;
  fetchAndSetTheme: (userId: string | null) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system', // Default theme
  setTheme: async (newTheme: string) => {
    set({ theme: newTheme });
    try {
      await fetch('/api/user/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },
  fetchAndSetTheme: async (userId: string | null) => {
    if (!userId) {
      // For guest users or when no user is logged in,
      // default to 'system' or a theme from local storage if implemented.
      // The guide defaults to 'system'.
      set({ theme: 'system' });
      return;
    }
    try {
      // This part is tricky as client-side cannot directly query user_metadata.
      // The guide suggests that the theme is set on initial load (via AppInitializer)
      // and updated via the store.
      // So, this function might primarily be for explicit fetching if ever needed,
      // but AppInitializer will handle the initial theme setting from user metadata.
      // For now, if a userId is provided, we assume AppInitializer has done its job
      // or will do it. If not, we could fetch session data again, but that might be redundant.
      // The initial theme is loaded in AppInitializer.
      // console.log('fetchAndSetTheme called for user:', userId, 'but theme is primarily set via AppInitializer');
      // No direct fetch here, rely on AppInitializer or initial state.
    } catch (error) {
      console.error('Error fetching theme:', error);
      set({ theme: 'system' }); // Fallback theme
    }
  },
}));
