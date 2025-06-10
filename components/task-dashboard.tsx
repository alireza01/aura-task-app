"use client"
import React from 'react';

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Task, TaskGroup, UserSettings, Tag, GuestUser } from '@/types'
import Header from '@/components/header'
import TaskList from '@/components/task-list'
// import AddTaskModal from '@/components/add-task-modal' // Removed
// import EditTaskModal from '@/components/edit-task-modal' // Removed
import TaskFormModal from '@/components/tasks/task-form-modal' // Added
import SignInPromptModal from '@/components/signin-prompt-modal'
import ApiKeySetup from '@/components/api-key-setup' // This seems unused, consider removing if not part of a future plan
import SettingsPanel from '@/components/settings/settings-panel'
import TagsModal from '@/components/tags-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { useToast } from '@/components/ui/use-toast'
import { v4 as uuidv4 } from 'uuid'
import { Search, TagIcon, X, Filter, Calendar, Star, CheckCircle2, LayoutDashboard, Plus } from 'lucide-react'
import StatsDashboard from '@/components/stats-dashboard'
import { motion, AnimatePresence } from 'framer-motion'
// import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core' // DndContext seems unused directly here
// import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable' // SortableContext seems unused directly here
// import { CSS } from '@dnd-kit/utilities' // CSS seems unused
// import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers' // Modifiers seem unused
import TaskGroupsBubbles from '@/components/task-groups-bubbles'
import { Skeleton } from "@/components/ui/skeleton"

interface TaskDashboardProps {
  user: User | null;
  guestUser: GuestUser | null;
  initialGroups: TaskGroup[];
  initialTasks: Task[];
  initialTags: Tag[];
  settings: UserSettings | null;
  isApiKeySet: boolean;
}

