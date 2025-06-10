import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, Task, TaskGroup, UserProfile, Tag } from '@/types'; // Assuming Tag might be needed for filterTag
import { arrayMove } from '@dnd-kit/sortable';
import { generateFractionalIndex } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast'; // For notifications

// GUEST_TASK_LIMIT might be defined elsewhere or passed in if configurable
const GUEST_TASK_LIMIT = 5;

interface UseTasksProps {
  user: User | null;
  userProfile: UserProfile | null; // Added for guest checks
  initialSupabaseClient?: SupabaseClient; // Optional, can create one if not provided
  initialTasks?: Task[]; // Allow passing initial tasks e.g. from SSR
}

export function useTasks({
  user,
  userProfile,
  initialSupabaseClient,
  initialTasks = [],
}: UseTasksProps) {
  const [supabaseClient] = useState(() => initialSupabaseClient || createClient());
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(initialTasks);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "active">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all"); // "all", "today", "important", "completed"

  const isGuest = userProfile?.is_guest ?? user?.email?.endsWith('@auratask.guest') ?? false;

  const loadTasks = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) {
      setLoadingTasks(false);
      return;
    }
    setLoadingTasks(true);
    const { data, error } = await supabaseClient
      .from("tasks_with_counts")
      .select("*")
      .eq("user_id", currentUserId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
      toast({ title: "خطا در بارگیری وظایف", description: error.message, variant: "destructive" });
    } else {
      setTasks(data || []);
    }
    setLoadingTasks(false);
  }, [supabaseClient, toast]);

  useEffect(() => {
    if (user?.id) {
      // Only load if tasks haven't been pre-filled (e.g. by initialTasks)
      // or if the user changes. This logic might need refinement based on how initialTasks is used.
      if (initialTasks.length === 0 || (tasks.length > 0 && tasks[0].user_id !== user.id)) {
         loadTasks(user.id);
      } else if (initialTasks.length > 0 && tasks.length === 0) {
        // If initialTasks were provided but current tasks state is empty (e.g. after a filter reset or user change)
        setTasks(initialTasks);
        setLoadingTasks(false);
      } else {
        // If tasks are already populated (either initial or loaded) and match current user
        setLoadingTasks(false);
      }
    } else {
      setTasks([]); // Clear tasks if no user
      setLoadingTasks(false);
    }
  }, [user?.id, loadTasks, initialTasks]);


  const applyFilters = useCallback(() => {
    let result = [...tasks];
    // Active Tab based filtering
    if (activeTab === "today") {
      result = result.filter(t => t.created_at && new Date(t.created_at).toDateString() === new Date().toDateString());
    } else if (activeTab === "important") {
      result = result.filter(t => (t.importance_score || 0) >= 15); // Example threshold
    } else if (activeTab === "completed") {
      result = result.filter(t => t.completed);
    }
    // Other filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));
    }
    if (filterGroup) result = result.filter(t => t.group_id === filterGroup);
    if (filterStatus === "completed") result = result.filter(t => t.completed);
    else if (filterStatus === "active") result = result.filter(t => !t.completed);
    if (filterPriority === "high") result = result.filter(t => (t.importance_score || 0) >= 15);
    else if (filterPriority === "medium") result = result.filter(t => (t.importance_score || 0) >= 8 && (t.importance_score || 0) < 15);
    else if (filterPriority === "low") result = result.filter(t => (t.importance_score || 0) < 8);

    // Note: filterTag requires tasks to have their tags populated or accessible.
    // tasks_with_counts view does not include full tag objects, only tag_count.
    // This filter might not work as expected unless task objects are enriched with full tags elsewhere,
    // or if filterTag relies on an ID that's directly on the task (which is not typical for many-to-many).
    // For now, assuming task.tags is populated if this filter is used.
    // This will be addressed when integrating with detailedTasks loading.
    if (filterTag && tasks.some(t => t.tags && t.tags.length > 0)) { // Check if tasks even have tags array
       result = result.filter(t => t.tags?.some(tag => tag.id === filterTag));
    }
    setFilteredTasks(result);
  }, [tasks, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user?.id || !supabaseClient) return;
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      const { error } = await supabaseClient.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
      if (error) {
        setTasks(originalTasks);
        toast({ title: "خطا در حذف وظیفه", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "وظیفه حذف شد" });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  }, [user?.id, supabaseClient, tasks, toast]);

  const completeTask = useCallback(async (taskId: string, completed: boolean) => {
    if (!user?.id || !supabaseClient) return;
    const originalTasks = [...tasks];
    const completed_at = completed ? new Date().toISOString() : null;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed, completed_at } : t));
    try {
      const { error } = await supabaseClient.from("tasks").update({ completed, completed_at }).eq("id", taskId).eq("user_id", user.id);
      if (error) {
        setTasks(originalTasks);
        toast({ title: "خطا در تغییر وضعیت وظیفه", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: completed ? "وظیفه تکمیل شد" : "وظیفه به حالت قبل بازگشت" });
    } catch (error) {
      console.error("Error completing task:", error);
    }
  }, [user?.id, supabaseClient, tasks, toast]);

  const handleTaskDropToGroup = useCallback(async (taskId: string, newGroupId: string | null) => {
    if (!user?.id || !supabaseClient) return;
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, group_id: newGroupId } : t));
    try {
      const { error } = await supabaseClient.from("tasks").update({ group_id: newGroupId }).eq("id", taskId).eq("user_id", user.id);
      if (error) {
        setTasks(originalTasks);
        toast({ title: "خطا در انتقال وظیفه", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "وظیفه به‌روزرسانی شد", description: "وظیفه با موفقیت به گروه جدید منتقل شد." });
    } catch (error) {
      console.error("Error updating task group:", error);
    }
  }, [user?.id, supabaseClient, tasks, toast]);

  const reorderTasks = useCallback(async (activeId: string, overId: string | null) => {
    if (!user?.id || !supabaseClient || activeId === overId) return;

    const oldIndex = tasks.findIndex((t) => t.id === activeId);
    // If overId is null, it means we are dropping at the end.
    // If overId is not null, find its index.
    const newPotentialIndex = overId ? tasks.findIndex((t) => t.id === overId) : tasks.length -1;

    if (oldIndex === -1 || (overId && newPotentialIndex === -1) ) return;

    const tempReorderedTasks = arrayMove(tasks, oldIndex, newPotentialIndex);
    const finalNewIndexInTempArray = tempReorderedTasks.findIndex(t => t.id === activeId);

    const prevTask = finalNewIndexInTempArray > 0 ? tempReorderedTasks[finalNewIndexInTempArray - 1] : null;
    const nextTask = finalNewIndexInTempArray < tempReorderedTasks.length - 1 ? tempReorderedTasks[finalNewIndexInTempArray + 1] : null;
    const newOrderIndex = generateFractionalIndex(prevTask?.order_index, nextTask?.order_index);

    // Optimistic update of local state
    const reorderedTasksWithUpdatedIndex = tempReorderedTasks.map(task =>
      task.id === activeId ? { ...task, order_index: newOrderIndex } : task
    );
    // Ensure the local array is sorted by the new order_index for UI consistency
    reorderedTasksWithUpdatedIndex.sort((a, b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0"));
    setTasks(reorderedTasksWithUpdatedIndex);

    try {
      const { error } = await supabaseClient
        .from("tasks")
        .update({ order_index: newOrderIndex })
        .eq("id", activeId)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "خطا در به‌روزرسانی ترتیب وظایف", variant: "destructive", description: error.message });
        // Revert to original order or reload tasks
        loadTasks(user.id); // Reload to ensure consistency
        throw error;
      }
      // toast({ title: "ترتیب وظایف به‌روزرسانی شد" }); // Optional success message
    } catch (error) {
      console.error("Error reordering tasks:", error);
    }
  }, [user?.id, supabaseClient, tasks, toast, loadTasks]);

  const canAddTask = useCallback(() => {
    if (isGuest && tasks.length >= GUEST_TASK_LIMIT) {
      return false;
    }
    return true;
  }, [isGuest, tasks.length]);

  // Realtime subscription for tasks (moved from TaskDashboard)
  useEffect(() => {
    if (!user?.id || !supabaseClient) return;

    const tasksChannel = supabaseClient
      .channel('use-tasks-public-tasks') // Unique channel name for this hook instance
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks_with_counts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task; // tasks_with_counts view items are compatible with Task type
            setTasks(prevTasks => {
              if (prevTasks.find(t => t.id === newTask.id)) return prevTasks; // Already exists
              // Ensure new task also has counts if available from payload, default to 0 if not
              const taskToAdd = {
                ...newTask,
                subtask_count: newTask.subtask_count || 0,
                tag_count: newTask.tag_count || 0,
              };
              return [...prevTasks, taskToAdd].sort((a,b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0"));
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task; // tasks_with_counts view items are compatible with Task type
            setTasks(prevTasks =>
              prevTasks.map(task =>
                task.id === updatedTask.id ? {
                  ...task,
                  ...updatedTask,
                  subtask_count: updatedTask.subtask_count, // Explicitly update subtask_count
                  tag_count: updatedTask.tag_count     // Explicitly update tag_count
                } : task
              ).sort((a,b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0"))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldTaskId = (payload.old as Task).id;
            setTasks(prevTasks => prevTasks.filter(task => task.id !== oldTaskId));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('useTasks: Subscribed to tasks realtime channel');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('useTasks: Tasks channel error/timeout', err);
          toast({ title: "خطای اتصال بی‌درنگ", description: "مشکلی در همگام‌سازی بی‌درنگ وظایف رخ داده است.", variant: "warning" });
        }
      });

    return () => {
      if (tasksChannel) {
        supabaseClient.removeChannel(tasksChannel);
      }
    };
  }, [user?.id, supabaseClient, toast]);


  return {
    tasks, // Raw tasks list
    filteredTasks, // Filtered and sorted tasks for display
    loadingTasks,
    activeDragId,
    setActiveDragId, // For DND context in TaskDashboard

    // Filter states and setters
    searchQuery,
    setSearchQuery,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    filterTag,
    setFilterTag,
    activeTab,
    setActiveTab,

    // Actions
    loadTasks, // Allow manual refresh
    deleteTask,
    completeTask,
    handleTaskDropToGroup,
    reorderTasks,
    canAddTask, // Utility for UI to check guest limit

    // For convenience, also expose a general task setter if needed for complex direct manipulations (use with caution)
    setTasks,
  };
}
