"use client"
import React from 'react';

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User, Task, TaskGroup, UserSettings, Tag, GuestUser } from '@/types'
import Header from '@/components/header'
import TaskList from '@/components/task-list'
import AddTaskModal from '@/components/add-task-modal'
import EditTaskModal from '@/components/edit-task-modal'
import SignInPromptModal from '@/components/signin-prompt-modal'
import ApiKeySetup from '@/components/api-key-setup'
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
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import TaskGroupsBubbles from '@/components/task-groups-bubbles'

interface TaskDashboardProps {
  user: User | null
}

export default function TaskDashboard({ user }: TaskDashboardProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [groups, setGroups] = useState<TaskGroup[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null)

  // UI State
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showApiKeySetup, setShowApiKeySetup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

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

  // Drag and Drop Functionality
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
    setIsDragging(true)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return // No valid drop target

    if (active.data.current?.type === "group" && active.id !== over.id) {
      // Reorder groups
      const oldIndex = groups.findIndex((group) => group.id === active.id)
      const newIndex = groups.findIndex((group) => group.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newGroups = arrayMove(groups, oldIndex, newIndex)
        setGroups(newGroups)
        // TODO: Persist group order to Supabase if needed
      }
    } else if (active.data.current?.type === "task") {
      const taskId = active.id as string;
      const overId = over.id as string;
      const currentTask = tasks.find((t) => t.id === taskId);
      const overTask = tasks.find((t) => t.id === overId);

      if (!currentTask || !overTask) return;

      const oldGroupId = currentTask.group_id;
      let newGroupId: string | null = overTask.group_id || null;

      // Determine if dropping onto a group bubble
      if (over.data.current?.type === "group-container") {
        newGroupId = over.id as string;
      }

      // Case 1: Reordering within the same group
      if (oldGroupId === newGroupId) {
        const tasksInGroup = tasks
          .filter((t) => t.group_id === oldGroupId)
          .sort((a, b) => a.order_index - b.order_index);

        const oldIndex = tasksInGroup.findIndex((t) => t.id === taskId);
        const newIndex = tasksInGroup.findIndex((t) => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(tasksInGroup, oldIndex, newIndex);

          // Update order_index for all affected tasks in Supabase
          const updates = reorderedTasks.map((task, index) => ({
            id: task.id,
            order_index: index,
          }));

          try {
            // Optimistic update
            setTasks((prev) => {
              const updatedPrev = [...prev];
              updates.forEach(update => {
                const taskIndex = updatedPrev.findIndex(t => t.id === update.id);
                if (taskIndex !== -1) {
                  updatedPrev[taskIndex] = { ...updatedPrev[taskIndex], order_index: update.order_index };
                }
              });
              return updatedPrev;
            });

            const { error } = await supabase.from("tasks").upsert(updates);
            if (error) throw error;
            toast({ title: "وظیفه به‌روزرسانی شد", description: "ترتیب وظایف با موفقیت به‌روزرسانی شد." });
            await loadTasks(); // Re-fetch to ensure consistency
          } catch (error) {
            console.error("Error reordering tasks:", error);
            toast({ title: "خطا در جابجایی وظیفه", description: "مشکلی در جابجایی وظیفه رخ داد.", variant: "destructive" });
            await loadTasks(); // Revert by re-fetching
          }
        }
      } else {
        // Case 2: Moving to a different group (or from ungrouped to grouped, or vice versa)
        // This logic is for moving tasks between groups/ungrouped.
        // When moving to a new group, place it at the end of that group.
        const tasksInNewGroup = tasks.filter(t => t.group_id === newGroupId && t.id !== taskId);
        const newOrderIndex = tasksInNewGroup.length; // Place at the end

        try {
          // Optimistic update
          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, group_id: newGroupId, order_index: newOrderIndex } : task
            )
          );

          const { error } = await supabase
            .from("tasks")
            .update({ group_id: newGroupId, order_index: newOrderIndex })
            .eq("id", taskId);
          if (error) throw error;
          toast({ title: "وظیفه به‌روزرسانی شد", description: "وظیفه با موفقیت به گروه جدید منتقل شد." });
          await loadTasks(); // Re-fetch to ensure consistency
        } catch (error) {
          console.error("Error updating task group:", error);
          toast({ title: "خطا در انتقال وظیفه", description: "مشکلی در انتقال وظیفه به گروه جدید رخ داد.", variant: "destructive" });
          await loadTasks(); // Revert by re-fetching
        }
      }
    }

    setActiveId(null)
    setIsDragging(false)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setIsDragging(false)
  }

  // Initialize guest user if needed
  useEffect(() => {
    if (!user && !localGuestUser) {
      const newGuestUser: GuestUser = {
        id: uuidv4(),
        email: `guest_${Math.floor(Math.random() * 10000)}@auratask.local`,
        created_at: new Date().toISOString(),
      }
      setLocalGuestUser(newGuestUser)
      setGuestUser(newGuestUser)
    } else if (!user && localGuestUser) {
      setGuestUser(localGuestUser)
    }
  }, [user, localGuestUser, setLocalGuestUser])

  const loadTasks = useCallback(async () => {
    if (!user) return

    const { data } = await supabase
      .from("tasks")
      .select(`
        *,
        subtasks(*),
        tags(*)
      `)
      .eq("user_id", user.id)
      .order("order_index")

    if (data) setTasks(data)
  }, [user])

  const loadGroups = useCallback(async () => {
    if (!user) return

    const { data } = await supabase.from("task_groups").select("*").eq("user_id", user.id).order("created_at")

    if (data) setGroups(data)
  }, [user])

  const loadTags = useCallback(async () => {
    if (!user) return

    const { data } = await supabase.from("tags").select("*").eq("user_id", user.id).order("name")

    if (data) setTags(data)
  }, [user])

  const loadSettings = useCallback(async () => {
    if (!user) return

    const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

    if (data) {
      setSettings(data)
      if (!data.gemini_api_key) {
        setShowApiKeySetup(true)
      }
    } else {
      setShowApiKeySetup(true)
    }
  }, [user])

  const loadUserData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    await Promise.all([loadTasks(), loadGroups(), loadTags(), loadSettings()])
    setLoading(false)
  }, [user, loadTasks, loadGroups, loadSettings])

  const migrateLocalData = useCallback(async () => {
    if (!user || localTasks.length === 0) return

    try {
      // Migrate groups first
      const groupMigrationMap: { [key: string]: string } = {}

      for (const localGroup of localGroups) {
        const { data: newGroup } = await supabase
          .from("task_groups")
          .insert({
            user_id: user.id,
            name: localGroup.name,
            emoji: localGroup.emoji,
          })
          .select()
          .single()

        if (newGroup) {
          groupMigrationMap[localGroup.id] = newGroup.id
        }
      }

      // Migrate tags
      const tagMigrationMap: { [key: string]: string } = {}

      for (const localTag of localTags) {
        const { data: newTag } = await supabase
          .from("tags")
          .insert({
            user_id: user.id,
            name: localTag.name,
            color: localTag.color,
          })
          .select()
          .single()

        if (newTag) {
          tagMigrationMap[localTag.id] = newTag.id
        }
      }

      // Migrate tasks
      for (const localTask of localTasks) {
        const newGroupId = localTask.group_id ? groupMigrationMap[localTask.group_id] : null

        const { data: newTask } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: localTask.title,
            description: localTask.description,
            group_id: newGroupId,
            speed_score: localTask.speed_score,
            importance_score: localTask.importance_score,
            emoji: localTask.emoji,
            order_index: localTask.order_index,
            completed: localTask.completed,
          })
          .select()
          .single()

        if (newTask && localTask.subtasks?.length) {
          // Migrate subtasks
          const subtaskInserts = localTask.subtasks.map((subtask) => ({
            task_id: newTask.id,
            title: subtask.title,
            completed: subtask.completed,
            completed_at: subtask.completed_at,
            order_index: subtask.order_index,
          }))

          await supabase.from("subtasks").insert(subtaskInserts)
        }

        if (newTask && localTask.tags?.length) {
          // Create task-tag relationships
          for (const tag of localTask.tags) {
            if (tagMigrationMap[tag.id]) {
              await supabase.from("task_tags").insert({
                task_id: newTask.id,
                tag_id: tagMigrationMap[tag.id],
              })
            }
          }
        }
      }

      // Clear local storage after successful migration
      setLocalTasks([])
      setLocalGroups([])
      setLocalTags([])

      toast({
        title: "انتقال موفقیت‌آمیز",
        description: "تمام وظایف شما با موفقیت به حساب کاربری منتقل شدند.",
      })

      // Reload data
      await loadUserData()
    } catch (error) {
      console.error("خطا در انتقال داده‌ها:", error)
      toast({
        title: "خطا در انتقال داده‌ها",
        description: "مشکلی در انتقال وظایف به حساب کاربری رخ داد.",
        variant: "destructive",
      })
    }
  }, [user, localTasks, localGroups, localTags, toast, loadUserData])

  // Load data based on user status
  useEffect(() => {
    if (user) {
      loadUserData()
      migrateLocalData()
    } else {
      // Load from local storage
      setTasks(localTasks)
      setGroups(localGroups)
      setTags(localTags)
      setLoading(false)
    }
  }, [user, localTasks, localGroups, localTags, loadUserData, migrateLocalData])

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!user) return

    const tasksChannel = supabase
      .channel("public:tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prevTasks) => [...prevTasks, payload.new as Task])
          } else if (payload.eventType === "UPDATE") {
            setTasks((prevTasks) =>
              prevTasks.map((task) => (task.id === payload.old.id ? (payload.new as Task) : task)),
            )
          } else if (payload.eventType === "DELETE") {
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    const subtasksChannel = supabase
      .channel("public:subtasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" }, // Subtasks don't have user_id, need to filter by task_id later if needed
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            // Re-fetch tasks to ensure subtasks are updated correctly
            // A more granular update could be implemented, but re-fetching is simpler for now
            await loadTasks()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(subtasksChannel)
    }
  }, [user, loadTasks])

  const applyFilters = useCallback(() => {
    let result = [...tasks]

    // Apply tab filter
    if (activeTab === "today") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      result = result.filter((task) => {
        const taskDate = new Date(task.created_at)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === today.getTime()
      })
    } else if (activeTab === "important") {
      result = result.filter((task) => (task.importance_score || 0) >= 15)
    } else if (activeTab === "completed") {
      result = result.filter((task) => task.completed)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)),
      )
    }

    // Apply group filter
    if (filterGroup) {
      result = result.filter((task) => task.group_id === filterGroup)
    }

    // Apply status filter
    if (filterStatus === "completed") {
      result = result.filter((task) => task.completed)
    } else if (filterStatus === "active") {
      result = result.filter((task) => !task.completed)
    }

    // Apply priority filter
    if (filterPriority === "high") {
      result = result.filter((task) => (task.importance_score || 0) >= 15)
    } else if (filterPriority === "medium") {
      result = result.filter((task) => {
        const score = task.importance_score || 0
        return score >= 8 && score < 15
      })
    } else if (filterPriority === "low") {
      result = result.filter((task) => (task.importance_score || 0) < 8)
    }

    // Apply tag filter
    if (filterTag) {
      result = result.filter((task) => task.tags?.some((tag) => tag.id === filterTag))
    }

    setFilteredTasks(result)
  }, [tasks, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab])

  // Apply filters whenever tasks or filter criteria change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])


  const handleAddTask = useCallback(() => {
    if (!user && !hasShownSignInPrompt && localTasks.length === 0) {
      setShowSignInPrompt(true)
      setHasShownSignInPrompt(true)
    } else {
      setShowAddTask(true)
    }
  }, [user, hasShownSignInPrompt, localTasks.length, setHasShownSignInPrompt])

  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task)
    setShowEditTask(true)
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    // Optimistic update
    const originalTasks = tasks
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId))
    setFilteredTasks((prevFilteredTasks) => prevFilteredTasks.filter((task) => task.id !== taskId))

    try {
      if (user) {
        const { error } = await supabase.from("tasks").delete().eq("id", taskId)
        if (error) throw error
      } else {
        const updatedTasks = localTasks.filter((task) => task.id !== taskId)
        setLocalTasks(updatedTasks)
      }
      toast({
        title: "وظیفه حذف شد",
        description: "وظیفه مورد نظر با موفقیت حذف شد.",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      setTasks(originalTasks) // Revert on error
      setFilteredTasks(originalTasks) // Revert on error
      toast({
        title: "خطا در حذف وظیفه",
        description: "مشکلی در حذف وظیفه رخ داد.",
        variant: "destructive",
      })
    }
  }, [user, tasks, localTasks, setLocalTasks, toast])

  const completeTask = useCallback(async (taskId: string, completed: boolean) => {
    // Optimistic update
    const originalTasks = tasks
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task)),
    )
    setFilteredTasks((prevFilteredTasks) =>
      prevFilteredTasks.map((task) => (task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task)),
    )

    try {
      if (user) {
        const { error } = await supabase
          .from("tasks")
          .update({ completed, completed_at: completed ? new Date().toISOString() : null })
          .eq("id", taskId)
        if (error) throw error
      } else {
        const updatedTasks = localTasks.map((task) =>
          task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task,
        )
        setLocalTasks(updatedTasks)
      }
      toast({
        title: completed ? "وظیفه تکمیل شد" : "وظیفه به حالت قبل بازگشت",
        description: completed ? "وظیفه با موفقیت تکمیل شد." : "وضعیت وظیفه به حالت قبل بازگشت.",
      })
    } catch (error) {
      console.error("Error completing task:", error)
      setTasks(originalTasks) // Revert on error
      setFilteredTasks(originalTasks) // Revert on error
      toast({
        title: "خطا در تغییر وضعیت وظیفه",
        description: "مشکلی در تغییر وضعیت وظیفه رخ داد.",
        variant: "destructive",
      })
    }
  }, [user, tasks, localTasks, setLocalTasks, toast])

  const handleTaskAdded = useCallback(async () => {
    if (user) {
      await loadTasks() // Realtime will handle this, but keep for initial load consistency
    } else {
      setTasks([...localTasks])
    }
  }, [user, loadTasks, localTasks])

  const handleSettingsChange = useCallback(() => {
    if (user) {
      loadSettings()
    }
  }, [user, loadSettings])

  const handleTagsChange = useCallback(() => {
    if (user) {
      loadTags()
    } else {
      setTags([...localTags])
    }
  }, [user, loadTags, localTags])

  const clearFilters = useCallback(() => {
    setSearchQuery("")
    setFilterGroup(null)
    setFilterStatus("all")
    setFilterPriority("all")
    setFilterTag(null)
  }, [])
