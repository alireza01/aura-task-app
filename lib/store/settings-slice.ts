import { StoreApi } from 'zustand';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, UserSettings, UserProfile } from '@/types'; // Assuming UserProfile might be relevant for initial settings load

// Define the state and actions for settings
export interface SettingsSliceState {
  theme: string; // e.g., 'light', 'dark', 'system'
  isSavingTheme: boolean;
  apiKey: string | null; // Store the actual API key, or null/masked representation
  isApiKeyValid: boolean | null; // null = untested, true = valid, false = invalid
  isLoadingApiKey: boolean; // For load, save, clear operations
  isTestingApiKey: boolean;
  user: User | null; // To associate settings with a user

  // Actions
  setUser: (user: User | null) => void;
  setTheme: (newTheme: string, fromNextThemes?: boolean) => void; // fromNextThemes to avoid loops if next-themes calls this
  saveThemePreference: (themeToSave: string) => Promise<void>;
  loadInitialSettings: (userId?: string) => Promise<void>; // Load API key and other settings
  saveApiKey: (newApiKey: string) => Promise<boolean>; // Returns true on success
  clearApiKey: () => Promise<boolean>; // Returns true on success
  testApiKey: (keyToTest?: string) => Promise<boolean>; // Returns true if valid
  setApiKeyInternal: (key: string | null) => void; // For internal use, e.g. after loading
}

export type SettingsSlice = SettingsSliceState;

type SetState = StoreApi<SettingsSlice>['setState'];
type GetState = StoreApi<SettingsSlice>['getState'];

export const createSettingsSlice = (set: SetState, get: GetState): SettingsSlice => {
  const supabaseClient: SupabaseClient = createClient();

  return {
    // Initial State
    theme: 'system', // Default theme
    isSavingTheme: false,
    apiKey: null, // Initially no API key
    isApiKeyValid: null,
    isLoadingApiKey: false,
    isTestingApiKey: false,
    user: null,

    // Actions
    setUser: (user) => {
      set({ user, isLoadingApiKey: !!user }); // Start loading settings if user is set
      if (user?.id) {
        get().loadInitialSettings(user.id);
      } else {
        // Clear user-specific settings if user logs out
        set({ apiKey: null, isApiKeyValid: null, theme: 'system' });
      }
    },

    setTheme: (newTheme, fromNextThemes = false) => {
      set({ theme: newTheme });
      // If `next-themes` is still managing the actual theme application,
      // this function primarily updates Zustand state. The actual theme
      // change on the DOM would be handled by `next-themes`.
      // If `fromNextThemes` is true, it means `next-themes` already updated, so no further action needed.
    },

    saveThemePreference: async (themeToSave) => {
      const userId = get().user?.id;
      if (!userId) {
        console.warn("Cannot save theme preference, no user.")
        return;
      }
      set({ isSavingTheme: true });
      try {
        const { error } = await supabaseClient
          .from('user_settings')
          .upsert({ user_id: userId, theme: themeToSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) throw error;
        // toast.success('Theme saved!'); // Toasting should be handled by UI components
      } catch (error) {
        console.error('Error saving theme preference:', error);
        // toast.error('Could not save theme.'); // Toasting should be handled by UI components
      } finally {
        set({ isSavingTheme: false });
      }
    },

    loadInitialSettings: async (userId?: string) => {
      const currentUserId = userId || get().user?.id;
      if (!currentUserId) {
        set({ isLoadingApiKey: false, apiKey: null, isApiKeyValid: null, theme: 'system' });
        return;
      }
      set({ isLoadingApiKey: true });
      try {
        const { data, error } = await supabaseClient
          .from('user_settings')
          .select('gemini_api_key, theme')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          set({
            apiKey: data.gemini_api_key ? '••••••••••••••••••••••••••••••' : null, // Mask if exists
            isApiKeyValid: data.gemini_api_key ? null : null, // Mark as untested if exists, or null if not
            theme: data.theme || 'system',
          });
        } else {
          set({ apiKey: null, isApiKeyValid: null, theme: 'system' });
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
        set({ apiKey: null, isApiKeyValid: null, theme: 'system' }); // Reset on error
      } finally {
        set({ isLoadingApiKey: false });
      }
    },

    saveApiKey: async (newApiKey) => {
      const userId = get().user?.id;
      if (!userId || !newApiKey.trim()) return false;

      set({ isLoadingApiKey: true, isTestingApiKey: true, isApiKeyValid: null });

      // 1. Test the API key
      const testResponse = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newApiKey.trim() }),
      });

      if (!testResponse.ok) {
        set({ isApiKeyValid: false, isTestingApiKey: false, isLoadingApiKey: false });
        return false;
      }
      set({ isApiKeyValid: true, isTestingApiKey: false });

      // 2. Save to database
      try {
        const { error: dbError } = await supabaseClient.from("user_settings").upsert({
          user_id: userId,
          gemini_api_key: newApiKey.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (dbError) throw dbError;

        set({ apiKey: '••••••••••••••••••••••••••••••' }); // Mask after saving
        return true;
      } catch (error) {
        console.error("Error saving API key:", error);
        set({ isApiKeyValid: false }); // Revert validity if save fails
        return false;
      } finally {
        set({ isLoadingApiKey: false });
      }
    },

    clearApiKey: async () => {
      const userId = get().user?.id;
      if (!userId) return false;

      set({ isLoadingApiKey: true });
      try {
        const { error } = await supabaseClient
          .from("user_settings")
          .update({ gemini_api_key: null, updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        if (error) throw error;

        set({ apiKey: null, isApiKeyValid: null });
        return true;
      } catch (error) {
        console.error("Error clearing API key:", error);
        return false;
      } finally {
        set({ isLoadingApiKey: false });
      }
    },

    testApiKey: async (keyToTest?: string) => {
      const currentApiKey = keyToTest || get().apiKey; // Allow testing a new key or the stored one
      if (!currentApiKey || currentApiKey.includes("•")) {
         // Cannot test a masked key without providing the actual key
         // Or if there's no key at all.
        if (!keyToTest) { // Only set to false if we are not testing a new key.
            set({isApiKeyValid: false});
        }
        return false;
      }

      set({ isTestingApiKey: true, isApiKeyValid: null });
      try {
        const testResponse = await fetch("/api/test-gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: currentApiKey.trim() }),
        });
        const isValid = testResponse.ok;
        set({ isApiKeyValid: isValid });
        return isValid;
      } catch (error) {
        console.error("Error testing API key:", error);
        set({ isApiKeyValid: false });
        return false;
      } finally {
        set({ isTestingApiKey: false });
      }
    },

    setApiKeyInternal: (key) => {
        // Used to set the API key, e.g. when loaded from DB, could be masked or null
        set({ apiKey: key });
    }
  };
};
