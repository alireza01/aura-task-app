import { StoreApi } from 'zustand';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, Task, UserProfile } from '@/types';
import { AppState } from './index'; // Required for AppState type in get()
import { arrayMove } from '@dnd-kit/sortable';
import { generateFractionalIndex } from '@/lib/utils';

const GUEST_TASK_LIMIT = 5;

export interface TasksSliceState {
  tasks: Task[];
  filteredTasks: Task[];
  loadingTasks: boolean;
  activeDragId: string | null;
  searchQuery: string;
  filterGroup: string | null;
  filterStatus: "all" | "completed" | "active";
  filterPriority: "all" | "high" | "medium" | "low";
  filterTag: string | null;
  activeTab: string;
  user: User | null;
  userProfile: UserProfile | null;

  // Actions
  setUserAndProfile: (user: User | null, userProfile: UserProfile | null) => void;
  loadTasks: (userId?: string) => Promise<void>;
  applyFilters: () => void;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string, completed: boolean) => Promise<void>;
  handleTaskDropToGroup: (taskId: string, newGroupId: string | null) => Promise<void>;
  reorderTasks: (activeId: string, overId: string | null) => Promise<void>;
  canAddTask: () => boolean;
  setTasks: (tasks: Task[]) => void;
  setActiveDragId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterGroup: (groupId: string | null) => void;
  setFilterStatus: (status: "all" | "completed" | "active") => void;
  setFilterPriority: (priority: "all" | "high" | "medium" | "low") => void;
  setFilterTag: (tagId: string | null) => void;
  setActiveTab: (tab: string) => void;
  initializeTaskSubscriptions: () => (() => void);
}

export type TasksSlice = TasksSliceState;

