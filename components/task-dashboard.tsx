"use client";
import React, { useState, useEffect, useCallback } from 'react'; // useMemo removed
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, Task, TaskGroup, UserSettings, Tag, UserProfile, Subtask } from '@/types'; // Subtask added
import Header from '@/components/header';
import TaskList from '@/components/task-list';
import TaskFormModal from '@/components/tasks/task-form-modal';
import SignInPromptModal from '@/components/signin-prompt-modal';
import ApiKeySetup from '@/components/api-key-setup';
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useTasks } from '@/hooks/use-tasks';
import { useGroups } from '@/hooks/use-groups';
import { useTags } from '@/hooks/use-tags';

interface TaskDashboardProps {
  user: User | null;
}

// const GUEST_TASK_LIMIT = 5; // Now within useTasks

export default function TaskDashboard({ user: initialUser }: TaskDashboardProps) {
  const [supabaseClient] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(initialUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Instantiate hooks
  const {
    tasks, // Raw tasks from useTasks
    filteredTasks,
    loadingTasks,
    activeDragId,
    setActiveDragId,
    searchQuery, setSearchQuery,
    filterGroup, setFilterGroup,
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,
    filterTag, setFilterTag,
    activeTab, setActiveTab,
    deleteTask,
    completeTask,
    handleTaskDropToGroup,
    reorderTasks,
    canAddTask,
    setTasks: setTasksDirectly, // For specific cases like detail invalidation
  } = useTasks({ user, userProfile, initialSupabaseClient: supabaseClient });

  const {
    groups,
    loadingGroups,
    setGroups: setGroupsDirectly,
    // addGroup, updateGroup, deleteGroup // expose if forms are handled here
  } = useGroups({ user, initialSupabaseClient: supabaseClient });

  const {
    tags,
    loadingTags,
    setTags: setTagsDirectly,
    // addTag, updateTag, deleteGroup // expose if forms are handled here
  } = useTags({ user, initialSupabaseClient: supabaseClient });

  // UI State not handled by hooks
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add');
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false); // Renamed
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const [detailedTasks, setDetailedTasks] = useState<Record<string, { subtasks: Subtask[], tags: Tag[] }>>({});
  const [loadingTaskDetails, setLoadingTaskDetails] = useState<Record<string, boolean>>({});

  const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage("has-shown-signin-prompt", false);

  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // isGuestUser useCallback is removed as its logic is simple and can be inlined or is handled by userProfile.is_guest

  const loadUserProfile = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) {
      setUserProfile(null); // Clear profile if no user ID
      return;
    }
    const { data, error } = await supabaseClient.from("user_profiles").select("*").eq("user_id", currentUserId).single();
    if (data) setUserProfile(data);
    else {
      setUserProfile(null);
      console.error("Error loading user profile or profile not found:", error?.message);
    }
  }, [supabaseClient]);

   const loadTaskDetails = useCallback(async (taskId: string) => {
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

  const loadSettings = useCallback(async (currentUserId: string, currentUser: User | null, currentProfile: UserProfile | null) => {
    if (!currentUserId || !supabaseClient) {
      setSettings(null); // Clear settings if no user ID
      return;
    }
    const { data } = await supabaseClient.from("user_settings").select("*").eq("user_id", currentUserId).single();
    if (data) {
      setSettings(data);
      // isGuestUser check can be done directly using profile and user objects
      const guest = currentProfile?.is_guest ?? currentUser?.email?.endsWith('@auratask.guest') ?? false;
      if (!guest && !data.gemini_api_key) {
        setShowApiKeySetup(true);
      } else {
        setShowApiKeySetup(false);
      }
    } else {
      const guest = currentProfile?.is_guest ?? currentUser?.email?.endsWith('@auratask.guest') ?? false;
      if (!guest) {
        setShowApiKeySetup(true);
      }
      setSettings(null);
    }
  }, [supabaseClient]); // Removed isGuestUser from deps, as it's effectively inlined

  // Refactored loadUserData: Now primarily loads profile and settings.
  // Hooks (useTasks, useGroups, useTags) handle their own data loading via useEffect on `user`.
  const loadUserData = useCallback(async (userIdToLoad: string, currentUser: User | null) => {
    if (!userIdToLoad) {
      setDashboardLoading(false); // No user to load, stop dashboard loading.
      return;
    }
    setDashboardLoading(true);
    await loadUserProfile(userIdToLoad);
    // Fetch profile again to ensure it's the latest for loadSettings, as loadUserProfile sets state asynchronously
    const { data: profileData } = await supabaseClient.from("user_profiles").select("*").eq("user_id", userIdToLoad).single();
    await loadSettings(userIdToLoad, currentUser, profileData);
    setDashboardLoading(false);
  }, [loadUserProfile, loadSettings, supabaseClient]);

  // Effect for handling initial user or session changes
  useEffect(() => {
    setUser(initialUser); // Set user from prop first
    if (!initialUser) { // If no initial user (e.g. direct navigation, not from auth redirect)
      const checkSession = async () => {
        setDashboardLoading(true);
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          setUser(session.user); // This will trigger the next useEffect to load data
        } else {
          setUser(null); // Ensure user is null if no session
          setDashboardLoading(false); // No user, stop loading
        }
      };
      checkSession();
    }
  }, [initialUser, supabaseClient]);

  // Effect for loading data when user object is definitively set or changed
  useEffect(() => {
    if (user?.id && user.id !== loadedUserId) {
      // Clear old user-specific data
      setUserProfile(null);
      setSettings(null);
      setDetailedTasks({});
      // Hooks will also react to user change and reload/reset their data.

      loadUserData(user.id, user);
      setLoadedUserId(user.id);
    } else if (!user && loadedUserId) { // User logged out
      setUserProfile(null);
      setSettings(null);
      setDetailedTasks({});
      setLoadedUserId(null);
      setDashboardLoading(false); // Not loading data for a logged-out state
      // Hooks will clear their data as user becomes null.
    } else if (!user && !loadedUserId) { // Initial state, no user, not previously loaded
        setDashboardLoading(false);
    }
    // If user.id === loadedUserId, data should already be loaded or loading by hooks.
  }, [user, loadUserData, loadedUserId]);

  // Combined loading state for overall page skeleton
  const overallLoading = dashboardLoading || loadingTasks || loadingGroups || loadingTags;

  // Guest Conversion Handler - Remains largely the same
   useEffect(() => {
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const newAuthUser = session.user;
          // Check sessionStorage for guest conversion flag
          if (sessionStorage.getItem('guest_conversion_attempt') === 'true') {
            sessionStorage.removeItem('guest_conversion_attempt');

            // At this point, userProfile might be stale (from the previous guest session).
            // We need to ensure it's the profile of the user *before* they signed in as registered.
            // The `userProfile` state should ideally be the one loaded for the guest.

            // Condition 1: The new user email is NOT a guest email.
            const isNewUserEmailGuest = newAuthUser.email?.endsWith('@auratask.guest');

            // Condition 2: The current userProfile in state *is* marked as guest.
            // This implies the profile hasn't updated yet from the auth change.
            const isStaleProfileMarkedAsGuest = userProfile?.is_guest === true;

            // console.log("Guest conversion check:", {
            //   newAuthUserEmail: newAuthUser.email,
            //   isNewUserEmailGuest,
            //   userProfileIsGuest: userProfile?.is_guest, // This is the stale profile's state
            //   currentProfileUserId: userProfile?.user_id, // Stale profile's user_id
            //   newAuthUserId: newAuthUser.id // ID of the (potentially) newly registered user
            // });

            // The crucial part is that the API call will use the newAuthUser.id (implicitly via session)
            // to update the correct user_profiles record. The client-side check here is mostly
            // to ensure we *should* be making this call (i.e., user was guest, now isn't).
            if (!isNewUserEmailGuest && isStaleProfileMarkedAsGuest) {
              // console.log("Conditions met for calling /api/user/set-registered based on new email and stale guest profile state.");
              try {
                const response = await fetch('/api/user/set-registered', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // Body can be empty or include user_id if your API needs it,
                  // but RLS should handle it based on the authenticated user making the request.
                });
                const result = await response.json();
                if (response.ok && result.success) {
                  // console.log('Successfully marked user as registered via API.');
                  // Refresh user profile to get is_guest: false
                  loadUserProfile(newAuthUser.id);
                } else {
                  console.error('Failed to mark user as registered:', result.error);
                  toast({ title: "خطا", description: "مشکلی در تکمیل ثبت نام رخ داد.", variant: "destructive" });
                }
              } catch (error) {
                console.error('Error calling /api/user/set-registered:', error);
                toast({ title: "خطا", description: "خطای شبکه در تکمیل ثبت نام.", variant: "destructive" });
              }
            } else {
              // console.log("Conditions for guest conversion API call not fully met or profile already updated.");
            }
          }
        } else if (event === "SIGNED_OUT") {
          // Clear user-related state if needed, though the main user effect should handle this.
          // setUser(null);
          // setUserProfile(null);
          // setTasks([]); setGroups([]); setTags([]); setSettings(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  // userProfile is a dependency because we are checking its state (is_guest)
  // loadUserProfile is a dependency because we call it.
  }, [supabaseClient, userProfile, loadUserProfile, toast]);


  // Effect to show nickname modal
  useEffect(() => {
    if (user && userProfile && !userProfile.has_set_nickname && !userProfile.is_guest) {
      // Double check it's not a guest account by email pattern as a safeguard
      const isLikelyGuestByEmail = user.email?.endsWith('@auratask.guest');
      if (!isLikelyGuestByEmail) {
        setShowNicknameModal(true);
      }
    } else {
      setShowNicknameModal(false);
    }
  }, [user, userProfile]);

  // Realtime subscriptions for profile, settings, and detailed task data (subtasks/task_tags)
  // Main tasks, groups, tags realtime updates are handled within their respective hooks.
  useEffect(() => {
    if (!user?.id || !supabaseClient) return;

    const channels: SupabaseClient['channels'] = [];

    // User Profiles subscription
    const userProfileChannel = supabaseClient
      .channel('dashboard-user-profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${user.id}` },
        (payload) => setUserProfile(prev => ({ ...prev, ...(payload.new as UserProfile) }))
      )
      .subscribe();
    channels.push(userProfileChannel);

    // User Settings subscription
    const userSettingsChannel = supabaseClient
      .channel('dashboard-user-settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
        (payload) => setSettings(prev => ({ ...prev, ...(payload.new as UserSettings) }))
      )
      .subscribe();
    channels.push(userSettingsChannel);

    // Subtasks changes (for invalidating detailedTasks and updating counts on main tasks)
    const subtaskChangesChannel = supabaseClient
      .channel('dashboard-all-subtasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' },
        (payload) => {
          const changedSubtask = (payload.new || payload.old) as Subtask;
          if (changedSubtask?.task_id) {
            // Invalidate detailed view if open
            if (detailedTasks[changedSubtask.task_id]) {
              setDetailedTasks(prev => {
                const newDetailed = { ...prev };
                delete newDetailed[changedSubtask.task_id!];
                return newDetailed;
              });
            }
            // Update count on main task object via setTasksDirectly from useTasks
            setTasksDirectly(prevTasks => prevTasks.map(t => {
              if (t.id === changedSubtask.task_id) {
                let newCount = t.subtask_count || 0;
                if (payload.eventType === 'INSERT') newCount++;
                else if (payload.eventType === 'DELETE') newCount = Math.max(0, newCount - 1);
                return { ...t, subtask_count: newCount };
              }
              return t;
            }));
          }
        }
      ).subscribe();
    channels.push(subtaskChangesChannel);

    // Task Tags changes (for invalidating detailedTasks and updating counts)
    const taskTagsChangesChannel = supabaseClient
      .channel('dashboard-all-task-tags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' },
      (payload: any) => {
        const taskId = payload.new?.task_id || payload.old?.task_id;
        if (taskId) {
           if (detailedTasks[taskId]) {
              setDetailedTasks(prev => {
                const newDetailed = { ...prev };
                delete newDetailed[taskId];
                return newDetailed;
              });
            }
          setTasksDirectly(prevTasks => prevTasks.map(t => {
            if (t.id === taskId) {
              let newCount = t.tag_count || 0;
              if (payload.eventType === 'INSERT') newCount++;
              else if (payload.eventType === 'DELETE') newCount = Math.max(0, newCount - 1);
              return { ...t, tag_count: newCount };
            }
            return t;
          }));
        }
      }
    ).subscribe();
    channels.push(taskTagsChangesChannel);

    return () => {
      channels.forEach(c => supabaseClient.removeChannel(c));
    };
  }, [user?.id, supabaseClient, detailedTasks, setTasksDirectly]);


  const handleAddTask = useCallback(() => {
    if (!canAddTask()) {
      setShowSignInPrompt(true);
      setHasShownSignInPrompt(true);
    } else {
      setTaskToEdit(null);
      setTaskModalMode('add');
      setTaskModalOpen(true);
    }
  }, [canAddTask, setHasShownSignInPrompt]); // Simplified dependencies

  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task);
    setTaskModalMode('edit');
    setTaskModalOpen(true);
  }, []);

  const handleTaskSavedInModal = () => {
    setTaskModalOpen(false);
    setTaskToEdit(null);
    // Data refresh is handled by useTasks hook's realtime subscription
  };

  const handleSettingsChange = useCallback(() => {
    if (user?.id && userProfile) loadSettings(user.id, user, userProfile);
  }, [user, userProfile, loadSettings]);

  const handleTagsModalClose = () => {
    setShowTagsModal(false);
    // Data refresh is handled by useTags hook
  };

  const handleGroupsChangeInBubbles = () => {
    // This function might not be needed anymore if its only purpose was to trigger group reload.
    // Groups are updated by useGroups hook via its realtime subscription or CRUD actions.
  };

  const clearTaskFilters = useCallback(() => {
    setSearchQuery("");
    setFilterGroup(null);
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterTag(null);
    // Optionally reset activeTab: setActiveTab("all");
  }, [setSearchQuery, setFilterGroup, setFilterStatus, setFilterPriority, setFilterTag]); // Dependencies are setters from useTasks

  const handleDndDragEnd = async (event: DragEndEvent) => { // Renamed to avoid conflict if old one was still there
    const { active, over } = event;
    if (active.id && over?.id && active.id !== over.id) {
      // Assuming only tasks are draggable for now
      await reorderTasks(active.id as string, over.id as string);
    }
    setActiveDragId(null);
  };

  const handleDndDragStart = (event: any) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDndDragCancel = () => {
    setActiveDragId(null);
  };

  const hasActiveTaskFilters = searchQuery || filterGroup || filterStatus !== "all" || filterPriority !== "all" || filterTag;

  // Skeleton loading condition
  if (overallLoading && !userProfile && (!user || user === initialUser)) {
     return ( /* Skeleton UI remains the same */
      <div className="min-h-screen bg-background">
        <Header user={null} userProfile={null} onSettingsChange={() => setShowSettings(true)} onSearch={setSearchQuery} searchValue={searchQuery}/>
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

  return (
    <DndContext sensors={sensors} onDragStart={handleDndDragStart} onDragEnd={handleDndDragEnd} onDragCancel={handleDndDragCancel}>
      <div className="min-h-screen bg-background">
        <Header user={user} userProfile={userProfile} onSettingsChange={() => setShowSettings(true)} onSearch={setSearchQuery} searchValue={searchQuery} />
        <main className="container pt-16 pb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              سلام{userProfile?.nickname ? `، ${userProfile.nickname}` :
                   (userProfile && !userProfile.is_guest && user?.user_metadata?.name) ? `، ${user.user_metadata.name}` :
                   (userProfile && !userProfile.is_guest && user?.email) ? `، ${user.email.split('@')[0]}` :
                   (userProfile?.is_guest) ? "، مهمان" : ""}
            </h1>
            <p className="text-muted-foreground">{filteredTasks.filter(t => !t.completed).length} وظیفه در انتظار انجام</p>
          </div>
          <Button onClick={handleAddTask} className="mb-4 w-full md:w-auto"><Plus className="h-4 w-4 ml-2" /> افزودن وظیفه جدید</Button>
          {!overallLoading && groups.length === 0 && tasks.length === 0 ? (
            <div className="text-center py-12 my-8 bg-muted/20 rounded-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.688 4.156a2.25 2.25 0 0 1-2.25-2.25V15M11 19.5h1.258c1.28 0 2.501-.422 3.502-1.186A2.25 2.25 0 0 0 18 16.5v-3a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25v3.75m0 0A2.25 2.25 0 0 1 9.75 18h-3a2.25 2.25 0 0 1-2.25-2.25V15m0 0A2.25 2.25 0 0 0 6.75 12.75h3" /></svg></div>
              <h3 className="text-xl font-semibold text-foreground mb-3">شروع کنید!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">با ایجاد یک گروه یا افزودن اولین وظیفه، کار خود را سازماندهی کنید.</p>
              <TaskGroupsBubbles user={user} groups={groups} selectedGroup={filterGroup} onGroupSelect={setFilterGroup} onGroupsChange={handleGroupsChangeInBubbles} onTaskDrop={handleTaskDropToGroup} getTaskCountForGroup={(groupId) => tasks.filter(t => t.group_id === groupId && !t.completed).length} />
            </div>
          ) : (
            <>
              <TaskGroupsBubbles user={user} groups={groups} selectedGroup={filterGroup} onGroupSelect={setFilterGroup} onGroupsChange={handleGroupsChangeInBubbles} onTaskDrop={handleTaskDropToGroup} getTaskCountForGroup={(groupId) => tasks.filter(t => t.group_id === groupId && !t.completed).length} />
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
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowTagsModal(true)}><TagIcon className="h-4 w-4" /><span className="hidden md:inline">برچسب‌ها</span></Button>
                      <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="gap-1" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4" /><span className="hidden md:inline">فیلترها</span></Button>
                    </div>
                  </div>
                  <AnimatePresence>{showFilters && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}><div className="bg-muted/30 rounded-lg p-4 mb-4"><div className="flex flex-wrap gap-3"><div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="جستجو..." className="pr-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterGroup || ""} onChange={(e) => setFilterGroup(e.target.value || null)}><option value="">همه گروه‌ها</option>{groups.map((group) => (<option key={group.id} value={group.id}>{group.emoji} {group.name}</option>))}</select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}><option value="all">همه وضعیت‌ها</option><option value="active">در انتظار انجام</option><option value="completed">تکمیل شده</option></select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}><option value="all">همه اولویت‌ها</option><option value="high">اولویت بالا</option><option value="medium">اولویت متوسط</option><option value="low">اولویت پایین</option></select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterTag || ""} onChange={(e) => setFilterTag(e.target.value || null)}><option value="">همه برچسب‌ها</option>{tags.map((tag) => (<option key={tag.id} value={tag.id}>{tag.name}</option>))}</select>{hasActiveTaskFilters && (<Button variant="ghost" size="sm" onClick={clearTaskFilters} className="gap-1"><X className="h-4 w-4" />پاک کردن فیلترها</Button>)}</div></div></motion.div>)}</AnimatePresence>
                  <TabsContent value="all" className="mt-0">{activeTab === "all" && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={() => {}} onGroupsChange={() => {}} onEditTask={handleEditTask} onDeleteTask={deleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></div><div className="hidden lg:block"><StatsDashboard tasks={tasks} /></div></div>)}</TabsContent>
                  <TabsContent value="today" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={() => {}} onGroupsChange={() => {}} onEditTask={handleEditTask} onDeleteTask={deleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></TabsContent>
                  <TabsContent value="important" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={() => {}} onGroupsChange={() => {}} onEditTask={handleEditTask} onDeleteTask={deleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></TabsContent>
                  <TabsContent value="completed" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={() => {}} onGroupsChange={() => {}} onEditTask={handleEditTask} onDeleteTask={deleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} loadingTaskDetails={loadingTaskDetails} /></TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </main>
        {/* Consolidated TaskFormModal */}
        <TaskFormModal
          user={user}
          // guestUser prop will be removed from TaskFormModal itself in a later step
          guestUser={null} // Passing null as guestUser prop will be removed from TaskFormModal
          groups={groups}
          tags={tags}
          settings={settings}
          isOpen={taskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            setTaskToEdit(null);
          }}
          onTaskSaved={handleTaskSavedInModal}
          taskToEdit={taskToEdit}
        />
        {showSignInPrompt && (<SignInPromptModal onClose={() => setShowSignInPrompt(false)} onSignIn={() => { setShowSignInPrompt(false);}} />)}
        {user && showApiKeySetup && (<ApiKeySetup onComplete={() => {setShowApiKeySetup(false); if(user?.id && userProfile) loadSettings(user.id, user, userProfile);}} onSkip={() => setShowApiKeySetup(false)} />)}
        {showSettings && (<SettingsPanel user={user} profile={userProfile} settings={settings} isOpen={showSettings} onClose={() => setShowSettings(false)} onSettingsChange={handleSettingsChange} />)}
        {showTagsModal && (<TagsModal user={user} tags={tags} onClose={handleTagsModalClose} onTagsChange={() => { /* Realtime/hook handles updates */ }} />)}
        {showNicknameModal && userProfile && user && !userProfile.is_guest && (
          <NicknameSetupModal
            isOpen={showNicknameModal}
            onClose={() => setShowNicknameModal(false)}
            currentNickname={userProfile.nickname}
            userId={user.id}
            onNicknameSet={() => {
              if(user?.id) loadUserProfile(user.id);
              setShowNicknameModal(false);
            }}
          />
        )}
      </div>
    </DndContext>
  );
}
