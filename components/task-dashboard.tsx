"use client"
import React, { useEffect, useCallback, useMemo } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js'; // Renamed to avoid conflict with User type
import type { Task, TaskGroup, GuestUser, UserSettings } from '@/types'; // Assuming your types are here

// Import Zustand stores
import { useTaskStore } from '@/stores/taskStore';
import { useGroupStore } from '@/stores/groupStore';
import { useTagStore } from '@/stores/tagStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';

// Import UI Components (ensure paths are correct)
import Header from '@/components/header';
import TaskList from '@/components/task-list';
import AddTaskModal from '@/components/add-task-modal';
import EditTaskModal from '@/components/edit-task-modal';
import SignInPromptModal from '@/components/signin-prompt-modal';
// import ApiKeySetup from '@/components/api-key-setup'; // Replaced by ApiKeySetupModal, ensure it's used from auth
import SettingsPanel from '@/components/settings/settings-panel';
import TagsModal from '@/components/tags-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Search, TagIcon, X, Filter, Calendar, Star, CheckCircle2, LayoutDashboard, Plus } from 'lucide-react';
import StatsDashboard from '@/components/stats-dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, DragEndEvent } from '@dnd-kit/core'; // Removed unused dnd-kit sensors for now
import TaskGroupsBubbles from '@/components/task-groups-bubbles';
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalStorage } from '@/hooks/use-local-storage'; // Keep for guest user ID and sign-in prompt status

interface TaskDashboardProps {
  user: SupabaseUser | null; // Received from page.tsx
}

