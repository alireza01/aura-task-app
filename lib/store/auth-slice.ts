import { StoreApi } from 'zustand';
import type { User, UserProfile } from '@/types'; // Assuming UserProfile is also relevant
import { SupabaseClient, createClient } from '@/lib/supabase/client';

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

type SetState = StoreApi<AuthSlice>['setState'];
type GetState = StoreApi<AuthSlice>['getState'];

export const createAuthSlice = (set: SetState, get: GetState): AuthSlice => {
  const supabase: SupabaseClient = createClient();

  return {
    // Initial State
    user: null,
    userProfile: null,
    isInitialized: false,
    isLoadingAuth: false,

    // Actions
    setUser: (user) => {
      set({ user });
      if (user?.id && !get().userProfile) { // Load profile if user exists and profile not yet loaded
        get().loadUserProfile(user.id);
      }
      if (!user) { // Clear profile if user logs out
        set({ userProfile: null });
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
          .eq('id', userId)
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
        const user = session?.user ?? null;
        set({ user });

        if (user?.id) {
          await get().loadUserProfile(user.id);
        } else {
          // Optionally sign in anonymously if no session
          // const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          // if (anonError) console.error("Error signing in anonymously:", anonError);
          // else if (anonData.user) {
          //   set({ user: anonData.user });
          //   await get().loadUserProfile(anonData.user.id);
          // }
        }
      } catch (error) {
        console.error("Error in checkInitialSession:", error);
        set({ user: null, userProfile: null });
      } finally {
        set({ isInitialized: true, isLoadingAuth: false });
      }
    },

    signOut: async () => {
        set({isLoadingAuth: true});
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            set({user: null, userProfile: null}); // Clear user state on successful sign out
        } catch (error) {
            console.error("Error signing out:", error);
            // Potentially re-set user state if signout failed? Or rely on auth listener.
        } finally {
            set({isLoadingAuth: false});
        }
    },

    initializeAuthListener: () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          const user = session?.user ?? null;
          set({ user }); // Update user in store
          if (user?.id) {
            if(event === 'USER_UPDATED' || !get().userProfile || get().userProfile?.id !== user.id) {
                 get().loadUserProfile(user.id); // Reload profile if user updated or profile mismatch
            }
          } else {
            set({ userProfile: null }); // Clear profile if no user
          }

          // If it's the initial signed_in event and not yet initialized.
          if (event === 'SIGNED_IN' && !get().isInitialized) {
             set({ isInitialized: true, isLoadingAuth: false });
          }
          if (event === 'SIGNED_OUT') {
             set({ user: null, userProfile: null, isInitialized: true, isLoadingAuth: false });
          }
        }
      );

      // Ensure initial session check is also done if not yet initialized.
      // This covers cases where the listener might miss the very first session.
      if (!get().isInitialized) {
        get().checkInitialSession();
      }

      return () => {
        subscription?.unsubscribe();
      };
    },
  };
};