export default function TaskDashboard({
  user,
  guestUser: initialGuestUserProp,
  initialGroups,
  initialTasks,
  initialTags,
  settings: initialSettingsProp,
  isApiKeySet
}: TaskDashboardProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(initialTasks)
  const [groups, setGroups] = useState<TaskGroup[]>(initialGroups)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [settings, setSettings] = useState<UserSettings | null>(initialSettingsProp)
  const [guestUser, setGuestUser] = useState<GuestUser | null>(initialGuestUserProp)

  // UI State
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  // const [showAddTask, setShowAddTask] = useState(false) // Replaced
  // const [showEditTask, setShowEditTask] = useState(false) // Replaced
  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false); // New combined state
  const [editingTask, setEditingTask] = useState<Task | null>(null); // Renamed from taskToEdit for clarity

  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showApiKeySetup, setShowApiKeySetup] = useState(false) // Retained, though ApiKeySetup component seems unused
  const [showSettings, setShowSettings] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true) // Initial loading state
  // const [isDragging, setIsDragging] = useState(false) // Dnd related, seems unused directly
  // const [activeId, setActiveId] = useState<string | null>(null) // Dnd related, seems unused directly
  const supabaseClient = createClient()

  // Filters
  const [filterGroup, setFilterGroup] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "active">("all")
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all")
  const [filterTag, setFilterTag] = useState<string | null>(null)

  // Local Storage
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", [])
  const [localGroups, setLocalGroups] = useLocalStorage<TaskGroup[]>("aura-groups", [])
  const [localTags, setLocalTags] = useLocalStorage<Tag[]>("aura-tags", [])
  const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage("has-shown-signin-prompt", false)
  const [localGuestUser, setLocalGuestUser] = useLocalStorage<GuestUser | null>("aura-guest-user", null)

  const { toast } = useToast()

  // Initialize guest user if needed
  useEffect(() => {
    if (!user && !localGuestUser) {
      const newGuestUser: GuestUser = {
        id: uuidv4(),
        // email: `guest_${Math.floor(Math.random() * 10000)}@auratask.local`, // Email not needed for guest
        created_at: new Date().toISOString(),
      }
      setLocalGuestUser(newGuestUser)
      setGuestUser(newGuestUser)
    } else if (!user && localGuestUser) {
      setGuestUser(localGuestUser)
    }
  }, [user, localGuestUser, setLocalGuestUser])

  const loadTasks = useCallback(async () => {
    if (!user || !supabaseClient) return;
    setLoading(true);
    const { data } = await supabaseClient
      .from("tasks")
      .select("*, subtasks(*), tags(tags(*))") // Ensure correct join for tags
      .eq("user_id", user.id)
      .order("order_index");
    if (data) {
      const formattedTasks = data.map(task => ({
        ...task,
        tags: task.tags?.map((t: any) => t.tags) || [],
      }));
      setTasks(formattedTasks);
    }
    setLoading(false);
  }, [user, supabaseClient]); // Added supabaseClient to deps

  const loadGroups = useCallback(async () => {
    if (!user || !supabaseClient) return;
    const { data } = await supabaseClient.from("task_groups").select("*").eq("user_id", user.id).order("created_at");
    if (data) setGroups(data);
  }, [user, supabaseClient]); // Added supabaseClient to deps

  const loadTags = useCallback(async () => {
    if (!user || !supabaseClient) return;
    const { data } = await supabaseClient.from("tags").select("*").eq("user_id", user.id).order("name");
    if (data) setTags(data);
  }, [user, supabaseClient]); // Added supabaseClient to deps

  const loadSettings = useCallback(async () => {
    if (!user || !supabaseClient) return;
    // Settings are passed as initialSettingsProp, this might only be needed for refresh
    const { data } = await supabaseClient.from("user_settings").select("*").eq("user_id", user.id).single();
    if (data) {
      setSettings(data);
      // setShowApiKeySetup logic now primarily handled by ApiKeySetupTrigger via app/page.tsx
    } else {
      // setShowApiKeySetup(true); // If no settings, trigger might be needed
    }
  }, [user, supabaseClient]); // Added supabaseClient to deps

  // Initial data load or use props
   useEffect(() => {
    if (user) {
      // Data is passed via props, so direct loading might only be for refresh or specific cases
      // For now, rely on initial props. setLoading(false) if props are primary source.
      setTasks(initialTasks);
      setGroups(initialGroups);
      setTags(initialTags);
      setSettings(initialSettingsProp);
      setGuestUser(initialGuestUserProp);
      setLoading(false); // Assuming props are sufficient for initial load
      // migrateLocalData(); // Call migration if user logs in and local data exists
    } else {
      // Load from local storage for guest
      setTasks(localTasks);
      setGroups(localGroups);
      setTags(localTags);
      setGuestUser(localGuestUser || initialGuestUserProp); // Use local guest if available
      setLoading(false);
    }
  }, [user, initialTasks, initialGroups, initialTags, initialSettingsProp, initialGuestUserProp, localTasks, localGroups, localTags, localGuestUser]);


  // Supabase Realtime Subscription
  useEffect(() => {
    if (!user || !supabaseClient) return;

    const handleDbChange = async () => {
        await loadTasks(); // Could be more specific based on payload
    };

    const tasksChannel = supabaseClient
      .channel("public:tasks_channel") // Unique channel name
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        handleDbChange
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" }, // Needs better filtering if possible
         handleDbChange
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_tags" }, // Needs better filtering
         handleDbChange
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(tasksChannel);
    };
  }, [user, supabaseClient, loadTasks]);

  const applyFilters = useCallback(() => {
    let result = [...tasks];
    if (activeTab === "today") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      result = result.filter((task) => {
        const taskDate = new Date(task.created_at); taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
      });
    } else if (activeTab === "important") {
      result = result.filter((task) => (task.importance_score || 0) >= 15);
    } else if (activeTab === "completed") {
      result = result.filter((task) => task.completed);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) => task.title.toLowerCase().includes(query) || (task.description && task.description.toLowerCase().includes(query)),
      );
    }
    if (filterGroup) result = result.filter((task) => task.group_id === filterGroup);
    if (filterStatus === "completed") result = result.filter((task) => task.completed);
    else if (filterStatus === "active") result = result.filter((task) => !task.completed);
    if (filterPriority === "high") result = result.filter((task) => (task.importance_score || 0) >= 15);
    else if (filterPriority === "medium") {
      result = result.filter((task) => { const score = task.importance_score || 0; return score >= 8 && score < 15; });
    } else if (filterPriority === "low") {
      result = result.filter((task) => (task.importance_score || 0) < 8);
    }
    if (filterTag) result = result.filter((task) => task.tags?.some((tag) => tag.id === filterTag));
    setFilteredTasks(result);
  }, [tasks, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const handleOpenAddTaskModal = useCallback(() => {
    if (!user && !hasShownSignInPrompt && localTasks.length === 0) {
      setShowSignInPrompt(true);
      setHasShownSignInPrompt(true);
    } else {
      setEditingTask(null); // Ensure no task is being edited
      setIsTaskFormModalOpen(true);
    }
  }, [user, hasShownSignInPrompt, localTasks.length, setHasShownSignInPrompt]);

  const handleOpenEditTaskModal = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskFormModalOpen(true);
  }, []);

  const handleCloseTaskFormModal = useCallback(() => {
    setIsTaskFormModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleTaskSaved = useCallback(async () => {
    // This function is called by TaskFormModal after a task is successfully saved (created or updated)
    if (user) {
      await loadTasks(); // Refresh tasks from DB
    } else {
      setTasks([...localTasks]); // Refresh tasks from local storage
    }
    // Groups and tags might also need refreshing if the saved task affected them,
    // but TaskFormModal currently handles direct task/subtask/tag_relations.
    // If TaskFormModal also modified groups/tags directly, call loadGroups/loadTags.
  }, [user, loadTasks, localTasks]);


  const handleDeleteTask = useCallback(async (taskId: string) => {
    const originalTasks = tasks;
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    try {
      if (user && supabaseClient) {
        const { error } = await supabaseClient.from("tasks").delete().eq("id", taskId);
        if (error) throw error;
      } else {
        setLocalTasks(prev => prev.filter((task) => task.id !== taskId));
      }
      toast({ title: "وظیفه حذف شد" });
    } catch (error) {
      console.error("Error deleting task:", error);
      setTasks(originalTasks);
      toast({ title: "خطا در حذف وظیفه", variant: "destructive" });
    }
  }, [user, supabaseClient, tasks, localTasks, setLocalTasks, toast]);

  const completeTask = useCallback(async (taskId: string, completed: boolean) => {
    const originalTasks = tasks;
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task
    );
    setTasks(updatedTasks);
    try {
      if (user && supabaseClient) {
        const { error } = await supabaseClient
          .from("tasks")
          .update({ completed, completed_at: completed ? new Date().toISOString() : null })
          .eq("id", taskId);
        if (error) throw error;
      } else {
         setLocalTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task
        ));
      }
      toast({ title: completed ? "وظیفه تکمیل شد" : "وظیفه به حالت قبل بازگشت" });
    } catch (error) {
      console.error("Error completing task:", error);
      setTasks(originalTasks);
      toast({ title: "خطا در تغییر وضعیت وظیفه", variant: "destructive" });
    }
  }, [user, supabaseClient, tasks, localTasks, setLocalTasks, toast]);

  const handleSettingsChange = useCallback(async () => {
    if (user) await loadSettings();
  }, [user, loadSettings]);

  const handleTagsChange = useCallback(async () => {
    if (user) await loadTags();
    else setTags([...localTags]);
  }, [user, loadTags, localTags]);

  const clearFilters = useCallback(() => {
    setSearchQuery(""); setFilterGroup(null); setFilterStatus("all"); setFilterPriority("all"); setFilterTag(null);
  }, []);

  const handleTaskDropToGroup = useCallback(async (taskId: string, newGroupId: string | null) => {
    const originalTasks = tasks;
    setTasks((prevTasks) => prevTasks.map((task) => task.id === taskId ? { ...task, group_id: newGroupId } : task));
    try {
      if (user && supabaseClient) {
        const { error } = await supabaseClient.from("tasks").update({ group_id: newGroupId }).eq("id", taskId);
        if (error) throw error;
      } else {
        setLocalTasks(prev => prev.map(task => task.id === taskId ? { ...task, group_id: newGroupId } : task));
      }
      toast({ title: "وظیفه به‌روزرسانی شد", description: "وظیفه با موفقیت به گروه جدید منتقل شد." });
    } catch (error) {
      console.error("Error updating task group:", error);
      setTasks(originalTasks);
      toast({ title: "خطا در انتقال وظیفه", variant: "destructive" });
    }
  }, [user, supabaseClient, tasks, localTasks, setLocalTasks, toast]);

  const hasActiveFilters = searchQuery || filterGroup || filterStatus !== "all" || filterPriority !== "all" || filterTag;

  if (loading) {
    // Skeleton UI remains the same
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onSettingsChange={() => setShowSettings(true)} onSearch={setSearchQuery} />
        <main className="container pt-16 pb-8">
          <div className="mb-8"> <Skeleton className="h-9 w-48 mb-3" /> <Skeleton className="h-5 w-32" /> </div>
          <Skeleton className="h-10 w-full md:w-40 mb-4" />
          <div className="mb-8 flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-10 w-24 rounded-full" />))}
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex space-x-1 rtl:space-x-reverse">
                {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-10 w-20 rounded-md" />))}
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24 rounded-md" /> <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-2"> <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-6 w-6 rounded-full" /> </div>
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex items-center justify-between"> <Skeleton className="h-8 w-20 rounded-md" />
                    <div className="flex space-x-2 rtl:space-x-reverse"> <Skeleton className="h-8 w-8 rounded-full" /> <Skeleton className="h-8 w-8 rounded-full" /> </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block space-y-4"> <Skeleton className="h-64 w-full rounded-lg" /> <Skeleton className="h-32 w-full rounded-lg" /> </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onSettingsChange={() => setShowSettings(true)} onSearch={setSearchQuery} />
      <main className="container pt-16 pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {guestUser && !user ? "سلام، مهمان" : `سلام${user?.user_metadata?.name ? "، " + user.user_metadata.name : ""}`}
          </h1>
          <p className="text-muted-foreground"> {filteredTasks.filter((t) => !t.completed).length} وظیفه در انتظار انجام </p>
        </div>
        <Button onClick={handleOpenAddTaskModal} className="mb-4 w-full md:w-auto">
          <Plus className="h-4 w-4 ml-2" /> افزودن وظیفه جدید
        </Button>
        {!loading && groups.length === 0 ? (
          <div className="text-center py-12 my-8 bg-muted/20 rounded-lg">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.688 4.156a2.25 2.25 0 0 1-2.25-2.25V15M11 19.5h1.258c1.28 0 2.501-.422 3.502-1.186A2.25 2.25 0 0 0 18 16.5v-3a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25v3.75m0 0A2.25 2.25 0 0 1 9.75 18h-3a2.25 2.25 0 0 1-2.25-2.25V15m0 0A2.25 2.25 0 0 0 6.75 12.75h3" />
                </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">به نظر می‌رسد هنوز گروهی ایجاد نکرده‌اید!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              گروه‌ها به شما کمک می‌کنند تا وظایف خود را بهتر سازماندهی کنید. با کلیک بر روی دکمه افزودن گروه در نوار گروه‌ها شروع کنید.
            </p>
            <TaskGroupsBubbles
              user={user} guestUser={guestUser} groups={groups} selectedGroup={filterGroup}
              onGroupSelect={setFilterGroup} onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
              onTaskDrop={handleTaskDropToGroup}
              getTaskCountForGroup={(groupId) => tasks.filter((t) => t.group_id === groupId && !t.completed).length}
            />
            {tasks.length > 0 && (<p className="text-sm text-muted-foreground mt-4"> وظایف بدون گروه شما در لیست اصلی نمایش داده می‌شوند. </p>)}
          </div>
        ) : (
          <>
            <TaskGroupsBubbles
              user={user} guestUser={guestUser} groups={groups} selectedGroup={filterGroup}
              onGroupSelect={setFilterGroup} onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
              onTaskDrop={handleTaskDropToGroup}
              getTaskCountForGroup={(groupId) => tasks.filter((t) => t.group_id === groupId && !t.completed).length}
            />
            <div className="mb-6 space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="all" className="data-[state=active]:bg-background"> <LayoutDashboard className="h-4 w-4 mr-1" /> همه </TabsTrigger>
                    <TabsTrigger value="today" className="data-[state=active]:bg-background"> <Calendar className="h-4 w-4 mr-1" /> امروز </TabsTrigger>
                    <TabsTrigger value="important" className="data-[state=active]:bg-background"> <Star className="h-4 w-4 mr-1" /> مهم </TabsTrigger>
                    <TabsTrigger value="completed" className="data-[state=active]:bg-background"> <CheckCircle2 className="h-4 w-4 mr-1" /> تکمیل شده </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowTags(true)}> <TagIcon className="h-4 w-4" /> <span className="hidden md:inline">برچسب‌ها</span> </Button>
                    <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="gap-1" onClick={() => setShowFilters(!showFilters)}> <Filter className="h-4 w-4" /> <span className="hidden md:inline">فیلترها</span> </Button>
                  </div>
                </div>
                <AnimatePresence>
                  {showFilters && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                      <div className="bg-muted/30 rounded-lg p-4 mb-4">
                        <div className="flex flex-wrap gap-3">
                          <div className="relative flex-1 min-w-[200px]"> <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> <Input type="search" placeholder="جستجو..." className="pr-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> </div>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]" value={filterGroup || ""} onChange={(e) => setFilterGroup(e.target.value || null)}> <option value="">همه گروه‌ها</option> {groups.map((group) => (<option key={group.id} value={group.id}> {group.emoji} {group.name} </option>))} </select>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}> <option value="all">همه وضعیت‌ها</option> <option value="active">در انتظار انجام</option> <option value="completed">تکمیل شده</option> </select>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}> <option value="all">همه اولویت‌ها</option> <option value="high">اولویت بالا</option> <option value="medium">اولویت متوسط</option> <option value="low">اولویت پایین</option> </select>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]" value={filterTag || ""} onChange={(e) => setFilterTag(e.target.value || null)}> <option value="">همه برچسب‌ها</option> {tags.map((tag) => (<option key={tag.id} value={tag.id}> {tag.name} </option>))} </select>
                          {hasActiveFilters && (<Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"> <X className="h-4 w-4" /> پاک کردن فیلترها </Button>)}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <TabsContent value="all" className="mt-0"> {activeTab === "all" && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> <div className="lg:col-span-2"> <TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={user ? loadTasks : () => setTasks([...localTasks])} onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])} onEditTask={handleOpenEditTaskModal} onDeleteTask={handleDeleteTask} onComplete={completeTask} /> </div> <div className="hidden lg:block"> <StatsDashboard tasks={tasks} /> </div> </div>)} </TabsContent>
                <TabsContent value="today" className="mt-0"> <TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={user ? loadTasks : () => setTasks([...localTasks])} onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])} onEditTask={handleOpenEditTaskModal} onDeleteTask={handleDeleteTask} onComplete={completeTask} /> </TabsContent>
                <TabsContent value="important" className="mt-0"> <TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={user ? loadTasks : () => setTasks([...localTasks])} onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])} onEditTask={handleOpenEditTaskModal} onDeleteTask={handleDeleteTask} onComplete={completeTask} /> </TabsContent>
                <TabsContent value="completed" className="mt-0"> <TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={user ? loadTasks : () => setTasks([...localTasks])} onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])} onEditTask={handleOpenEditTaskModal} onDeleteTask={handleDeleteTask} onComplete={completeTask} /> </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </main>
      {isTaskFormModalOpen && (
        <TaskFormModal
          user={user}
          guestUser={guestUser}
          groups={groups}
          tags={tags}
          settings={settings}
          isApiKeySet={isApiKeySet}
          taskToEdit={editingTask}
          onClose={handleCloseTaskFormModal}
          onTaskSaved={handleTaskSaved}
          // initialTitle might be needed if adding from a specific context, pass if available
        />
      )}
      {showSignInPrompt && (<SignInPromptModal onClose={() => setShowSignInPrompt(false)} onSignIn={() => { /* Potentially trigger user data load or redirect */ setShowSignInPrompt(false); }} />)}
      {user && showApiKeySetup && (<ApiKeySetup onComplete={() => setShowApiKeySetup(false)} onSkip={() => setShowApiKeySetup(false)} />)}
      {showSettings && (<SettingsPanel user={user || guestUser} settings={settings} isApiKeySet={isApiKeySet} isOpen={showSettings} onClose={() => setShowSettings(false)} onSettingsChange={handleSettingsChange} />)}
      {showTags && (<TagsModal user={user} guestUser={guestUser} tags={tags} onClose={() => setShowTags(false)} onTagsChange={handleTagsChange} />)}
    </div>
  )
}
