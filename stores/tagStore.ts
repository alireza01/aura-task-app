import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { Tag, GuestUser } from '@/types'; // Assuming types are in '@/types'
import { v4 as uuidv4 } from 'uuid';

// const supabase = createClient(); // Initialize once if preferred

interface TagState {
  tags: Tag[];
  guestTags: Tag[];
  isLoadingTags: boolean;
  errorLoadingTags: string | null;
  isUpdatingTag: boolean;
  errorUpdatingTag: string | null;

  fetchTags: (userId: string | null, guestUser: GuestUser | null) => Promise<void>;
  addTag: (tagData: Pick<Tag, 'name' | 'color'>, userId: string | null, guestUser: GuestUser | null) => Promise<Tag | null>;
  updateTag: (tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>, userId: string | null, guestUser: GuestUser | null) => Promise<Tag | null>;
  deleteTag: (tagId: string, userId: string | null, guestUser: GuestUser | null) => Promise<boolean>;

  migrateGuestTags: (userId: string) => Promise<void>;
  clearUserTags: () => void; // For logout
  setGuestTags: (tags: Tag[]) => void; // For initial guest data or testing
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      tags: [],
      guestTags: [],
      isLoadingTags: false,
      errorLoadingTags: null,
      isUpdatingTag: false,
      errorUpdatingTag: null,

      fetchTags: async (userId, guestUser) => {
        set({ isLoadingTags: true, errorLoadingTags: null });
        const supabase = createClient();
        try {
          if (userId) {
            const { data, error } = await supabase
              .from('tags')
              .select('*')
              .eq('user_id', userId)
              .order('name');
            if (error) throw error;
            set({ tags: data || [], isLoadingTags: false });
          } else if (guestUser) {
            // For guests, tags are already loaded from localStorage by persist middleware into guestTags
            // We can set 'tags' to be the guestTags for unified access in components if desired
            set({ tags: get().guestTags, isLoadingTags: false });
          } else {
            set({ tags: [], isLoadingTags: false }); // No user, no guest
          }
        } catch (error: any) {
          console.error('Error fetching tags:', error);
          set({ errorLoadingTags: error.message, isLoadingTags: false, tags: [] });
        }
      },

      addTag: async (tagData, userId, guestUser) => {
        set({ isUpdatingTag: true, errorUpdatingTag: null });
        const supabase = createClient();
        try {
          if (userId) {
            const newTag = { ...tagData, user_id: userId };
            const { data, error } = await supabase
              .from('tags')
              .insert(newTag)
              .select()
              .single();
            if (error) throw error;
            if (data) {
              set((state) => ({ tags: [...state.tags, data].sort((a,b) => a.name.localeCompare(b.name)), isUpdatingTag: false }));
              return data;
            }
          } else if (guestUser) {
            const newGuestTag: Tag = {
              id: uuidv4(), // Generate local UUID for guest
              user_id: guestUser.id, // Associate with guest user ID
              created_at: new Date().toISOString(),
              ...tagData,
            };
            set((state) => ({
              guestTags: [...state.guestTags, newGuestTag].sort((a,b) => a.name.localeCompare(b.name)),
              tags: [...state.guestTags, newGuestTag].sort((a,b) => a.name.localeCompare(b.name)), // also update main tags for immediate UI consistency
              isUpdatingTag: false,
            }));
            return newGuestTag;
          }
          set({ isUpdatingTag: false });
          return null;
        } catch (error: any) {
          console.error('Error adding tag:', error);
          set({ errorUpdatingTag: error.message, isUpdatingTag: false });
          return null;
        }
      },

