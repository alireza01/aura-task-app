"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // useMemo removed
import { supabase } from '@/lib/supabase/client'; // Import the supabase instance
import type { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import type { Task, Tag, Subtask, UserSettings } from '@/types'; // Removed unused types, kept UserSettings for reconstruction
import Header from '@/components/header';
import TaskList from '@/components/task-list';
import TaskFormModal from '@/components/tasks/task-form-modal';
import SignInPromptModal from '@/components/signin-prompt-modal';
import ApiKeySetup from '@/components/auth/api-key-setup-modal';
import SettingsPanel from '@/components/settings/settings-panel';
import TagsModal from '@/components/tags-modal';
import NicknameSetupModal from '@/components/auth/nickname-setup-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Input might be used by Header or filter controls
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
// import { v4 as uuidv4 } from 'uuid'; // Moved to hooks if needed
import { Search, TagIcon, X, Filter, Calendar, Star, CheckCircle2, LayoutDashboard, Plus } from 'lucide-react';
import StatsDashboard from '@/components/stats-dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
// arrayMove, generateFractionalIndex are in useTasks
import TaskGroupsBubbles from '@/components/task-groups-bubbles';
import { Skeleton } from "@/components/ui/skeleton";
// Old hooks (useTasks, useGroups, useTags) will be removed.
import { useAppStore } from '@/lib/store'; // Import the main Zustand store

interface TaskDashboardProps {
  // user: User | null; // This will come from the store
}

export default function TaskDashboard({ /* user: initialUser */ }: TaskDashboardProps) {
  const [supabaseClient] = useState<SupabaseClient>(() => supabase); // Use the imported instance and type

  // Auth State from Store
  const { user, userProfile, isInitialized: authIsInitialized, isLoadingAuth } = useAppStore(state => ({
    user: state.user,
    userProfile: state.userProfile,
    isInitialized: state.isInitialized,
    isLoadingAuth: state.isLoadingAuth,
  }));

  // Tasks State & Actions from Store
  const {
    tasks: tasks_raw,
    loadingTasks,
    searchQuery,
    filterGroup,
    filterStatus,
    filterPriority,
    filterTag,
    activeTab,
  } = useAppStore(state => ({
    tasks: state.tasks,
    loadingTasks: state.loadingTasks,
    activeDragId: state.activeDragId,
    searchQuery: state.searchQuery,
    filterGroup: state.filterGroup,
    filterStatus: state.filterStatus,
    filterPriority: state.filterPriority,
    filterTag: state.filterTag,
    activeTab: state.activeTab,
  }));

  // Memoize filtered tasks to prevent infinite updates
  const filteredTasks = useMemo(() => {
    const store = useAppStore.getState();
    return store.getFilteredTasks();
  }, [tasks_raw, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab]);

  // Memoize task counts to prevent unnecessary recalculations
  const taskCounts = useMemo(() => ({
    pending: filteredTasks.filter(t => !t.completed).length,
    total: filteredTasks.length
  }), [filteredTasks]);

  const {
    setActiveDragId,
    setSearchQuery,
    setFilterGroup,
    setFilterStatus,
    setFilterPriority,
    setFilterTag,
    setActiveTab,
    deleteTask: storeDeleteTask,
    completeTask: storeCompleteTask,
    handleTaskDropToGroup: storeHandleTaskDropToGroup,
    reorderTasks: storeReorderTasks,
    canAddTask: canAddTaskSelector,
  } = useAppStore(state => ({
    setActiveDragId: state.setActiveDragId,
    setSearchQuery: state.setSearchQuery,
    setFilterGroup: state.setFilterGroup,
    setFilterStatus: state.setFilterStatus,
    setFilterPriority: state.setFilterPriority,
    setFilterTag: state.setFilterTag,
    setActiveTab: state.setActiveTab,
    deleteTask: state.deleteTask,
    completeTask: state.completeTask,
    handleTaskDropToGroup: state.handleTaskDropToGroup,
    reorderTasks: state.reorderTasks,
    canAddTask: state.canAddTask,
  }));

  // Groups State from Store
  const { groups, loadingGroups } = useAppStore(state => ({
    groups: state.groups,
    loadingGroups: state.loadingGroups,
  }));

  // Tags State from Store
  const { tags, loadingTags } = useAppStore(state => ({
    tags: state.tags,
    loadingTags: state.loadingTags,
  }));

  // Settings State from Store
  const {
    theme: storeTheme,
    apiKey: storeApiKey,
    speed_weight,
    importance_weight,
    auto_ranking,
    auto_subtasks,
    auto_tagging,
  } = useAppStore(state => ({
    theme: state.theme,
    apiKey: state.apiKey,
    speed_weight: state.speed_weight,
    importance_weight: state.importance_weight,
    auto_ranking: state.auto_ranking,
    auto_subtasks: state.auto_subtasks,
    auto_tagging: state.auto_tagging,
  }));

  // Construct a complete UserSettings object for child components
  const settingsForChildren: UserSettings = {
    id: user?.id || 'default', // Placeholder, actual ID comes from DB
    user_id: user?.id || 'default', // Placeholder, actual ID comes from DB
    gemini_api_key: storeApiKey || undefined, // Pass masked key or undefined
    speed_weight: speed_weight,
    importance_weight: importance_weight,
    auto_ranking: auto_ranking,
    auto_subtasks: auto_subtasks,
    auto_tagging: auto_tagging,
    theme: storeTheme as "default" | "alireza" | "neda", // Cast to specific theme type
    created_at: new Date().toISOString(), // Placeholder
    updated_at: new Date().toISOString(), // Placeholder
  };


  // UI State & Actions from Store
  const {
    isTaskModalOpen,
    taskModalMode,
    taskToEdit,
    isSettingsPanelOpen,
    isTagsModalOpen,
    isSignInPromptOpen,
    isApiKeySetupModalOpen,
    isNicknameModalOpen,
    showFilters: storeShowFilters, // Renamed to avoid conflict
  } = useAppStore(state => ({
    isTaskModalOpen: state.isTaskModalOpen,
    taskModalMode: state.taskModalMode,
    taskToEdit: state.taskToEdit,
    isSettingsPanelOpen: state.isSettingsPanelOpen,
    isTagsModalOpen: state.isTagsModalOpen,
    isSignInPromptOpen: state.isSignInPromptOpen,
    isApiKeySetupModalOpen: state.isApiKeySetupModalOpen,
    isNicknameModalOpen: state.isNicknameModalOpen,
    showFilters: state.showFilters,
  }));

  const {
    openTaskModal,
    closeTaskModal,
    toggleTagsModal,
    openSignInPrompt,
    closeSignInPrompt,
    openApiKeySetupModal,
    closeApiKeySetupModal,
    openNicknameModal,
    closeNicknameModal,
    toggleShowFilters,
    toggleSettingsPanel,
  } = useAppStore(state => ({
    openTaskModal: state.openTaskModal,
    closeTaskModal: state.closeTaskModal,
    toggleTagsModal: state.toggleTagsModal,
    openSignInPrompt: state.openSignInPrompt,
    closeSignInPrompt: state.closeSignInPrompt,
    openApiKeySetupModal: state.openApiKeySetupModal,
    closeApiKeySetupModal: state.closeApiKeySetupModal,
    openNicknameModal: state.openNicknameModal,
    closeNicknameModal: state.closeNicknameModal,
    toggleShowFilters: state.toggleShowFilters,
    toggleSettingsPanel: state.toggleSettingsPanel,
  }));


  // Local state that remains for now (e.g. details not in global store)
  const [detailedTasks, setDetailedTasks] = useState<Record<string, { subtasks: Subtask[], tags: Tag[] }>>({});
  const [loadingTaskDetails, setLoadingTaskDetails] = useState<Record<string, boolean>>({});

  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));


   const loadTaskDetails = useCallback(async (taskId: string) => {
    // This logic remains as it's for task-specific details not in global store
    if (!supabaseClient || detailedTasks[taskId]) return;
    setLoadingTaskDetails(prev => ({ ...prev, [taskId]: true }));
    try {
      const { data: subtasksData, error: subtasksError } = await supabaseClient
        .from("subtasks").select("*").eq("task_id", taskId).order("order_index", { ascending: true });
      if (subtasksError) throw subtasksError;

      const { data: taskTagsData, error: taskTagsError } = await supabaseClient
        .from("task_tags").select("tags(*)").eq("task_id", taskId);
      if (taskTagsError) throw taskTagsError;

      const fetchedTagsFromDetails: Tag[] = taskTagsData ? taskTagsData.map((tt: any) => tt.tags).filter(Boolean) as Tag[] : [];
      setDetailedTasks(prev => ({ ...prev, [taskId]: { subtasks: subtasksData || [], tags: fetchedTagsFromDetails } }));
    } catch (error) {
      console.error(`Error loading task details for ${taskId}:`, error);
      toast({ title: "خطا در بارگیری جزئیات وظیفه", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoadingTaskDetails(prev => ({ ...prev, [taskId]: false }));
    }
  }, [supabaseClient, detailedTasks, toast]);


  // REMOVED: loadUserProfile, loadSettings, loadUserData, initialUser useEffect, user data loading useEffect
  // These are now handled by slices and AppInitializer


  // Combined loading state for overall page skeleton
  // Initial check: if auth isn't initialized and we don't have a profile yet, show skeleton.
  // This is simpler than the previous `overallLoading` which tracked individual hook loadings.
  const initialPageLoading = (!authIsInitialized || isLoadingAuth) && !userProfile;


  // REMOVED: Guest Conversion Handler useEffect - This logic should be in authSlice or AppInitializer
  // REMOVED: Realtime subscriptions for profile, settings - This is handled by slices

  // Effect to show nickname modal - uses store state
  useEffect(() => {
    if (user && userProfile && !userProfile.has_set_nickname && !userProfile.is_guest) {
      const isLikelyGuestByEmail = user.email?.endsWith('@auratask.guest');
      if (!isLikelyGuestByEmail) {
        openNicknameModal();
      }
    } else {
      // Ensure modal is closed if conditions are not met (e.g., profile updates)
      // This might need to be more nuanced depending on how openNicknameModal interacts
      // with existing state. If openNicknameModal(false) is not a thing, this is fine.
      // closeNicknameModal(); // Assuming this action exists and is idempotent
    }
  }, [user, userProfile, openNicknameModal, closeNicknameModal]); // Added closeNicknameModal


  // Effect to show API key setup modal - uses store state
  const isGuest = userProfile?.is_guest ?? user?.email?.endsWith('@auratask.guest') ?? false;
  useEffect(() => {
    if (!isGuest && user && userProfile && !storeApiKey) { // Check storeApiKey (masked or null)
      openApiKeySetupModal();
    } else {
      // closeApiKeySetupModal(); // Might be too aggressive, only close if explicitly not needed.
    }
  }, [user, userProfile, storeApiKey, openApiKeySetupModal, closeApiKeySetupModal, isGuest]);


  const handleAddTask = useCallback(() => {
    if (!canAddTaskSelector()) { // Use selector from store
      openSignInPrompt(); // Use action from store
    } else {
      openTaskModal('add'); // Use action from store
    }
  }, [canAddTaskSelector, openSignInPrompt, openTaskModal]);

  const handleEditTask = useCallback((task: Task) => {
    openTaskModal('edit', task); // Use action from store
  }, [openTaskModal]);

  const handleTaskSavedInModal = () => {
    closeTaskModal(); // Use action from store
    // Data refresh is handled by tasksSlice realtime subscription or optimistic updates
  };


  const handleGroupsChangeInBubbles = () => {
    // No longer needed, group data is reactive from the store
  };

  const clearTaskFilters = useCallback(() => {
    setSearchQuery("");
    setFilterGroup(null);
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterTag(null);
    // Optionally reset activeTab: setActiveTab("all");
  }, [setSearchQuery, setFilterGroup, setFilterStatus, setFilterPriority, setFilterTag]);

  const handleDndDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id && over?.id && active.id !== over.id) {
      await storeReorderTasks(active.id as string, over.id as string); // Use action from store
    }
    setActiveDragId(null); // Use action from store
  };

  const handleDndDragStart = (event: any) => {
    setActiveDragId(event.active.id as string); // Use action from store
  };

  const handleDndDragCancel = () => {
    setActiveDragId(null); // Use action from store
  };

  const hasActiveTaskFilters = searchQuery || filterGroup || filterStatus !== "all" || filterPriority !== "all" || filterTag;

  // Skeleton loading condition
  if (initialPageLoading) {
     return ( /* Skeleton UI remains the same */
      <div className="min-h-screen bg-background">
        <Header user={null} userProfile={null} onSettingsChange={toggleSettingsPanel} onSearch={setSearchQuery} searchValue={searchQuery}/>
        <main className="container pt-16 pb-8">
          <div className="mb-8"><Skeleton className="h-9 w-48 mb-3" /><Skeleton className="h-5 w-32" /></div>
          <Skeleton className="h-10 w-full md:w-40 mb-4" />
          <div className="mb-8 flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-2">{[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-10 w-24 rounded-full" />))}<Skeleton className="h-10 w-10 rounded-full" /></div>
          <div className="mb-6 space-y-4"><div className="flex items-center justify-between mb-2"><div className="flex space-x-1 rtl:space-x-reverse">{[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-10 w-20 rounded-md" />))}</div><div className="flex items-center gap-2"><Skeleton className="h-9 w-24 rounded-md" /><Skeleton className="h-9 w-24 rounded-md" /></div></div></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="p-4 border rounded-lg bg-muted/20"><div className="flex items-center justify-between mb-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-6 rounded-full" /></div><Skeleton className="h-4 w-1/2 mb-3" /><div className="flex items-center justify-between"><Skeleton className="h-8 w-20 rounded-md" /><div className="flex space-x-2 rtl:space-x-reverse"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></div></div>))}</div><div className="hidden lg:block space-y-4"><Skeleton className="h-64 w-full rounded-lg" /><Skeleton className="h-32 w-full rounded-lg" /></div></div>
        </main>
      </div>
    );
  }

  // Determine overall loading state for content after initial skeleton
  const contentLoading = loadingTasks || loadingGroups || loadingTags;


  return (
    <DndContext sensors={sensors} onDragStart={handleDndDragStart} onDragEnd={handleDndDragEnd} onDragCancel={handleDndDragCancel}>
      <div className="min-h-screen bg-background">
        <Header user={user} userProfile={userProfile} onSettingsChange={toggleSettingsPanel} onSearch={setSearchQuery} searchValue={searchQuery} />
        <main className="container pt-16 pb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              سلام{userProfile?.nickname ? `، ${userProfile.nickname}` :
                   (userProfile && !userProfile.is_guest && user?.user_metadata?.name) ? `، ${user.user_metadata.name}` :
                   (userProfile && !userProfile.is_guest && user?.email) ? `، ${user.email.split('@')[0]}` :
                   (userProfile?.is_guest) ? "، مهمان" : ""}
            </h1>
            <p className="text-muted-foreground">{taskCounts.pending} وظیفه در انتظار انجام</p>
          </div>
          <Button onClick={handleAddTask} className="mb-4 w-full md:w-auto"><Plus className="h-4 w-4 ml-2" /> افزودن وظیفه جدید</Button>
          {/* Use contentLoading for subsequent loading states, not initialPageLoading */}
          {!authIsInitialized && !userProfile ? ( <p>بارگذاری اولیه...</p> ) :
           !contentLoading && groups.length === 0 && tasks_raw.length === 0 && authIsInitialized ? (
            <div className="text-center py-12 my-8 bg-muted/20 rounded-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.688 4.156a2.25 2.25 0 0 1-2.25-2.25V15M11 19.5h1.258c1.28 0 2.501-.422 3.502-1.186A2.25 2.25 0 0 0 18 16.5v-3a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25v3.75m0 0A2.25 2.25 0 0 1 9.75 18h-3a2.25 2.25 0 0 1-2.25-2.25V15m0 0A2.25 2.25 0 0 0 6.75 12.75h3" /></svg></div>
              <h3 className="text-xl font-semibold text-foreground mb-3">شروع کنید!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">با ایجاد یک گروه یا افزودن اولین وظیفه، کار خود را سازماندهی کنید.</p>
              <TaskGroupsBubbles user={user} groups={groups} selectedGroup={filterGroup} onGroupSelect={setFilterGroup} onGroupsChange={handleGroupsChangeInBubbles} onTaskDrop={storeHandleTaskDropToGroup} getTaskCountForGroup={(groupId) => tasks_raw.filter(t => t.group_id === groupId && !t.completed).length} />
            </div>
          ) : (
            <>
              <TaskGroupsBubbles user={user} groups={groups} selectedGroup={filterGroup} onGroupSelect={setFilterGroup} onGroupsChange={handleGroupsChangeInBubbles} onTaskDrop={storeHandleTaskDropToGroup} getTaskCountForGroup={(groupId) => tasks_raw.filter(t => t.group_id === groupId && !t.completed).length} />
              <div className="mb-6 space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <TabsList className="bg-muted/50">
                      <TabsTrigger value="all" className="data-[state=active]:bg-background"><LayoutDashboard className="h-4 w-4 mr-1" />همه</TabsTrigger>
                      <TabsTrigger value="today" className="data-[state=active]:bg-background"><Calendar className="h-4 w-4 mr-1" />امروز</TabsTrigger>
                      <TabsTrigger value="important" className="data-[state=active]:bg-background"><Star className="h-4 w-4 mr-1" />مهم</TabsTrigger>
                      <TabsTrigger value="completed" className="data-[state=active]:bg-background"><CheckCircle2 className="h-4 w-4 mr-1" />تکمیل شده</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={toggleTagsModal}><TagIcon className="h-4 w-4" /><span className="hidden md:inline">برچسب‌ها</span></Button>
                      <Button variant={storeShowFilters ? "secondary" : "outline"} size="sm" className="gap-1" onClick={toggleShowFilters}><Filter className="h-4 w-4" /><span className="hidden md:inline">فیلترها</span></Button>
                    </div>
                  </div>
                  <AnimatePresence>{storeShowFilters && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}><div className="bg-muted/30 rounded-lg p-4 mb-4"><div className="flex flex-wrap gap-3"><div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="جستجو..." className="pr-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterGroup || ""} onChange={(e) => setFilterGroup(e.target.value || null)}><option value="">همه گروه‌ها</option>{groups.map((group) => (<option key={group.id} value={group.id}>{group.emoji} {group.name}</option>))}</select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}><option value="all">همه وضعیت‌ها</option><option value="active">در انتظار انجام</option><option value="completed">تکمیل شده</option></select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}><option value="all">همه اولویت‌ها</option><option value="high">اولویت بالا</option><option value="medium">اولویت متوسط</option><option value="low">اولویت پایین</option></select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterTag || ""} onChange={(e) => setFilterTag(e.target.value || null)}><option value="">همه برچسب‌ها</option>{tags.map((tag) => (<option key={tag.id} value={tag.id}>{tag.name}</option>))}</select>{hasActiveTaskFilters && (<Button variant="ghost" size="sm" onClick={clearTaskFilters} className="gap-1"><X className="h-4 w-4" />پاک کردن فیلترها</Button>)}</div></div></motion.div>)}</AnimatePresence>
                  <TabsContent value="all" className="mt-0">{activeTab === "all" && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><TaskList tasks={filteredTasks} groups={groups} onTasksChange={() => {}} onEditTask={handleEditTask} onDeleteTask={storeDeleteTask} onComplete={storeCompleteTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></div><div className="hidden lg:block"><StatsDashboard tasks={tasks_raw} /></div></div>)}</TabsContent>
                  <TabsContent value="today" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} onTasksChange={() => {}} onEditTask={handleEditTask} onDeleteTask={storeDeleteTask} onComplete={storeCompleteTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></TabsContent>
                  <TabsContent value="important" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} onTasksChange={() => {}} onEditTask={handleEditTask} onDeleteTask={storeDeleteTask} onComplete={storeCompleteTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></TabsContent>
                  <TabsContent value="completed" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} onTasksChange={() => {}} onEditTask={handleEditTask} onDeleteTask={storeDeleteTask} onComplete={storeCompleteTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </main>
        <TaskFormModal
          user={user}
          groups={groups}
          tags={tags}
          settings={settingsForChildren} // Pass constructed settings
          isOpen={isTaskModalOpen}
          onClose={closeTaskModal}
          onTaskSaved={handleTaskSavedInModal}
          taskToEdit={taskToEdit} // This comes from uiSlice via useAppStore
          mode={taskModalMode} // This also comes from uiSlice
        />
        {isSignInPromptOpen && (<SignInPromptModal onClose={closeSignInPrompt} onSignIn={() => { closeSignInPrompt();}} />)}
        {user && isApiKeySetupModalOpen && (<ApiKeySetup user={user} isOpen={isApiKeySetupModalOpen} onComplete={() => {closeApiKeySetupModal(); useAppStore.getState().loadInitialSettings(user.id);}} onSkip={closeApiKeySetupModal} />)}
        {isSettingsPanelOpen && (<SettingsPanel user={user} profile={userProfile} settings={settingsForChildren} isOpen={isSettingsPanelOpen} onClose={toggleSettingsPanel} onSettingsChange={() => useAppStore.getState().loadInitialSettings(user?.id)} />)}
        {isTagsModalOpen && (<TagsModal tags={tags} onClose={toggleTagsModal} onTagsChange={() => { /* Realtime/slice handles updates */ }} />)}
        {isNicknameModalOpen && userProfile && user && !userProfile.is_guest && (
          <NicknameSetupModal
            isOpen={isNicknameModalOpen}
            onClose={closeNicknameModal}
            currentNickname={userProfile.nickname}
            userId={user.id}
            onNicknameSet={() => {
              useAppStore.getState().loadUserProfile(user.id); // Call action from authSlice
              closeNicknameModal();
            }}
          />
        )}
      </div>
    </DndContext>
  );
}