export default function TaskDashboard({ user }: TaskDashboardProps) {
  const { toast } = useToast();

  // Zustand store selectors
  const tasks = useTaskStore((state) => state.tasks);
  const isLoadingTasks = useTaskStore((state) => state.isLoadingTasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const toggleTaskCompleted = useTaskStore((state) => state.toggleTaskCompleted);
  const setTaskOrder = useTaskStore((state) => state.setTaskOrder);
  const migrateGuestTasks = useTaskStore((state) => state.migrateGuestTasks);
  const clearUserTasks = useTaskStore((state) => state.clearUserTasks);
  const guestTasks = useTaskStore((state) => state.guestTasks); // For migration trigger

  const groups = useGroupStore((state) => state.groups);
  const fetchGroups = useGroupStore((state) => state.fetchGroups);
  const migrateGuestGroups = useGroupStore((state) => state.migrateGuestGroups);
  const clearUserGroups = useGroupStore((state) => state.clearUserGroups);
  const guestGroups = useGroupStore((state) => state.guestGroups); // For migration trigger

  const tags = useTagStore((state) => state.tags);
  const fetchTags = useTagStore((state) => state.fetchTags);
  const migrateGuestTags = useTagStore((state) => state.migrateGuestTags);
  const clearUserTags = useTagStore((state) => state.clearUserTags);
  const guestTags = useTagStore((state) => state.guestTags); // For migration trigger

  const userSettings = useSettingsStore((state) => state.userSettings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const clearSettings = useSettingsStore((state) => state.clearSettings);

  // UI Store states and actions
  // Correctly select all needed state and actions from the store
  // For actions, it's better to select them directly if their references are stable (which they are for Zustand set-based actions)
  const {
    activeTab, searchQuery, filterGroupId, filterStatus, filterPriority, filterTagId,
    isAddTaskModalOpen, isEditTaskModalOpen, taskToEditId,
    isSignInPromptModalOpen, isSettingsPanelOpen, isTagsModalOpen, showFilters
  } = useUIStore((state) => ({
    activeTab: state.activeTab, searchQuery: state.searchQuery, filterGroupId: state.filterGroupId,
    filterStatus: state.filterStatus, filterPriority: state.filterPriority, filterTagId: state.filterTagId,
    isAddTaskModalOpen: state.isAddTaskModalOpen, isEditTaskModalOpen: state.isEditTaskModalOpen,
    taskToEditId: state.taskToEditId, isSignInPromptModalOpen: state.isSignInPromptModalOpen,
    isSettingsPanelOpen: state.isSettingsPanelOpen, isTagsModalOpen: state.isTagsModalOpen,
    showFilters: state.showFilters,
  }));

  // Select actions separately to ensure stable references if needed, or rely on useUIStore.getState() for one-off calls
  const uiSetActiveTab = useUIStore((state) => state.setActiveTab);
  const uiSetSearchQuery = useUIStore((state) => state.setSearchQuery);
  const uiSetFilterGroupId = useUIStore((state) => state.setFilterGroupId);
  // TODO: Add selectors for setFilterStatus, setFilterPriority, setFilterTagId if they exist in uiStore
  const uiOpenAddTaskModal = useUIStore((state) => state.openAddTaskModal);
  const uiCloseAddTaskModal = useUIStore((state) => state.closeAddTaskModal);
  const uiOpenEditTaskModal = useUIStore((state) => state.openEditTaskModal);
  const uiCloseEditTaskModal = useUIStore((state) => state.closeEditTaskModal);
  const uiOpenSignInPromptModal = useUIStore((state) => state.openSignInPromptModal);
  const uiCloseSignInPromptModal = useUIStore((state) => state.closeSignInPromptModal);
  const uiOpenSettingsPanel = useUIStore((state) => state.openSettingsPanel);
  const uiCloseSettingsPanel = useUIStore((state) => state.closeSettingsPanel);
  const uiOpenTagsModal = useUIStore((state) => state.openTagsModal);
  const uiCloseTagsModal = useUIStore((state) => state.closeTagsModal);
  const uiToggleFilters = useUIStore((state) => state.toggleFilters);


  // Local state for guest user ID and sign-in prompt status (not in Zustand)
  const [localGuestUser, setLocalGuestUser] = useLocalStorage<GuestUser | null>("aura-guest-user", null);
  const [guestUser, setGuestUser] = React.useState<GuestUser | null>(null); // Derived from localGuestUser
  const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage("has-shown-signin-prompt", false);
  const [initialLoading, setInitialLoading] = React.useState(true);


  // Initialize guest user if not logged in
  useEffect(() => {
    if (!user && !localGuestUser) {
      const newGuest: GuestUser = { id: uuidv4(), email: `guest_${uuidv4().slice(0,8)}@auratask.local`, created_at: new Date().toISOString() };
      setLocalGuestUser(newGuest);
      setGuestUser(newGuest);
    } else if (!user && localGuestUser) {
      setGuestUser(localGuestUser);
    } else if (user) {
      setGuestUser(null); // Clear guest user if logged in
    }
  }, [user, localGuestUser, setLocalGuestUser]);

  // Data fetching and migration logic
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      if (user) {
        // Clear any local user data from stores first if switching from guest
        clearUserTasks(); clearUserGroups(); clearUserTags();

        await Promise.all([
          fetchSettings(user.id),
          fetchTasks(user.id, null),
          fetchGroups(user.id, null),
          fetchTags(user.id, null),
        ]);

        // Migration logic
        if (guestTasks.length > 0 || guestGroups.length > 0 || guestTags.length > 0) {
          toast({ title: "Migrating guest data...", description: "Please wait." });
          // Create maps for ID conversion during migration (simplified)
          // In a real scenario, group/tag migration would return these maps.
          // For now, this is a placeholder.
          const groupMap: Record<string, string> = {}; // Assume guest group IDs are keys, server group IDs are values
          const tagMap: Record<string, string> = {};   // Assume guest tag IDs are keys, server tag IDs are values

          // This part needs careful orchestration.
          // 1. Migrate groups, get groupMap
          // 2. Migrate tags, get tagMap
          // 3. Migrate tasks with groupMap and tagMap
          // For this conceptual refactor, we call migrateGuestTasks with empty maps.
          // A full implementation would require the actual maps.

          await migrateGuestTasks(user.id, groupMap, tagMap);
          // TODO: Call migrateGuestGroups and migrateGuestTags and use their results (maps)
          // For example:
          // const groupMigrationResult = await migrateGuestGroups(user.id); // Assuming it returns a map
          // const tagMigrationResult = await migrateGuestTags(user.id); // Assuming it returns a map
          // await migrateGuestTasks(user.id, groupMigrationResult.map, tagMigrationResult.map);

          toast({ title: "Guest data migrated!", description: "Your local data is now saved to your account." });
        }

      } else if (guestUser) {
        // For guest, data is loaded from localStorage via Zustand's persist middleware.
        // We just need to trigger the fetch to populate the main 'tasks', 'groups', 'tags' state from 'guestTasks' etc.
        await fetchTasks(null, guestUser);
        await fetchGroups(null, guestUser);
        await fetchTags(null, guestUser);
      }
      setInitialLoading(false);
    };
    loadData();
  }, [user, guestUser, fetchSettings, fetchTasks, fetchGroups, fetchTags, migrateGuestTasks, toast, guestTasks.length, guestGroups.length, guestTags.length, clearUserTasks, clearUserGroups, clearUserTags]); // Added .length for arrays to deps

  // Filtered tasks logic (derived state, memoized)
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (activeTab === "today") { /* TODO: Implement 'today' filter logic */ }
    else if (activeTab === "important") { /* TODO: Implement 'important' filter logic */ }
    else if (activeTab === "completed") { result = result.filter(task => task.completed); }
    else { result = result.filter(task => !task.completed); }

    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        result = result.filter(task =>
            task.title.toLowerCase().includes(lowerQuery) ||
            (task.description && task.description.toLowerCase().includes(lowerQuery))
        );
    }
    if (filterGroupId) { result = result.filter(task => task.group_id === filterGroupId); }
    if (filterStatus === "completed") { result = result.filter(task => task.completed); }
    else if (filterStatus === "active") { result = result.filter(task => !task.completed); }

    // Assuming filterPriority is based on task.priority (number or string)
    if (filterPriority !== "all" && filterPriority !== null) {
      // Example: result = result.filter(task => task.priority === filterPriority);
      // This needs task.priority to exist and match the filter values.
    }
    if (filterTagId) { result = result.filter(task => task.tags?.some(tag => tag.id === filterTagId));}
    return result;
  }, [tasks, activeTab, searchQuery, filterGroupId, filterStatus, filterPriority, filterTagId]);

  // Event Handlers (now using store actions)
  const handleAddTaskClick = useCallback(() => {
    if (!user && !hasShownSignInPrompt && guestTasks.length === 0) {
      uiOpenSignInPromptModal();
      setHasShownSignInPrompt(true);
    } else {
      uiOpenAddTaskModal();
    }
  }, [user, guestTasks.length, hasShownSignInPrompt, setHasShownSignInPrompt, uiOpenSignInPromptModal, uiOpenAddTaskModal]); // Added .length

  const handleEditTaskClick = useCallback((task: Task) => {
    uiOpenEditTaskModal(task.id);
  }, [uiOpenEditTaskModal]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const success = await deleteTask(taskId, user ? user.id : null, guestUser);
    if (success) {
      toast({ title: "Task deleted" });
    } else {
      toast({ title: "Error deleting task", variant: "destructive" });
    }
  }, [deleteTask, user, guestUser, toast]);

  const handleCompleteTask = useCallback(async (taskId: string, completed: boolean) => {
    await toggleTaskCompleted(taskId, completed, user ? user.id : null, guestUser);
  }, [toggleTaskCompleted, user, guestUser]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active.id || !over.id || active.id === over.id) return;

    if (active.data.current?.type === "task") {
        const taskId = active.id as string;
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove) return;

        let newGroupId: string | null = taskToMove.group_id || null;
        let targetOrderIndex: number;

        const tasksInCurrentContext = filteredTasks; // Use filtered tasks for visual consistency of reorder

        if (over.data.current?.type === "group-container" || over.data.current?.type === "group-dropzone") {
            newGroupId = over.id === "ungrouped-dropzone" ? null : over.id as string;
            // Place at the end of the new group (or ungrouped)
            targetOrderIndex = tasks.filter(t => t.group_id === newGroupId && !t.completed).length;
            await useTaskStore.getState().updateTask(taskId, { group_id: newGroupId, order_index: targetOrderIndex }, user?.id || null, guestUser);
            toast({title: "Task group updated"});

        } else if (over.data.current?.type === "task") {
            const overTask = tasks.find(t => t.id === over.id);
            if (!overTask) return;

            newGroupId = overTask.group_id || null; // Task is dropped onto another task, assume same group or new group if different

            const reorderedTasks = Array.from(tasksInCurrentContext);
            const activeIndex = reorderedTasks.findIndex(t => t.id === taskId);
            const overIndex = reorderedTasks.findIndex(t => t.id === over.id);

            if (activeIndex === -1 || overIndex === -1) return;

            const [movedItem] = reorderedTasks.splice(activeIndex, 1);
            reorderedTasks.splice(overIndex, 0, movedItem);

            const updates = reorderedTasks.map((task, index) => ({
                id: task.id,
                order_index: index,
                group_id: newGroupId // Ensure all tasks in this reorder operation get the target group_id
            }));
            await setTaskOrder(updates, user?.id || null, guestUser); // Pass guestUser
            toast({title: "Task order updated"});
        }
    }
    // TODO: Handle group reordering
  };

  const taskToEdit = useMemo(() => tasks.find(t => t.id === taskToEditId), [tasks, taskToEditId]);

  // Loading state UI
  if (initialLoading && !user && !guestUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onSettingsChange={uiOpenSettingsPanel} onSearch={uiSetSearchQuery} />
        <main className="container pt-16 pb-8">
          <Skeleton className="h-9 w-48 mb-3" /> <Skeleton className="h-5 w-32 mb-8" />
          <Skeleton className="h-10 w-full md:w-40 mb-4" />
          <div className="mb-8 flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
          </div>
          <div className="grid gap-4"> {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-20 w-full rounded-lg"/>)} </div>
        </main>
      </div>
    );
  }

  // Main component render
  return (
    <DndContext onDragEnd={handleDragEnd} onDragStart={() => {}} onDragCancel={() => {}}>
      <div className="min-h-screen bg-background">
        <Header user={user} onSettingsChange={uiOpenSettingsPanel} onSearch={uiSetSearchQuery} />
        <main className="container pt-16 pb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {guestUser && !user ? "Hello, Guest" : `Hello${user?.user_metadata?.full_name ? ", " + user.user_metadata.full_name : ""}`}
            </h1>
            <p className="text-muted-foreground">
              {filteredTasks.filter(t => !t.completed).length} tasks pending
            </p>
          </div>

          <Button onClick={handleAddTaskClick} className="mb-4 w-full md:w-auto">
            <Plus className="h-4 w-4 ml-2" /> Add New Task
          </Button>

          <TaskGroupsBubbles
            // groups from store are used internally by TaskGroupsBubbles if it's refactored
            selectedGroupId={filterGroupId} // Corrected prop name
            onSelectGroupId={uiSetFilterGroupId} // Corrected prop name
            // getTaskCountForGroup can be derived if TaskGroupsBubbles has access to taskStore or tasks prop
          />

           <div className="mb-6 space-y-4">
              <Tabs value={activeTab} onValueChange={uiSetActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <TabsList>
                    <TabsTrigger value="all">All Active</TabsTrigger>
                    {/* <TabsTrigger value="today">Today</TabsTrigger> */}
                    {/* <TabsTrigger value="important">Important</TabsTrigger> */}
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={uiOpenTagsModal}><TagIcon className="h-4 w-4" /> Tags</Button>
                     <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={uiToggleFilters}><Filter className="h-4 w-4" /> Filters</Button>
                  </div>
                </div>
                <AnimatePresence>
                {showFilters && (
                    <motion.div className="p-4 border rounded-lg bg-card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        {/* TODO: Implement Filter UI: Input, Selects for group, status, priority, tag */}
                        <p className="text-sm text-muted-foreground">Filter controls will be here.</p>
                    </motion.div>
                )}
                </AnimatePresence>
                <TabsContent value="all">
                    <TaskList tasks={filteredTasks} onEditTask={handleEditTaskClick} onDeleteTask={handleDeleteTask} onCompleteTask={handleCompleteTask} />
                </TabsContent>
                <TabsContent value="today">
                     <TaskList tasks={filteredTasks} onEditTask={handleEditTaskClick} onDeleteTask={handleDeleteTask} onCompleteTask={handleCompleteTask} />
                </TabsContent>
                <TabsContent value="important">
                     <TaskList tasks={filteredTasks} onEditTask={handleEditTaskClick} onDeleteTask={handleDeleteTask} onCompleteTask={handleCompleteTask} />
                </TabsContent>
                <TabsContent value="completed">
                    <TaskList tasks={filteredTasks} onEditTask={handleEditTaskClick} onDeleteTask={handleDeleteTask} onCompleteTask={handleCompleteTask} />
                </TabsContent>
              </Tabs>
           </div>
            <StatsDashboard tasks={tasks} groups={groups} />
        </main>

        {isAddTaskModalOpen && ( <AddTaskModal user={user} guestUser={guestUser} onClose={uiCloseAddTaskModal} /> )}
        {isEditTaskModalOpen && taskToEdit && ( <EditTaskModal user={user} guestUser={guestUser} task={taskToEdit} onClose={uiCloseEditTaskModal} /> )}
        {isSignInPromptModalOpen && <SignInPromptModal onClose={uiCloseSignInPromptModal} onSignIn={() => { /* TODO: handle actual sign in trigger */ }} />}
        {isSettingsPanelOpen && ( <SettingsPanel user={user || guestUser} isOpen={isSettingsPanelOpen} onClose={uiCloseSettingsPanel} /> )}
        {isTagsModalOpen && ( <TagsModal user={user} guestUser={guestUser} onClose={uiCloseTagsModal} /> )}
      </div>
    </DndContext>
  );
}
