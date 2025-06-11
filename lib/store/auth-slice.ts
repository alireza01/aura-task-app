import { StoreApi } from 'zustand';
import type { User, UserProfile } from '@/types';
import { supabase } from '@/lib/supabase/client'; // Changed import
import { AppState } from './index'; // Required for AppState type in get()

export interface AuthSliceState {
  user: User | null;
  userProfile: UserProfile | null; // For role, guest status, nickname etc.
  isInitialized: boolean; // Has the initial auth check and data load completed?
  isLoadingAuth: boolean; // For login/logout processes

  // Actions
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setInitialized: (initialized: boolean) => void;
  loadUserProfile: (userId: string) => Promise<void>;
  checkInitialSession: () => Promise<void>; // Action to trigger initial auth check
  signOut: () => Promise<void>;
  // Realtime subscription will be managed by this slice
  initializeAuthListener: () => (() => void); // Returns unsubscribe function
}

export type AuthSlice = AuthSliceState;

// No longer separate SetState/GetState, use StoreApi<AppState> directly
export const createAuthSlice = (
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
): AuthSlice => {
  // const supabase: SupabaseClient = createClient(); // Removed, use imported supabase directly
  // Ensure the imported supabase instance is typed as SupabaseClient if needed, though it should be.

  return {
    // Initial State
    user: null,
    userProfile: null,
    isInitialized: false,
    isLoadingAuth: false,

    // Actions
    setUser: (user) => {
      set({ user });
      // Profile loading is handled by initializeAuthListener or checkInitialSession
      // Inter-slice communication:
      if (user) {
        // Assuming userProfile is loaded by initializeAuthListener or checkInitialSession before this is called directly
        // If userProfile is not yet loaded, it might be null here.
        // Consider if loadUserProfile should be awaited before these calls if setUser can be called before profile is ready.
        get().setUserAndProfile(user, get().userProfile); // For tasksSlice
        get().setUser(user); // For groupsSlice, tagsSlice, settingsSlice (assuming they have a setUser method)
        get().initializeTaskSubscriptions();
        get().initializeGroupSubscriptions();
        get().initializeTagSubscriptions();
      } else {
        get().setUserAndProfile(null, null); // For tasksSlice
        get().setUser(null); // For groupsSlice, tagsSlice, settingsSlice
        // Subscriptions should be automatically cleaned up by the respective slices when user becomes null
      }
    },

    setUserProfile: (profile) => {
      set({ userProfile: profile });
    },

    setInitialized: (initialized) => {
      set({ isInitialized: initialized });
    },

    loadUserProfile: async (userId) => {
      if (!userId) {
        set({ userProfile: null });
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId) // FIX: The column name is user_id in the profiles table
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: row not found
          throw error;
        }
        set({ userProfile: data });
      } catch (error) {
        console.error('Error loading user profile:', error);
        set({ userProfile: null });
      }
    },

    checkInitialSession: async () => {
      if (get().isInitialized) return;
      set({ isLoadingAuth: true });
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let user = session?.user ?? null;
        set({ user }); // Set user first

        if (user?.id) {
          await get().loadUserProfile(user.id); // Load profile
          // Now userProfile is set, call other slices
          get().setUserAndProfile(user, get().userProfile);
          get().setUser(user); // For other slices
          get().initializeTaskSubscriptions();
          get().initializeGroupSubscriptions();
          get().initializeTagSubscriptions();
        } else {
          // User is null
          set({ userProfile: null }); // Clear profile
          get().setUserAndProfile(null, null);
          get().setUser(null); // For other slices
        }
      } catch (error) {
        console.error("Error in checkInitialSession:", error);
        set({ user: null, userProfile: null });
        get().setUserAndProfile(null, null);
        get().setUser(null); // For other slices
      } finally {
        set({ isInitialized: true, isLoadingAuth: false });
      }
    },

    signOut: async () => {
        set({isLoadingAuth: true});
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            set({user: null, userProfile: null});
            // Call other slices
            get().setUserAndProfile(null, null);
            get().setUser(null); // For other slices
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            set({isLoadingAuth: false});
        }
    },

    initializeAuthListener: () => {
      // Only set up the listener if not already initialized
      if (get().isInitialized) {
        return () => {}; // Return empty cleanup if already initialized
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          const currentUser = get().user;
          const user = session?.user ?? null;

          // Handle different auth events
          switch (event) {
            case 'SIGNED_IN':
            case 'USER_UPDATED':
              if (user?.id && user.id !== currentUser?.id) {
                set({ user, isLoadingAuth: true });
                await get().loadUserProfile(user.id);
                get().setUserAndProfile(user, get().userProfile);
                get().setUser(user);
                get().initializeTaskSubscriptions();
                get().initializeGroupSubscriptions();
                get().initializeTagSubscriptions();
                set({ isLoadingAuth: false, isInitialized: true });
              }
              break;

            case 'SIGNED_OUT':
              if (currentUser) {
                set({ user: null, userProfile: null, isLoadingAuth: false, isInitialized: true });
                get().setUserAndProfile(null, null);
                get().setUser(null);
              }
              break;

            case 'INITIAL_SESSION':
              if (!user) {
                set({ user: null, userProfile: null, isInitialized: true, isLoadingAuth: false });
                get().setUserAndProfile(null, null);
                get().setUser(null);
              }
              break;
          }

          // Ensure isInitialized is true after first event
          if (!get().isInitialized) {
            set({ isInitialized: true });
          }
        }
      );

      // Initial check in case the event listener fires after the initial state is already set up
      if (!get().isInitialized) {
        get().checkInitialSession();
      }

      return () => {
        subscription?.unsubscribe();
      };
    },
  };
};
