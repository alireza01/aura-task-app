import { StoreApi } from 'zustand';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, Tag } from '@/types'; // UserProfile not used directly
import { AppState } from './index'; // Required for AppState type in get()

export interface TagsSliceState {
  tags: Tag[];
  loadingTags: boolean;
  user: User | null; // Needed for user-specific operations

  // Actions
  setUser: (user: User | null) => void; // To set user from main store or auth changes
  loadTags: (userId?: string) => Promise<void>;
  addTag: (tagData: Omit<Tag, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Tag | null>;
  updateTag: (tagId: string, tagData: Partial<Omit<Tag, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<Tag | null>;
  deleteTag: (tagId: string) => Promise<boolean>;
  setTags: (tags: Tag[]) => void;
  initializeTagSubscriptions: () => (() => void);
}

export type TagsSlice = TagsSliceState;

// No longer separate SetState/GetState, use StoreApi<AppState> directly
export const createTagsSlice = (
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
): TagsSlice => {
  const supabaseClient: SupabaseClient = createClient();

  return {
    // Initial State
    tags: [],
    loadingTags: true,
    user: null,

    // Actions
    setUser: (user) => {
      set({ user, loadingTags: true });
      if (user?.id) {
        get().loadTags(user.id);
      } else {
        set({ tags: [], loadingTags: false });
      }
    },

    loadTags: async (userId?: string) => {
      const currentUserId = userId || get().user?.id;
      if (!currentUserId) {
        set({ loadingTags: false, tags: [] });
        return;
      }
      set({ loadingTags: true });
      const { data, error } = await supabaseClient
        .from("tags")
        .select("*")
        .eq("user_id", currentUserId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading tags:", error.message);
        set({ tags: [], loadingTags: false });
      } else {
        set({ tags: data || [], loadingTags: false });
      }
    },

    addTag: async (tagData) => {
      const userId = get().user?.id;
      if (!userId) {
        console.error("User not identified for addTag");
        return null;
      }

      try {
        const { data, error } = await supabaseClient
          .from("tags")
          .insert({ ...tagData, user_id: userId })
          .select()
          .single();

        if (error) {
          console.error("Error adding tag:", error.message);
          return null;
        }
        // Realtime should handle state update
        return data;
      } catch (error) {
        console.error("Unexpected error adding tag:", error);
        return null;
      }
    },

    updateTag: async (tagId, tagData) => {
      const userId = get().user?.id;
      if (!userId) {
        console.error("User not identified for updateTag");
        return null;
      }

      try {
        const { data, error } = await supabaseClient
          .from("tags")
          .update({ ...tagData, updated_at: new Date().toISOString() })
          .eq("id", tagId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) {
          console.error("Error updating tag:", error.message);
          return null;
        }
        // Realtime should handle state update
        return data;
      } catch (error) {
        console.error("Unexpected error updating tag:", error);
        return null;
      }
    },

    deleteTag: async (tagId) => {
      const userId = get().user?.id;
      if (!userId) {
        console.error("User not identified for deleteTag");
        return false;
      }

      try {
        const { error } = await supabaseClient
          .from("tags")
          .delete()
          .eq("id", tagId)
          .eq("user_id", userId);

        if (error) {
          console.error("Error deleting tag:", error.message);
          return false;
        }
        // Realtime should handle state update
        return true;
      } catch (error) {
        console.error("Unexpected error deleting tag:", error);
        return false;
      }
    },

    setTags: (newTags) => {
      set({ tags: newTags });
    },

    initializeTagSubscriptions: () => {
      const userId = get().user?.id;
      if (!userId) return () => {};

      const channelId = `tags-realtime-${userId}`;

      try {
        const existingChannel = supabaseClient.channel(channelId);
        if (existingChannel) {
          supabaseClient.removeChannel(existingChannel);
        }
      } catch (e) {
        // console.warn("Error removing channel before re-subscribing:", e);
      }

      const tagsChannel = supabaseClient
        .channel(channelId)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
            (payload) => {
              const currentGet = get;
              if (payload.eventType === 'INSERT') {
                const newTag = payload.new as Tag;
                if (!currentGet().tags.find(t => t.id === newTag.id)) {
                  set(state => ({
                    tags: [...state.tags, newTag].sort((a,b) => a.name.localeCompare(b.name))
                  }));
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedTag = payload.new as Tag;
                set(state => ({
                  tags: state.tags.map(tag => (tag.id === updatedTag.id ? { ...tag, ...updatedTag } : tag))
                           .sort((a,b) => a.name.localeCompare(b.name))
                }));
              } else if (payload.eventType === 'DELETE') {
                const oldTagId = (payload.old as Tag).id;
                set(state => ({ tags: state.tags.filter(tag => tag.id !== oldTagId) }));
              }
            }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // console.log('TagsSlice: Subscribed to tags realtime channel', channelId);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('TagsSlice: Tags channel error/timeout', channelId, err);
          }
        });

      return () => {
        supabaseClient.removeChannel(tagsChannel);
      };
    },
  };
};