// No longer separate SetState/GetState, use StoreApi<AppState> directly
export const createTasksSlice = (
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
): TasksSlice => {
  const supabaseClient = createClient();

  return {
    // Initial State
    tasks: [],
    filteredTasks: [],
    loadingTasks: true,
    activeDragId: null,
    searchQuery: "",
    filterGroup: null,
    filterStatus: "all",
    filterPriority: "all",
    filterTag: null,
    activeTab: "all",
    user: null,
    userProfile: null,

    // Actions
    setUserAndProfile: (user, userProfile) => {
      set({ user, userProfile, loadingTasks: true });
      if (user?.id) {
        get().loadTasks(user.id);
      } else {
        set({ tasks: [], filteredTasks: [], loadingTasks: false });
      }
    },

    loadTasks: async (userId?: string) => {
      const currentUserId = userId || get().user?.id;
      if (!currentUserId) {
        set({ loadingTasks: false, tasks: [], filteredTasks: [] });
        return;
      }
      set({ loadingTasks: true });
      const { data, error } = await supabaseClient
        .from("tasks_with_counts")
        .select("*")
        .eq("user_id", currentUserId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error loading tasks:", error.message);
        set({ tasks: [], loadingTasks: false });
      } else {
        set({ tasks: data || [], loadingTasks: false });
      }
      get().applyFilters();
    },

    applyFilters: () => {
      const { tasks, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab } = get();
      let result = [...tasks];

      if (activeTab === "today") {
        result = result.filter(t => t.created_at && new Date(t.created_at).toDateString() === new Date().toDateString());
      } else if (activeTab === "important") {
        result = result.filter(t => (t.importance_score || 0) >= 15);
      } else if (activeTab === "completed") {
        result = result.filter(t => t.completed);
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
      }
      if (filterGroup) result = result.filter(t => t.group_id === filterGroup);
      if (filterStatus === "completed") result = result.filter(t => t.completed);
      else if (filterStatus === "active") result = result.filter(t => !t.completed);

      const priorityMap = { high: 15, medium: 8, low: 0 };
      if (filterPriority !== "all") {
        result = result.filter(t => {
            const score = t.importance_score || 0;
            if (filterPriority === "high") return score >= priorityMap.high;
            if (filterPriority === "medium") return score >= priorityMap.medium && score < priorityMap.high;
            if (filterPriority === "low") return score < priorityMap.medium;
            return true;
        });
      }

      if (filterTag && tasks.some(t => Array.isArray(t.tags) && t.tags.length > 0)) {
         result = result.filter(t => t.tags?.some(tag => tag.id === filterTag));
      }
      set({ filteredTasks: result });
    },

    deleteTask: async (taskId) => {
      const userId = get().user?.id;
      if (!userId) return;

      const originalTasks = [...get().tasks];
      set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));
      get().applyFilters();

      try {
        const { error } = await supabaseClient.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
        if (error) {
          set({ tasks: originalTasks });
          get().applyFilters();
          console.error("Error deleting task:", error.message);
          throw error;
        }
      } catch (error) {
        // Error already logged or rethrown
      }
    },

    completeTask: async (taskId, completed) => {
      const userId = get().user?.id;
      if (!userId) return;

      const originalTasks = [...get().tasks];
      const completed_at = completed ? new Date().toISOString() : null;
      set(state => ({
        tasks: state.tasks.map(t => (t.id === taskId ? { ...t, completed, completed_at } : t)),
      }));
      get().applyFilters();

      try {
        const { error } = await supabaseClient.from("tasks").update({ completed, completed_at }).eq("id", taskId).eq("user_id", userId);
        if (error) {
          set({ tasks: originalTasks });
          get().applyFilters();
          console.error("Error completing task:", error.message);
          throw error;
        }
      } catch (error) {
        // Error already logged or rethrown
      }
    },

    handleTaskDropToGroup: async (taskId, newGroupId) => {
      const userId = get().user?.id;
      if (!userId) return;

      const originalTasks = [...get().tasks];
      set(state => ({
        tasks: state.tasks.map(t => (t.id === taskId ? { ...t, group_id: newGroupId } : t)),
      }));
      get().applyFilters();

      try {
        const { error } = await supabaseClient.from("tasks").update({ group_id: newGroupId }).eq("id", taskId).eq("user_id", userId);
        if (error) {
          set({ tasks: originalTasks });
          get().applyFilters();
          console.error("Error updating task group:", error.message);
          throw error;
        }
      } catch (error) {
        // Error already logged or rethrown
      }
    },

    reorderTasks: async (activeId, overId) => {
      const userId = get().user?.id;
      const tasks = get().tasks;
      if (!userId || activeId === overId) return;

      const oldIndex = tasks.findIndex((t) => t.id === activeId);
      const newPotentialIndex = overId ? tasks.findIndex((t) => t.id === overId) : tasks.length -1;

      if (oldIndex === -1 || (overId && newPotentialIndex === -1) ) return;

      const tempReorderedTasks = arrayMove([...tasks], oldIndex, newPotentialIndex);
      const finalNewIndexInTempArray = tempReorderedTasks.findIndex(t => t.id === activeId);

      const prevTaskOrder = finalNewIndexInTempArray > 0 ? tempReorderedTasks[finalNewIndexInTempArray - 1]?.order_index : undefined;
      const nextTaskOrder = finalNewIndexInTempArray < tempReorderedTasks.length - 1 ? tempReorderedTasks[finalNewIndexInTempArray + 1]?.order_index : undefined;
      const newOrderIndex = generateFractionalIndex(prevTaskOrder, nextTaskOrder);

      const reorderedTasksWithUpdatedIndex = tempReorderedTasks.map(task =>
        task.id === activeId ? { ...task, order_index: newOrderIndex } : task
      );
      reorderedTasksWithUpdatedIndex.sort((a, b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0"));

      set({ tasks: reorderedTasksWithUpdatedIndex });
      get().applyFilters();

      try {
        const { error } = await supabaseClient
          .from("tasks")
          .update({ order_index: newOrderIndex })
          .eq("id", activeId)
          .eq("user_id", userId);
        if (error) {
          console.error("Error reordering tasks:", error.message);
          get().loadTasks();
          throw error;
        }
      } catch (error) {
        // Error already logged or rethrown
      }
    },

    canAddTask: () => {
      const { userProfile, user, tasks } = get();
      const isGuest = userProfile?.is_guest ?? user?.email?.endsWith('@auratask.guest') ?? false;
      return !(isGuest && tasks.length >= GUEST_TASK_LIMIT);
    },

    setTasks: (newTasks) => {
      set({ tasks: newTasks });
      get().applyFilters();
    },
    setActiveDragId: (id) => set({ activeDragId: id }),
    setSearchQuery: (query) => {
      set({ searchQuery: query });
      get().applyFilters();
    },
    setFilterGroup: (groupId) => {
      set({ filterGroup: groupId });
      get().applyFilters();
    },
    setFilterStatus: (status) => {
      set({ filterStatus: status });
      get().applyFilters();
    },
    setFilterPriority: (priority) => {
      set({ filterPriority: priority });
      get().applyFilters();
    },
    setFilterTag: (tagId) => {
      set({ filterTag: tagId });
      get().applyFilters();
    },
    setActiveTab: (tab) => {
      set({ activeTab: tab });
      get().applyFilters();
    },

    initializeTaskSubscriptions: () => {
      const userId = get().user?.id;
      if (!userId) return () => {};

      const channelId = `tasks-realtime-${userId}`;

      // Attempt to remove existing channel first.
      // This is a bit of a workaround for potential duplicate channel issues.
      // A more robust solution might involve storing the channel instance and unsubscribing directly.
      try {
        const existingChannel = supabaseClient.channel(channelId);
        if (existingChannel) {
          supabaseClient.removeChannel(existingChannel);
        }
      } catch (e) {
        // console.warn("Error removing channel before re-subscribing:", e);
      }


      const tasksChannel = supabaseClient
        .channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks_with_counts', filter: `user_id=eq.${userId}` },
          (payload) => {
            const currentGet = get;
            if (payload.eventType === 'INSERT') {
              const newTask = payload.new as Task;
              if (!currentGet().tasks.find(t => t.id === newTask.id)) {
                const taskToAdd = { ...newTask, subtask_count: newTask.subtask_count || 0, tag_count: newTask.tag_count || 0 };
                set(state => ({ tasks: [...state.tasks, taskToAdd].sort((a,b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0")) }));
                currentGet().applyFilters();
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedTask = payload.new as Task;
              set(state => ({
                tasks: state.tasks.map(task =>
                  task.id === updatedTask.id ? { ...task, ...updatedTask, subtask_count: updatedTask.subtask_count, tag_count: updatedTask.tag_count } : task
                ).sort((a,b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0"))
              }));
              currentGet().applyFilters();
            } else if (payload.eventType === 'DELETE') {
              const oldTaskId = (payload.old as Task).id;
              set(state => ({ tasks: state.tasks.filter(task => task.id !== oldTaskId) }));
              currentGet().applyFilters();
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // console.log('TasksSlice: Subscribed to tasks channel', channelId);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('TasksSlice: Channel error/timeout', channelId, err);
          }
        });

      return () => {
        supabaseClient.removeChannel(tasksChannel);
      };
    },
  };
};
