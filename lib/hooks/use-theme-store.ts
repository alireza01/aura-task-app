// lib/hooks/use-theme-store.ts
import { create } from 'zustand';
import { useTheme as useNextTheme } from 'next-themes'; // Import useTheme from next-themes
import { toast } from 'sonner'; // For notifications

type ThemeState = {
  theme: string; // This will store the current theme (e.g., 'light', 'dark', 'system')
  setTheme: (theme: string, fromInitializer?: boolean) => void; // Renamed, simpler, synchronous for local state
  saveTheme: (themeToSave: string) => Promise<void>; // Explicit function to save to backend
  isSavingTheme: boolean; // To track loading state for save operation
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system', // Default theme, will be updated by AppInitializer
  isSavingTheme: false,

  setTheme: (newTheme: string, fromInitializer: boolean = false) => {
    // `fromInitializer` flag to prevent potential issues if next-themes also tries to set initial theme
    // This function updates local Zustand state and calls next-themes setter.
    // It does NOT save to the backend.

    // We need to access next-themes' setTheme function.
    // This is tricky because hooks can't be called directly inside Zustand create.
    // We'll call this from components where useNextTheme() is available, or AppInitializer.
    // For now, this function primarily updates the Zustand state.
    // The actual call to next-themes' setTheme will be done in AppInitializer and ThemeSelector.
    set({ theme: newTheme });

    // If we want to ensure next-themes is also updated when this is called,
    // we might need a ref to the next-themes' setTheme function, or pass it in.
    // For now, let's assume components will call both.
    // This will be simplified in AppInitializer and ThemeSelector.
  },

  saveTheme: async (themeToSave: string) => {
    set({ isSavingTheme: true });
    try {
      const response = await fetch('/api/user/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: themeToSave }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save theme');
      }
      toast.success('Theme saved successfully!');
      // Optionally update local state again if response provides canonical value, though usually not needed.
      // set({ theme: themeToSave }); // Already set by setTheme
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error(error instanceof Error ? error.message : 'Could not save theme.');
    } finally {
      set({ isSavingTheme: false });
    }
  },
}));
