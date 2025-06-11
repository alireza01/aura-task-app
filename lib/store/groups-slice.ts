import { StoreApi } from 'zustand';
import { supabase as supabaseClient } from '@/lib/supabase/client'; // Changed import and aliased
import type { User, TaskGroup } from '@/types'; // UserProfile not used directly in this slice state
import { AppState } from './index'; // Required for AppState type in get()

export interface GroupsSliceState {
  groups: TaskGroup[];
  loadingGroups: boolean;
  user: User | null; // Needed for user-specific operations

  // Actions
  setUser: (user: User | null) => void; // To set user from main store or auth changes
  loadGroups: (userId?: string) => Promise<void>;
  addGroup: (groupData: Omit<TaskGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<TaskGroup | null>;
  updateGroup: (groupId: string, groupData: Partial<Omit<TaskGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<TaskGroup | null>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  setGroups: (groups: TaskGroup[]) => void;
  initializeGroupSubscriptions: () => (() => void);
}

export type GroupsSlice = GroupsSliceState;

// No longer separate SetState/GetState, use StoreApi<AppState> directly
export const createGroupsSlice = (
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
): GroupsSlice => {
  // const supabaseClient: SupabaseClient = createClient(); // Removed, use imported supabaseClient directly

  return {
    // Initial State
    groups: [],
    loadingGroups: true,
    user: null,

    // Actions
    setUser: (user) => {
      set({ user, loadingGroups: true });
      if (user?.id) {
        get().loadGroups(user.id);
      } else {
        set({ groups: [], loadingGroups: false });
      }
    },

    loadGroups: async (userId?: string) => {
      const currentUserId = userId || get().user?.id;
      if (!currentUserId) {
        set({ loadingGroups: false, groups: [] });
        return;
      }
      set({ loadingGroups: true });
      const { data, error } = await supabaseClient
        .from("task_groups")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading groups:", error.message);
        set({ groups: [], loadingGroups: false });
        // Consider how to bubble up toast notifications if needed, perhaps via a UI slice action
      } else {
        set({ groups: data || [], loadingGroups: false });
      }
    },

    addGroup: async (groupData) => {
      const userId = get().user?.id;
      if (!userId) {
        console.error("User not identified for addGroup");
        return null;
      }

      try {
        const { data, error } = await supabaseClient
          .from("task_groups")
          .insert({ ...groupData, user_id: userId })
          .select()
          .single();

        if (error) {
          console.error("Error adding group:", error.message);
          return null;
        }
        // Realtime should handle state update, but can add optimistically or directly if needed
        // get().loadGroups(); // Or more targeted update
        return data;
      } catch (error) {
        console.error("Unexpected error adding group:", error);
        return null;
      }
    },

    updateGroup: async (groupId, groupData) => {
      const userId = get().user?.id;
      if (!userId) {
        console.error("User not identified for updateGroup");
        return null;
      }

      try {
        const { data, error } = await supabaseClient
          .from("task_groups")
          .update({ ...groupData, updated_at: new Date().toISOString() })
          .eq("id", groupId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) {
          console.error("Error updating group:", error.message);
          return null;
        }
        // Realtime should handle state update
        return data;
      } catch (error) {
        console.error("Unexpected error updating group:", error);
        return null;
      }
    },

    deleteGroup: async (groupId) => {
      const userId = get().user?.id;
      if (!userId) {
        console.error("User not identified for deleteGroup");
        return false;
      }

      try {
        const { error } = await supabaseClient
          .from("task_groups")
          .delete()
          .eq("id", groupId)
          .eq("user_id", userId);

        if (error) {
          console.error("Error deleting group:", error.message);
          return false;
        }
        // Realtime should handle state update
        return true;
      } catch (error) {
        console.error("Unexpected error deleting group:", error);
        return false;
      }
    },

    setGroups: (newGroups) => {
      set({ groups: newGroups });
    },

    initializeGroupSubscriptions: () => {
      const userId = get().user?.id;
      if (!userId) return () => {};

      const channelId = `groups-realtime-${userId}`;

      try {
        const existingChannel = supabaseClient.channel(channelId);
        if (existingChannel) {
          supabaseClient.removeChannel(existingChannel);
        }
      } catch (e) {
        // console.warn("Error removing channel before re-subscribing:", e);
      }

      const groupsChannel = supabaseClient
        .channel(channelId)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'task_groups', filter: `user_id=eq.${userId}` },
            (payload) => {
              const currentGet = get;
              if (payload.eventType === 'INSERT') {
                const newGroup = payload.new as TaskGroup;
                if (!currentGet().groups.find(g => g.id === newGroup.id)) {
                  set(state => ({
                    groups: [...state.groups, newGroup].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  }));
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedGroup = payload.new as TaskGroup;
                set(state => ({
                  groups: state.groups.map(group => (group.id === updatedGroup.id ? { ...group, ...updatedGroup } : group))
                            .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                }));
              } else if (payload.eventType === 'DELETE') {
                const oldGroupId = (payload.old as TaskGroup).id;
                set(state => ({ groups: state.groups.filter(group => group.id !== oldGroupId) }));
              }
            }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // console.log('GroupsSlice: Subscribed to task_groups channel', channelId);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('GroupsSlice: Task_groups channel error/timeout', channelId, err);
          }
        });

      return () => {
        supabaseClient.removeChannel(groupsChannel);
      };
    },
  };
};
