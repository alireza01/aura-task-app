import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { Task, Subtask, GuestUser, TaskGroup, Tag } from '@/types'; // Make sure all types are imported
import { v4 as uuidv4 } from 'uuid';

// const supabase = createClient();

// Helper to sort tasks, ensuring completed tasks are at the bottom, then by order_index or created_at
const sortTasks = (tasks: Task[]): Task[] => {
  return tasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // If order_index is present and different, use it
    if (a.order_index !== undefined && b.order_index !== undefined && a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    // Fallback to created_at if order_index is the same or not present
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

interface TaskState {
  tasks: Task[];
  guestTasks: Task[]; // For guest mode, includes subtasks and pseudo-tags if needed
  isLoadingTasks: boolean;
  errorLoadingTasks: string | null;
  isUpdatingTask: boolean; // For general task updates
  errorUpdatingTask: string | null;

  // --- Task specific actions ---
  fetchTasks: (userId: string | null, guestUser: GuestUser | null) => Promise<void>;
  addTask: (taskData: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'subtasks' | 'tags'>>, userId: string | null, guestUser: GuestUser | null) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>, userId: string | null, guestUser: GuestUser | null) => Promise<Task | null>;
  deleteTask: (taskId: string, userId: string | null, guestUser: GuestUser | null) => Promise<boolean>;
  setTaskOrder: (orderedTaskObjects: {id: string, order_index: number, group_id: string | null}[], userId: string | null, guestUser: GuestUser | null) => Promise<void>; // Updated signature slightly for guestUser

  // --- Subtask specific actions ---
  // Subtasks are part of the Task object. Operations will modify the parent task.
  addSubtask: (parentId: string, subtaskData: Pick<Subtask, 'title'>, userId: string | null, guestUser: GuestUser | null) => Promise<Subtask | null>;
  updateSubtask: (parentId: string, subtaskId: string, updates: Partial<Subtask>, userId: string | null, guestUser: GuestUser | null) => Promise<Subtask | null>;
  deleteSubtask: (parentId: string, subtaskId: string, userId: string | null, guestUser: GuestUser | null) => Promise<boolean>;
  toggleSubtaskCompleted: (parentId: string, subtaskId: string, completed: boolean, userId: string | null, guestUser: GuestUser | null) => Promise<boolean>;

  // --- Task-Tag association ---
  // These might be complex if tags are also managed here vs. tagStore handling relationships
  // For now, assume task.tags array is updated directly or via task updates.
  // assignTagToTask: (taskId: string, tagId: string, userId: string | null) => Promise<void>;
  // removeTagFromTask: (taskId: string, tagId: string, userId: string | null) => Promise<void>;

  migrateGuestTasks: (userId: string, groupMap: Record<string, string>, tagMap: Record<string, string>) => Promise<void>;
  clearUserTasks: () => void;
  setGuestTasks: (tasks: Task[]) => void; // For testing or specific init
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      guestTasks: [],
      isLoadingTasks: false,
      errorLoadingTasks: null,
      isUpdatingTask: false,
      errorUpdatingTask: null,

      fetchTasks: async (userId, guestUser) => {
        set({ isLoadingTasks: true, errorLoadingTasks: null });
        const supabase = createClient();
        try {
          if (userId) {
            const { data, error } = await supabase
              .from('tasks')
              .select(`
                *,
                subtasks(*, task_id),
                task_tags!inner(tags(*))
              `) // Fetch tasks with subtasks and associated tags
              .eq('user_id', userId)
              // .order('order_index', { ascending: true }) // Sorting handled by sortTasks helper
              // .order('created_at', { ascending: false });
            if (error) throw error;

            const fetchedTasks = (data || []).map(task => ({
              ...task,
              tags: task.task_tags?.map((tt: any) => tt.tags) || [], // Flatten tags
              subtasks: task.subtasks || [], // Ensure subtasks is an array
            }));

            set({ tasks: sortTasks(fetchedTasks), isLoadingTasks: false });

          } else if (guestUser) {
            // Guest tasks are already loaded from localStorage by persist middleware into guestTasks
            // Ensure subtasks and tags are arrays for guest tasks as well
            const currentGuestTasks = get().guestTasks.map(task => ({
                ...task,
                subtasks: task.subtasks || [],
                tags: task.tags || []
            }));
            set({ tasks: sortTasks(currentGuestTasks), isLoadingTasks: false });
          } else {
            set({ tasks: [], isLoadingTasks: false });
          }
        } catch (error: any) {
          console.error('Error fetching tasks:', error);
          set({ errorLoadingTasks: error.message, isLoadingTasks: false, tasks: [] });
        }
      },

      addTask: async (taskData, userId, guestUser) => {
        set({ isUpdatingTask: true, errorUpdatingTask: null });
        const supabase = createClient();
        try {
          if (userId) {
            // Handle tags: if taskData.tags is an array of Tag objects, convert to array of IDs for junction table
            // Or, expect taskData.tag_ids. This example assumes taskData might have full tag objects.
            // For simplicity, we'll assume tags are handled by updating task_tags separately or via a PG function.
            // Here, we'll just insert the core task.
            const { tags, ...restOfTaskData } = taskData as any; // Separate tags if they are full objects

            const newTaskPayload: Partial<Task> = {
                ...restOfTaskData,
                user_id: userId,
                order_index: get().tasks.filter(t => t.group_id === taskData.group_id && !t.completed).length // Basic ordering
            };

            const { data: newTask, error } = await supabase
              .from('tasks')
              .insert(newTaskPayload)
              .select('*, subtasks(*), task_tags!inner(tags(*))') // Re-fetch with relations
              .single();

            if (error) throw error;

            if (newTask) {
              const formattedNewTask = {
                ...newTask,
                tags: newTask.task_tags?.map((tt: any) => tt.tags) || [],
                subtasks: newTask.subtasks || [],
              };
              // Add new task and re-sort
              set((state) => ({
                tasks: sortTasks([...state.tasks, formattedNewTask]),
                isUpdatingTask: false,
              }));
              return formattedNewTask;
            }
          } else if (guestUser) {
            const newGuestTask: Task = {
              id: uuidv4(),
              user_id: guestUser.id, // Guest's own ID
              created_at: new Date().toISOString(),
              completed: false,
              subtasks: [],
              tags: [], // Guest tags would be full Tag objects if added directly
              order_index: get().guestTasks.filter(t => t.group_id === taskData.group_id && !t.completed).length,
              ...taskData,
            } as Task; // Cast as Task, ensure all required fields are present

            set((state) => {
              const updatedGuestTasks = sortTasks([...state.guestTasks, newGuestTask]);
              return {
                guestTasks: updatedGuestTasks,
                tasks: updatedGuestTasks, // Update main tasks for UI
                isUpdatingTask: false,
              };
            });
            return newGuestTask;
          }
          set({ isUpdatingTask: false });
          return null;
        } catch (error: any) {
          console.error('Error adding task:', error);
          set({ errorUpdatingTask: error.message, isUpdatingTask: false });
          return null;
        }
      },

      updateTask: async (taskId, updates, userId, guestUser) => {
        set({ isUpdatingTask: true, errorUpdatingTask: null });
        const supabase = createClient();
        try {
          let updatedTask: Task | null = null;
          if (userId) {
            const { tags, subtasks, ...coreUpdates } = updates; // Separate relations

            const { data, error } = await supabase
              .from('tasks')
              .update(coreUpdates)
              .eq('id', taskId)
              .eq('user_id', userId)
              .select('*, subtasks(*), task_tags!inner(tags(*))')
              .single();
            if (error) throw error;
            if (data) {
              updatedTask = {
                ...data,
                tags: data.task_tags?.map((tt: any) => tt.tags) || [],
                subtasks: data.subtasks || [],
              };
            }
          } else if (guestUser) {
            // For guest tasks, ensure subtasks and tags are preserved if not in updates
            const currentGuestTasks = get().guestTasks;
            const taskIndex = currentGuestTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const existingTask = currentGuestTasks[taskIndex];
                updatedTask = {
                    ...existingTask,
                    ...updates,
                    subtasks: updates.subtasks || existingTask.subtasks || [],
                    tags: updates.tags || existingTask.tags || [],
                };
                const newGuestTasks = [...currentGuestTasks];
                newGuestTasks[taskIndex] = updatedTask;
                set({ guestTasks: newGuestTasks, tasks: newGuestTasks }); // Update both
            }
          }

          if (updatedTask) {
            const finalTask = updatedTask;
            set(state => ({
              tasks: sortTasks(state.tasks.map(t => (t.id === taskId ? finalTask : t))),
              isUpdatingTask: false,
            }));
            if (!userId && guestUser) {
                 set(state => ({ guestTasks: sortTasks(state.guestTasks.map(t => (t.id === taskId ? finalTask : t)))}));
            }
            return finalTask;
          }
          set({ isUpdatingTask: false });
          return null;
        } catch (error: any) {
          console.error('Error updating task:', error);
          set({ errorUpdatingTask: error.message, isUpdatingTask: false });
          return null;
        }
      },

      deleteTask: async (taskId, userId, guestUser) => {
        set({ isUpdatingTask: true, errorUpdatingTask: null });
        const supabase = createClient();
        try {
          if (userId) {
            // Subtasks and task_tags might be deleted by CASCADE constraint in DB
            const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
            if (error) throw error;
          } else if (!guestUser) { // Only proceed if guest or user
             return false;
          }

          // Optimistic update for both user and guest
          const currentTasks = get().tasks.filter(t => t.id !== taskId);
          set({ tasks: currentTasks, isUpdatingTask: false });
          if (guestUser) { // check guestUser specifically for guestTasks update
            set({ guestTasks: get().guestTasks.filter(t => t.id !== taskId) });
          }
          return true;

        } catch (error: any) {
          console.error('Error deleting task:', error);
          set({ errorUpdatingTask: error.message, isUpdatingTask: false });
          // TODO: Revert optimistic update on error if needed by re-fetching or storing original state
          return false;
        }
      },

      setTaskOrder: async (orderedTaskObjects, userId, guestUser) => {
        set({ isUpdatingTask: true, errorUpdatingTask: null });
        const supabase = createClient();
        try {
          if (userId) {
            const updates = orderedTaskObjects.map(({ id, order_index, group_id }) => ({ id, order_index, group_id }));
            const { error } = await supabase.from('tasks').upsert(updates);
            if (error) throw error;

            const currentTasks = get().tasks;
            const updatedTasks = currentTasks.map(task => {
                const newOrder = orderedTaskObjects.find(o => o.id === task.id);
                return newOrder ? { ...task, order_index: newOrder.order_index, group_id: newOrder.group_id } : task;
            });
            set({ tasks: sortTasks(updatedTasks), isUpdatingTask: false });

          } else if (guestUser) {
            const currentGuestTasks = get().guestTasks;
            let reorderedTasks: Task[] = [];
            const tasksById = new Map(currentGuestTasks.map(t => [t.id, t]));

            orderedTaskObjects.forEach(orderedTask => {
                const task = tasksById.get(orderedTask.id);
                if (task) {
                    reorderedTasks.push({ ...task, order_index: orderedTask.order_index, group_id: orderedTask.group_id });
                    tasksById.delete(orderedTask.id); // Remove handled task
                }
            });
            // Add back any tasks not in orderedTaskObjects (e.g., from other groups, or if list was partial)
            const remainingTasks = Array.from(tasksById.values());
            const finalGuestTasks = sortTasks([...reorderedTasks, ...remainingTasks]);
            set({ guestTasks: finalGuestTasks, tasks: finalGuestTasks, isUpdatingTask: false });
          }
        } catch (error: any) {
          console.error('Error setting task order:', error);
          set({ errorUpdatingTask: error.message, isUpdatingTask: false });
        }
      },

      // --- Subtask methods ---
      addSubtask: async (parentId, subtaskData, userId, guestUser) => {
        const parentTaskIndex = get().tasks.findIndex(t => t.id === parentId);
        if (parentTaskIndex === -1) {
          set({ errorUpdatingTask: "Parent task not found for subtask."});
          return null;
        }
        const parentTask = { ...get().tasks[parentTaskIndex] }; // Operate on a copy

        let newSubtask: Subtask;
        if (userId) {
          const supabase = createClient();
          const { data, error } = await supabase.from('subtasks').insert({
            task_id: parentId,
            title: subtaskData.title,
            completed: false,
            order_index: parentTask.subtasks?.length || 0,
            user_id: userId,
          }).select().single();
          if (error) {
            set({ errorUpdatingTask: `Failed to add subtask: ${error.message}`});
            return null;
          }
          newSubtask = data as Subtask;
        } else if (guestUser) {
          newSubtask = {
            id: uuidv4(),
            task_id: parentId,
            title: subtaskData.title,
            completed: false,
            created_at: new Date().toISOString(),
            order_index: parentTask.subtasks?.length || 0,
            user_id: guestUser.id,
          };
        } else { return null; }

        parentTask.subtasks = [...(parentTask.subtasks || []), newSubtask];
        return await get().updateTask(parentId, { subtasks: parentTask.subtasks }, userId, guestUser) ? newSubtask : null;
      },

      updateSubtask: async (parentId, subtaskId, updates, userId, guestUser) => {
        const parentTaskIndex = get().tasks.findIndex(t => t.id === parentId);
        if (parentTaskIndex === -1) return null;
        const parentTask = { ...get().tasks[parentTaskIndex] }; // Operate on a copy
        if (!parentTask.subtasks) return null;

        let updatedSubtask : Subtask | undefined = undefined;

        if (userId) {
            const supabase = createClient();
            // Ensure user_id is not in updates for subtask if your table doesn't want it directly
            const { user_id, ...restUpdates } = updates as any;
            const { data, error } = await supabase.from('subtasks')
                .update(restUpdates)
                .eq('id', subtaskId)
                .eq('task_id', parentId)
                .select().single();
            if (error) { set({ errorUpdatingTask: `Failed to update subtask: ${error.message}`}); return null; }
            updatedSubtask = data as Subtask;
        } else if (guestUser) {
            const subtaskIndex = parentTask.subtasks.findIndex(st => st.id === subtaskId);
            if (subtaskIndex !== -1) {
                updatedSubtask = { ...parentTask.subtasks[subtaskIndex], ...updates };
                parentTask.subtasks[subtaskIndex] = updatedSubtask;
            }
        } else { return null; }

        if (!updatedSubtask) return null;

        await get().updateTask(parentId, { subtasks: parentTask.subtasks }, userId, guestUser);
        return updatedSubtask;
      },

      deleteSubtask: async (parentId, subtaskId, userId, guestUser) => {
        const parentTaskIndex = get().tasks.findIndex(t => t.id === parentId);
        if (parentTaskIndex === -1) return false;
        const parentTask = { ...get().tasks[parentTaskIndex] }; // Operate on a copy
        if (!parentTask.subtasks) return false;

        if (userId) {
            const supabase = createClient();
            const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
            if (error) { set({ errorUpdatingTask: `Failed to delete subtask: ${error.message}`}); return false; }
        } else if (!guestUser) { return false; }

        parentTask.subtasks = parentTask.subtasks.filter(st => st.id !== subtaskId);
        return !!await get().updateTask(parentId, { subtasks: parentTask.subtasks }, userId, guestUser);
      },

      toggleSubtaskCompleted: async (parentId, subtaskId, completed, userId, guestUser) => {
        return !!await get().updateSubtask(parentId, subtaskId, { completed, completed_at: completed ? new Date().toISOString() : null }, userId, guestUser);
      },

      // --- Migration and Cleanup ---
      migrateGuestTasks: async (userId, groupMap, tagMap) => {
        const guestTasksToMigrate = get().guestTasks;
        if (guestTasksToMigrate.length === 0) return;

        set({ isLoadingTasks: true, errorLoadingTasks: null });
        const supabase = createClient();
        try {
          const taskInsertPromises = guestTasksToMigrate.map(async (guestTask) => {
            const { id, user_id: guestUserId, created_at, subtasks: guestSubtasks = [], tags: guestTags = [], ...restOfTask } = guestTask;

            const serverGroupId = restOfTask.group_id ? groupMap[restOfTask.group_id] : null;

            const newTaskPayload: any = {
              ...restOfTask,
              user_id: userId,
              group_id: serverGroupId
            };
            // Remove order_index if it's null or undefined, let DB handle default or calculate new
            if (newTaskPayload.order_index === null || newTaskPayload.order_index === undefined) {
                delete newTaskPayload.order_index;
            }

            const { data: newTask, error: taskError } = await supabase.from('tasks').insert(newTaskPayload).select('id').single();
            if (taskError) throw taskError;
            if (!newTask) throw new Error("Failed to create task during migration");

            if (guestSubtasks.length > 0) {
              const subtaskInserts = guestSubtasks.map(st => ({ ...st, id: undefined, task_id: newTask.id, user_id: userId }));
              const { error: subtaskError } = await supabase.from('subtasks').insert(subtaskInserts);
              if (subtaskError) throw subtaskError;
            }

            if (guestTags.length > 0) {
                const taskTagInserts = guestTags
                    .map(gt => tagMap[gt.id] ? ({ task_id: newTask.id, tag_id: tagMap[gt.id] }) : null)
                    .filter(Boolean);
                if (taskTagInserts.length > 0) {
                    const { error: taskTagError } = await supabase.from('task_tags').insert(taskTagInserts as any);
                    if (taskTagError) throw taskTagError;
                }
            }
          });

          await Promise.all(taskInsertPromises);

          set({ guestTasks: [], isLoadingTasks: false });
          await get().fetchTasks(userId, null);
          console.log('Guest tasks migrated successfully.');
        } catch (error: any) {
          console.error('Error migrating guest tasks:', error);
          set({ errorLoadingTasks: `Migration failed: ${error.message}`, isLoadingTasks: false });
        }
      },

      clearUserTasks: () => {
        set({ tasks: [], isLoadingTasks: false, errorLoadingTasks: null });
      },

      setGuestTasks: (tasksToSet) => {
        const processedTasks = tasksToSet.map(task => ({
            ...task,
            subtasks: task.subtasks || [],
            tags: task.tags || []
        }));
        set({ guestTasks: sortTasks(processedTasks), tasks: get().tasks.length > 0 ? get().tasks : sortTasks(processedTasks) });
      }
    }),
    {
      name: 'aura-task-store-guest-tasks',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestTasks: state.guestTasks.map(task => ({
          ...task,
          subtasks: task.subtasks || [],
          tags: task.tags || []
      })) }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("taskStore: An error occurred during hydration:", error);
        } else {
          console.log("taskStore: Hydration finished.");
          if (state?.guestTasks) {
            const sanitizedGuestTasks = state.guestTasks.map(task => ({
              ...task,
              subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
              tags: Array.isArray(task.tags) ? task.tags : [],
            }));
            // Use a timeout to allow other stores to potentially rehydrate if auth state is needed
            setTimeout(() => {
                const authStore = (window as any).useAuthStore?.getState(); // Example access, not ideal
                if (!authStore?.user) { // Check if user is not logged in
                    state.setGuestTasks(sanitizedGuestTasks);
                }
            }, 0);
          }
        }
      },
    }
  )
);
