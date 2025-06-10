import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client'; // Ensure this path is correct
import type { UserSettings } from '@/types'; // Ensure this path is correct

// Initialize Supabase client
// It's generally recommended to initialize the client once and reuse it,
// or ensure createClient() is very lightweight if called multiple times.
// For stores, it might be better to pass the supabase client instance if possible,
// or ensure createClient() is efficient.
// const supabase = createClient();

interface SettingsState {
  userSettings: UserSettings | null;
  isLoadingSettings: boolean;
  errorLoadingSettings: string | null;
  isUpdatingSettings: boolean;
  errorUpdatingSettings: string |null;

  fetchSettings: (userId: string) => Promise<void>;
  updateSettings: (userId: string, updates: Partial<UserSettings>) => Promise<UserSettings | null>;
  setGeminiApiKey: (userId: string, apiKey: string) => Promise<UserSettings | null>;
  clearSettings: () => void; // For user logout
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  userSettings: null,
  isLoadingSettings: false,
  errorLoadingSettings: null,
  isUpdatingSettings: false,
  errorUpdatingSettings: null,

  fetchSettings: async (userId) => {
    if (!userId) {
      set({ userSettings: null, isLoadingSettings: false, errorLoadingSettings: 'User ID is required to fetch settings.' });
      return;
    }
    set({ isLoadingSettings: true, errorLoadingSettings: null });
    const supabase = createClient(); // Create client instance per call or manage globally
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: 'single' row not found, not necessarily an error
        throw error;
      }

      set({ userSettings: data || null, isLoadingSettings: false });
    } catch (error: any) {
      console.error('Error fetching user settings:', error);
      set({ errorLoadingSettings: error.message, isLoadingSettings: false, userSettings: null });
    }
  },

  updateSettings: async (userId, updates) => {
    if (!userId) {
      set({ errorUpdatingSettings: 'User ID is required to update settings.' });
      return null;
    }
    set({ isUpdatingSettings: true, errorUpdatingSettings: null });
    const supabase = createClient();
    try {
      // Ensure user_id is part of the update and not undefined
      const updatePayload = { ...updates, user_id: userId, updated_at: new Date().toISOString() };

      const { data, error } = await supabase
        .from('user_settings')
        .upsert(updatePayload) // Use upsert to create if not exists, or update if exists
        .select()
        .single();

      if (error) {
        throw error;
      }

      set({ userSettings: data, isUpdatingSettings: false });
      return data;
    } catch (error: any) {
      console.error('Error updating user settings:', error);
      set({ errorUpdatingSettings: error.message, isUpdatingSettings: false });
      return null;
    }
  },

  setGeminiApiKey: async (userId, apiKey) => {
    if (!userId) {
      set({ errorUpdatingSettings: 'User ID is required to set API key.' });
      return null;
    }
    // This is a specific case of updateSettings
    return get().updateSettings(userId, { gemini_api_key: apiKey });
  },

  clearSettings: () => {
    set({
      userSettings: null,
      isLoadingSettings: false,
      errorLoadingSettings: null,
      isUpdatingSettings: false,
      errorUpdatingSettings: null
    });
  }
}));