const handleTaskDropToGroup = useCallback(async (taskId: string, newGroupId: string | null) => {
    const originalTasks = tasks;
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, group_id: newGroupId } : task
      )
    );

    try {
      if (user) {
        const { error } = await supabase
          .from("tasks")
          .update({ group_id: newGroupId })
          .eq("id", taskId);
        if (error) throw error;
      } else {
        const updatedTasks = localTasks.map((task) =>
          task.id === taskId ? { ...task, group_id: newGroupId } : task
        );
        setLocalTasks(updatedTasks);
      }
      toast({
        title: "وظیفه به‌روزرسانی شد",
        description: "وظیفه با موفقیت به گروه جدید منتقل شد.",
      });
    } catch (error) {
      console.error("Error updating task group:", error);
      setTasks(originalTasks); // Revert on error
      toast({
        title: "خطا در انتقال وظیفه",
        description: "مشکلی در انتقال وظیفه به گروه جدید رخ داد.",
        variant: "destructive",
      });
    }
  }, [user, tasks, localTasks, setLocalTasks, toast]);

  const hasActiveFilters = searchQuery || filterGroup || filterStatus !== "all" || filterPriority !== "all" || filterTag

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="loading-dots flex justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <div className="w-3 h-3 bg-primary rounded-full"></div>
          </div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onSettingsChange={() => setShowSettings(true)}
        onSearch={setSearchQuery}
      />

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {guestUser && !user
              ? "سلام، مهمان"
              : `سلام${user?.user_metadata?.name ? "، " + user.user_metadata.name : ""}`}
          </h1>
          <p className="text-muted-foreground">
            {filteredTasks.filter((t) => !t.completed).length} وظیفه در انتظار انجام
          </p>
        </div>

        {/* Task Creation */}
        <Button onClick={handleAddTask} className="mb-4 w-full md:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          افزودن وظیفه جدید
        </Button>

        <TaskGroupsBubbles
          user={user}
          guestUser={guestUser}
          groups={groups}
          selectedGroup={filterGroup}
          onGroupSelect={setFilterGroup}
          onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
          onTaskDrop={handleTaskDropToGroup}
          getTaskCountForGroup={(groupId) => tasks.filter((t) => t.group_id === groupId && !t.completed).length}
        />

        {/* Tabs and Filters */}
        <div className="mb-6 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-background">
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  همه
                </TabsTrigger>
                <TabsTrigger value="today" className="data-[state=active]:bg-background">
                  <Calendar className="h-4 w-4 mr-1" />
                  امروز
                </TabsTrigger>
                <TabsTrigger value="important" className="data-[state=active]:bg-background">
                  <Star className="h-4 w-4 mr-1" />
                  مهم
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-background">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  تکمیل شده
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowTags(true)}>
                  <TagIcon className="h-4 w-4" />
                  <span className="hidden md:inline">برچسب‌ها</span>
                </Button>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden md:inline">فیلترها</span>
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="flex flex-wrap gap-3">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="جستجو..."
                          className="pr-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Group Filter */}
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]"
                        value={filterGroup || ""}
                        onChange={(e) => setFilterGroup(e.target.value || null)}
                      >
                        <option value="">همه گروه‌ها</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.emoji} {group.name}
                          </option>
                        ))}
                      </select>

                      {/* Status Filter */}
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                        <option value="all">همه وضعیت‌ها</option>
                        <option value="active">در انتظار انجام</option>
                        <option value="completed">تکمیل شده</option>
                      </select>

                      {/* Priority Filter */}
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]"
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value as any)}
                      >
                        <option value="all">همه اولویت‌ها</option>
                        <option value="high">اولویت بالا</option>
                        <option value="medium">اولویت متوسط</option>
                        <option value="low">اولویت پایین</option>
                      </select>

                      {/* Tag Filter */}
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[150px]"
                        value={filterTag || ""}
                        onChange={(e) => setFilterTag(e.target.value || null)}
                      >
                        <option value="">همه برچسب‌ها</option>
                        {tags.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.name}
                          </option>
                        ))}
                      </select>

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                          <X className="h-4 w-4" />
                          پاک کردن فیلترها
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <TabsContent value="all" className="mt-0">
              {activeTab === "all" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <TaskList
                      tasks={filteredTasks}
                      groups={groups}
                      settings={settings}
                      user={user}
                      onTasksChange={user ? loadTasks : () => setTasks([...localTasks])}
                      onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onComplete={completeTask}
                    />
                  </div>
                  <div className="hidden lg:block">
                    <StatsDashboard tasks={tasks} />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="today" className="mt-0">
              <TaskList
                tasks={filteredTasks}
                groups={groups}
                settings={settings}
                user={user}
                onTasksChange={user ? loadTasks : () => setTasks([...localTasks])}
                onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onComplete={completeTask} // Pass completeTask
              />
            </TabsContent>

            <TabsContent value="important" className="mt-0">
              <TaskList
                tasks={filteredTasks}
                groups={groups}
                settings={settings}
                user={user}
                onTasksChange={user ? loadTasks : () => setTasks([...localTasks])}
                onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onComplete={completeTask} // Pass completeTask
              />
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <TaskList
                tasks={filteredTasks}
                groups={groups}
                settings={settings}
                user={user}
                onTasksChange={user ? loadTasks : () => setTasks([...localTasks])}
                onGroupsChange={user ? loadGroups : () => setGroups([...localGroups])}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onComplete={completeTask} // Pass completeTask
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modals */}
      {showAddTask && (
        <AddTaskModal
          user={user}
          guestUser={guestUser}
          groups={groups}
          tags={tags}
          settings={settings}
          onClose={() => setShowAddTask(false)}
          onTaskAdded={handleTaskAdded}
        />
      )}

      {showEditTask && taskToEdit && (
        <EditTaskModal
          user={user}
          guestUser={guestUser}
          task={taskToEdit}
          groups={groups}
          tags={tags}
          settings={settings}
          onClose={() => {
            setShowEditTask(false)
            setTaskToEdit(null)
          }}
          onTaskUpdated={handleTaskAdded}
        />
      )}

      {showSignInPrompt && (
        <SignInPromptModal onClose={() => setShowSignInPrompt(false)} onSignIn={() => setShowSignInPrompt(false)} />
      )}

      {user && showApiKeySetup && (
        <ApiKeySetup onComplete={() => setShowApiKeySetup(false)} onSkip={() => setShowApiKeySetup(false)} />
      )}

      {showSettings && (
        <SettingsPanel
          user={user || guestUser}
          settings={settings}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}

      {showTags && (
        <TagsModal
          user={user}
          guestUser={guestUser}
          tags={tags}
          onClose={() => setShowTags(false)}
          onTagsChange={handleTagsChange}
        />
      )}
    </div>
  )

}
