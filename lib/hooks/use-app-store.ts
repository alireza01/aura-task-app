// lib/hooks/use-app-store.ts
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js'; // Ensure this type import is correct

type AppState = {
  user: User | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: (isInitialized: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