      updateTag: async (tagId, updates, userId, guestUser) => {
        set({ isUpdatingTag: true, errorUpdatingTag: null });
        const supabase = createClient();
        try {
          if (userId) {
            const { data, error } = await supabase
              .from('tags')
              .update(updates)
              .eq('id', tagId)
              .eq('user_id', userId) // Ensure user owns the tag
              .select()
              .single();
            if (error) throw error;
            if (data) {
              set((state) => ({
                tags: state.tags.map((t) => (t.id === tagId ? data : t)).sort((a,b) => a.name.localeCompare(b.name)),
                isUpdatingTag: false,
              }));
              return data;
            }
          } else if (guestUser) {
            let updatedGuestTag: Tag | null = null;
            const updatedGuestTags = get().guestTags.map((t) => {
              if (t.id === tagId) {
                updatedGuestTag = { ...t, ...updates };
                return updatedGuestTag;
              }
              return t;
            }).sort((a,b) => a.name.localeCompare(b.name));

            if (updatedGuestTag) {
              set({ guestTags: updatedGuestTags, tags: updatedGuestTags, isUpdatingTag: false });
              return updatedGuestTag;
            }
          }
          set({ isUpdatingTag: false });
          return null;
        } catch (error: any) {
          console.error('Error updating tag:', error);
          set({ errorUpdatingTag: error.message, isUpdatingTag: false });
          return null;
        }
      },

      deleteTag: async (tagId, userId, guestUser) => {
        set({ isUpdatingTag: true, errorUpdatingTag: null });
        const supabase = createClient();
        try {
          if (userId) {
            // Note: Consider implications for tasks that use this tag.
            // Supabase schema might handle this with ON DELETE SET NULL or CASCADE,
            // or it might need to be handled here (e.g., untag tasks).
            const { error } = await supabase
              .from('tags')
              .delete()
              .eq('id', tagId)
              .eq('user_id', userId);
            if (error) throw error;
            set((state) => ({
              tags: state.tags.filter((t) => t.id !== tagId),
              isUpdatingTag: false,
            }));
            return true;
          } else if (guestUser) {
            const newGuestTags = get().guestTags.filter((t) => t.id !== tagId);
            set({ guestTags: newGuestTags, tags: newGuestTags, isUpdatingTag: false });
            return true;
          }
          set({ isUpdatingTag: false });
          return false;
        } catch (error: any) {
          console.error('Error deleting tag:', error);
          set({ errorUpdatingTag: error.message, isUpdatingTag: false });
          return false;
        }
      },

      migrateGuestTags: async (userId) => {
        const guestTagsToMigrate = get().guestTags;
        if (guestTagsToMigrate.length === 0) return;
        set({ isLoadingTags: true, errorLoadingTags: null });
        const supabase = createClient();
        try {
          const migrationPromises = guestTagsToMigrate.map(tag => {
            // Remove local guest-specific ID before inserting
            const { id, created_at, ...restOfTag } = tag;
            return supabase.from('tags').insert({ ...restOfTag, user_id: userId }).select().single();
          });

          const results = await Promise.all(migrationPromises);
          // Check for errors in results if needed

          // Clear guest tags after successful migration
          set({ guestTags: [], isLoadingTags: false });
          // Re-fetch user's tags to get the complete list including migrated ones
          await get().fetchTags(userId, null);
          console.log('Guest tags migrated successfully.');
        } catch (error: any) {
          console.error('Error migrating guest tags:', error);
          set({ errorLoadingTags: `Migration failed: ${error.message}`, isLoadingTags: false });
          // Decide on error strategy: keep guest tags? attempt partial migration?
        }
      },

      clearUserTags: () => {
        set({ tags: [], isLoadingTags: false, errorLoadingTags: null });
        // guestTags remain in local storage unless explicitly cleared or migrated.
      },

      setGuestTags: (tagsToSet) => { // Helper for testing or specific scenarios
        set({ guestTags: tagsToSet, tags: get().tags.length > 0 ? get().tags : tagsToSet });
      }
    }),
    {
      name: 'aura-task-store-guest-tags', // Local storage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestTags: state.guestTags }), // Only persist guestTags
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("tagStore: An error occurred during hydration:", error);
        } else {
          console.log("tagStore: Hydration finished.");
          // If there's no logged-in user, 'tags' can be initialized with guestTags
          // This needs to be coordinated with initial auth state.
          // if (!get().userId) { // This check needs access to auth state, tricky here.
          //   state?.set({ tags: state.guestTags });
          // }
        }
      },
    }
  )
);
