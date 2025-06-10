import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { TaskGroup, GuestUser } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// const supabase = createClient();

interface GroupState {
  groups: TaskGroup[];
  guestGroups: TaskGroup[];
  isLoadingGroups: boolean;
  errorLoadingGroups: string | null;
  isUpdatingGroup: boolean;
  errorUpdatingGroup: string | null;

  fetchGroups: (userId: string | null, guestUser: GuestUser | null) => Promise<void>;
  addGroup: (groupData: Pick<TaskGroup, 'name' | 'emoji'>, userId: string | null, guestUser: GuestUser | null) => Promise<TaskGroup | null>;
  updateGroup: (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'emoji'>>, userId: string | null, guestUser: GuestUser | null) => Promise<TaskGroup | null>;
  deleteGroup: (groupId: string, userId: string | null, guestUser: GuestUser | null) => Promise<boolean>;
  // TODO: Add action for reordering groups and persisting order if that logic resides here
  // updateGroupOrder: (orderedGroupIds: string[], userId: string | null) => Promise<void>;

  migrateGuestGroups: (userId: string) => Promise<void>;
  clearUserGroups: () => void;
  setGuestGroups: (groups: TaskGroup[]) => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      guestGroups: [],
      isLoadingGroups: false,
      errorLoadingGroups: null,
      isUpdatingGroup: false,
      errorUpdatingGroup: null,

      fetchGroups: async (userId, guestUser) => {
        set({ isLoadingGroups: true, errorLoadingGroups: null });
        const supabase = createClient();
        try {
          if (userId) {
            const { data, error } = await supabase
              .from('task_groups')
              .select('*')
              .eq('user_id', userId)
              .order('created_at'); // Or by a specific 'order_index' if you add one
            if (error) throw error;
            set({ groups: data || [], isLoadingGroups: false });
          } else if (guestUser) {
            set({ groups: get().guestGroups, isLoadingGroups: false });
          } else {
            set({ groups: [], isLoadingGroups: false });
          }
        } catch (error: any) {
          console.error('Error fetching groups:', error);
          set({ errorLoadingGroups: error.message, isLoadingGroups: false, groups: [] });
        }
      },

      addGroup: async (groupData, userId, guestUser) => {
        set({ isUpdatingGroup: true, errorUpdatingGroup: null });
        const supabase = createClient();
        try {
          if (userId) {
            const newGroup = { ...groupData, user_id: userId };
            const { data, error } = await supabase
              .from('task_groups')
              .insert(newGroup)
              .select()
              .single();
            if (error) throw error;
            if (data) {
              set((state) => ({ groups: [...state.groups, data], isUpdatingGroup: false }));
              return data;
            }
          } else if (guestUser) {
            const newGuestGroup: TaskGroup = {
              id: uuidv4(),
              user_id: guestUser.id,
              created_at: new Date().toISOString(),
              ...groupData,
            };
            set((state) => ({
              guestGroups: [...state.guestGroups, newGuestGroup],
              groups: [...state.guestGroups, newGuestGroup],
              isUpdatingGroup: false,
            }));
            return newGuestGroup;
          }
          set({ isUpdatingGroup: false });
          return null;
        } catch (error: any) {
          console.error('Error adding group:', error);
          set({ errorUpdatingGroup: error.message, isUpdatingGroup: false });
          return null;
        }
      },

      updateGroup: async (groupId, updates, userId, guestUser) => {
        set({ isUpdatingGroup: true, errorUpdatingGroup: null });
        const supabase = createClient();
        try {
          if (userId) {
            const { data, error } = await supabase
              .from('task_groups')
              .update(updates)
              .eq('id', groupId)
              .eq('user_id', userId)
              .select()
              .single();
            if (error) throw error;
            if (data) {
              set((state) => ({
                groups: state.groups.map((g) => (g.id === groupId ? data : g)),
                isUpdatingGroup: false,
              }));
              return data;
            }
          } else if (guestUser) {
            let updatedGuestGroup: TaskGroup | null = null;
            const updatedGuestGroups = get().guestGroups.map((g) => {
              if (g.id === groupId) {
                updatedGuestGroup = { ...g, ...updates };
                return updatedGuestGroup;
              }
              return g;
            });
            if (updatedGuestGroup) {
              set({ guestGroups: updatedGuestGroups, groups: updatedGuestGroups, isUpdatingGroup: false });
              return updatedGuestGroup;
            }
          }
          set({ isUpdatingGroup: false });
          return null;
        } catch (error: any) {
          console.error('Error updating group:', error);
          set({ errorUpdatingGroup: error.message, isUpdatingGroup: false });
          return null;
        }
      },

      deleteGroup: async (groupId, userId, guestUser) => {
        set({ isUpdatingGroup: true, errorUpdatingGroup: null });
        const supabase = createClient();
        try {
          if (userId) {
            // IMPORTANT: Deleting a group might require handling tasks associated with this group.
            // Supabase schema's ON DELETE for task.group_id (e.g., SET NULL or CASCADE)
            // If not handled by DB, tasks might need to be updated here (e.g., set group_id to null).
            // This example assumes the DB or other logic handles orphaned tasks.
            const { error } = await supabase
              .from('task_groups')
              .delete()
              .eq('id', groupId)
              .eq('user_id', userId);
            if (error) throw error;
            set((state) => ({
              groups: state.groups.filter((g) => g.id !== groupId),
              isUpdatingGroup: false,
            }));
            // Also, update tasks in taskStore that belonged to this group
            // This creates a dependency on taskStore or requires event system.
            // For now, this side-effect is noted.
            return true;
          } else if (guestUser) {
            const newGuestGroups = get().guestGroups.filter((g) => g.id !== groupId);
            set({ guestGroups: newGuestGroups, groups: newGuestGroups, isUpdatingGroup: false });
            // Also update guest tasks in taskStore
            return true;
          }
          set({ isUpdatingGroup: false });
          return false;
        } catch (error: any) {
          console.error('Error deleting group:', error);
          set({ errorUpdatingGroup: error.message, isUpdatingGroup: false });
          return false;
        }
      },

      migrateGuestGroups: async (userId) => {
        const guestGroupsToMigrate = get().guestGroups;
        if (guestGroupsToMigrate.length === 0) return;
        set({ isLoadingGroups: true, errorLoadingGroups: null });
        const supabase = createClient();
        try {
          const migrationPromises = guestGroupsToMigrate.map(group => {
            const { id, created_at, ...restOfGroup } = group;
            return supabase.from('task_groups').insert({ ...restOfGroup, user_id: userId }).select().single();
          });

          await Promise.all(migrationPromises);

          set({ guestGroups: [], isLoadingGroups: false });
          await get().fetchGroups(userId, null);
          console.log('Guest groups migrated successfully.');
        } catch (error: any) {
          console.error('Error migrating guest groups:', error);
          set({ errorLoadingGroups: `Migration failed: ${error.message}`, isLoadingGroups: false });
        }
      },

      clearUserGroups: () => {
        set({ groups: [], isLoadingGroups: false, errorLoadingGroups: null });
      },

      setGuestGroups: (groupsToSet) => {
        set({ guestGroups: groupsToSet, groups: get().groups.length > 0 ? get().groups : groupsToSet });
      }
    }),
    {
      name: 'aura-task-store-guest-groups',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestGroups: state.guestGroups }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("groupStore: An error occurred during hydration:", error);
        } else {
          console.log("groupStore: Hydration finished.");
        }
      },
    }
  )
);
