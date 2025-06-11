import { StoreApi } from 'zustand';
import { supabase as supabaseClient } from '@/lib/supabase/client'; // Changed import and aliased
import type { User, Task, UserProfile } from '@/types';
import { AppState } from './index'; // Required for AppState type in get()
import { arrayMove } from '@dnd-kit/sortable';
import { generateFractionalIndex } from '@/lib/utils';

const GUEST_TASK_LIMIT = 5;

export interface TasksSliceState {
  tasks: Task[];
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
  getFilteredTasks: () => Task[];
}

export type TasksSlice = TasksSliceState;

// No longer separate SetState/GetState, use StoreApi<AppState> directly
export const createTasksSlice = (
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
): TasksSlice => {
  // const supabaseClient = createClient(); // Removed, use imported supabaseClient directly

  return {
    // Initial State
    tasks: [],
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
        set({ tasks: [], loadingTasks: false });
      }
    },

    loadTasks: async (userId?: string) => {
      const currentUserId = userId || get().user?.id;
      if (!currentUserId) {
        set({ loadingTasks: false, tasks: [] });
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
    },

    getFilteredTasks: () => {
      const { tasks, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab } = get();
      
      // Early return if no filters are active
      if (!searchQuery && !filterGroup && filterStatus === "all" && filterPriority === "all" && !filterTag && activeTab === "all") {
        return tasks;
      }

      let result = [...tasks];

      // Apply tab filter first as it's the most restrictive
      if (activeTab === "today") {
        const today = new Date().toDateString();
        result = result.filter(t => t.created_at && new Date(t.created_at).toDateString() === today);
      } else if (activeTab === "important") {
        result = result.filter(t => (t.importance_score || 0) >= 15);
      } else if (activeTab === "completed") {
        result = result.filter(t => t.completed);
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(t => 
          t.title.toLowerCase().includes(query) || 
          (t.description && t.description.toLowerCase().includes(query))
        );
      }

      // Apply group filter
      if (filterGroup) {
        result = result.filter(t => t.group_id === filterGroup);
      }

      // Apply status filter
      if (filterStatus === "completed") {
        result = result.filter(t => t.completed);
      } else if (filterStatus === "active") {
        result = result.filter(t => !t.completed);
      }

      // Apply priority filter
      if (filterPriority !== "all") {
        const priorityMap = { high: 15, medium: 8, low: 0 };
        result = result.filter(t => {
          const score = t.importance_score || 0;
          if (filterPriority === "high") return score >= priorityMap.high;
          if (filterPriority === "medium") return score >= priorityMap.medium && score < priorityMap.high;
          if (filterPriority === "low") return score < priorityMap.medium;
          return true;
        });
      }

      // Apply tag filter
      if (filterTag && tasks.some(t => Array.isArray(t.tags) && t.tags.length > 0)) {
        result = result.filter(t => t.tags?.some(tag => tag.id === filterTag));
      }

      return result;
    },

    deleteTask: async (taskId) => {
      const userId = get().user?.id;
      if (!userId) return;

      const originalTasks = [...get().tasks];
      set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));

      try {
        const { error } = await supabaseClient.from("tasks").delete().eq("id", taskId).eq("user_id", userId);
        if (error) {
          set({ tasks: originalTasks });
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

      try {
        const { error } = await supabaseClient.from("tasks").update({ completed, completed_at }).eq("id", taskId).eq("user_id", userId);
        if (error) {
          set({ tasks: originalTasks });
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

      try {
        const { error } = await supabaseClient.from("tasks").update({ group_id: newGroupId }).eq("id", taskId).eq("user_id", userId);
        if (error) {
          set({ tasks: originalTasks });
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

    setTasks: (tasks) => set({ tasks }),
    setActiveDragId: (id) => set({ activeDragId: id }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilterGroup: (groupId) => set({ filterGroup: groupId }),
    setFilterStatus: (status) => set({ filterStatus: status }),
    setFilterPriority: (priority) => set({ filterPriority: priority }),
    setFilterTag: (tagId) => set({ filterTag: tagId }),
    setActiveTab: (tab) => set({ activeTab: tab }),
    initializeTaskSubscriptions: () => {
      const userId = get().user?.id;
      if (!userId) return () => {};

      const subscription = supabaseClient
        .channel('tasks_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        }, () => {
          get().loadTasks(userId);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    },
  };
};
