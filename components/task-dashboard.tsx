"use client";
import React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, Task, TaskGroup, UserSettings, Tag, UserProfile } from '@/types'; // UserProfile added
import Header from '@/components/header';
import TaskList from '@/components/task-list';
import AddTaskModal from '@/components/add-task-modal';
import EditTaskModal from '@/components/edit-task-modal';
import SignInPromptModal from '@/components/signin-prompt-modal';
import ApiKeySetup from '@/components/api-key-setup';
import SettingsPanel from '@/components/settings/settings-panel';
import TagsModal from '@/components/tags-modal';
import NicknameSetupModal from '@/components/auth/nickname-setup-modal'; // Added import
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Search, TagIcon, X, Filter, Calendar, Star, CheckCircle2, LayoutDashboard, Plus } from 'lucide-react';
import StatsDashboard from '@/components/stats-dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { generateFractionalIndex } from '@/lib/utils';
import TaskGroupsBubbles from '@/components/task-groups-bubbles';
import { Skeleton } from "@/components/ui/skeleton";

interface TaskDashboardProps {
  user: User | null;
}

export default function TaskDashboard({ user: initialUser }: TaskDashboardProps) {
  const [supabaseClient] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(initialUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Added

  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false); // Added
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null); // Tracks if initial data loaded for the current user ID
  const [detailedTasks, setDetailedTasks] = useState<Record<string, { subtasks: Subtask[], tags: Tag[] }>>({});

  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "active">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // const [hasShownSignInPrompt, setHasShownSignInPrompt] = useLocalStorage("has-shown-signin-prompt", false);
  // Disabled useLocalStorage for hasShownSignInPrompt as it's not directly involved in guest conversion logic and to simplify.
  // If it's needed, it can be re-enabled. For now, focusing on the core task.
  const [hasShownSignInPrompt, _setHasShownSignInPrompt] = useState(false); // Temporarily use useState
  const setHasShownSignInPrompt = (value: boolean) => {
    // console.log("setHasShownSignInPrompt called with", value);
    _setHasShownSignInPrompt(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem("has-shown-signin-prompt", JSON.stringify(value));
    }
  };
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem("has-shown-signin-prompt");
      if (storedValue) {
        _setHasShownSignInPrompt(JSON.parse(storedValue));
      }
    }
  }, []);


  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const isGuestUser = useCallback((u: User | null, profile?: UserProfile | null): boolean => {
    if (profile) return profile.is_guest ?? false; // Prefer profile flag
    return u?.email?.endsWith('@auratask.guest') ?? false; // Fallback to email
  }, []);

  const loadUserProfile = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) return;
    const { data, error } = await supabaseClient.from("user_profiles").select("*").eq("user_id", currentUserId).single();
    if (data) setUserProfile(data);
    else {
      setUserProfile(null);
      console.error("Error loading user profile or profile not found:", error?.message);
    }
  }, [supabaseClient]);

  const loadTasks = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) return;
    // Attempt to fetch tasks with counts of subtasks and tags
    // Note: The exact syntax for counts of related many-to-many tables (tags via task_tags) can be tricky.
    // This is a common way to get counts for direct foreign key relations (subtasks).
    // For tags (many-to-many through task_tags), this might simplify to just subtask_count or require an RPC.
    // If `task_tags(count)` doesn't work as expected, Supabase might return an error or incorrect structure.
    // A fallback would be to select only `subtasks(count)` or just `*` and handle counts differently or omit them.
    // For this subtask, we try the count syntax. If it fails in practice, schema/RPC would be needed.
    const { data, error } = await supabaseClient
      .from("tasks")
      .select("*, subtask_count:subtasks(count), tag_count:task_tags(count)") // Corrected tags to task_tags for count
      .eq("user_id", currentUserId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error loading tasks with counts:", error);
      // Fallback to loading tasks without counts if the count query fails
      const { data: fallbackData, error: fallbackError } = await supabaseClient
        .from("tasks")
        .select("*")
        .eq("user_id", currentUserId)
        .order("order_index", { ascending: true });
      if (fallbackError) {
        console.error("Error loading tasks (fallback):", fallbackError);
        setTasks([]);
      } else {
        setTasks(fallbackData || []);
      }
    } else {
      setTasks(data || []);
    }
  }, [supabaseClient]);

  const loadTaskDetails = useCallback(async (taskId: string) => {
    if (!supabaseClient || detailedTasks[taskId]) return; // Already loaded or loading

    // console.log(`Loading details for task ${taskId}`);
    // Optionally, set a loading state for this specific task in detailedTasks
    // setDetailedTasks(prev => ({ ...prev, [taskId]: { loading: true, subtasks: [], tags: [] } }));

    try {
      const { data: subtasksData, error: subtasksError } = await supabaseClient
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("order_index", { ascending: true });

      if (subtasksError) throw subtasksError;

      // Fetch tags for the task via task_tags
      const { data: taskTagsData, error: taskTagsError } = await supabaseClient
        .from("task_tags")
        .select("tags(*)") // Select all columns from the related tags table
        .eq("task_id", taskId);

      if (taskTagsError) throw taskTagsError;

      // The result from taskTagsData will be like [{ tags: {id, name, color, ...} }, ...]
      // So we need to extract the actual tag objects.
      const fetchedTags: Tag[] = taskTagsData ? taskTagsData.map(tt => tt.tags).filter(Boolean) as Tag[] : [];

      setDetailedTasks(prev => ({
        ...prev,
        [taskId]: { subtasks: subtasksData || [], tags: fetchedTags },
      }));
    } catch (error) {
      console.error(`Error loading task details for ${taskId}:`, error);
      toast({ title: "خطا در بارگیری جزئیات وظیفه", description: (error as Error).message, variant: "destructive" });
      // Remove loading state if set
      // setDetailedTasks(prev => {
      //   const newState = { ...prev };
      //   if(newState[taskId]?.loading) delete newState[taskId]; // Or set loading: false
      //   return newState;
      // });
    }
  }, [supabaseClient, detailedTasks, toast]);

  const loadGroups = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) return;
    const { data } = await supabaseClient.from("task_groups").select("*").eq("user_id", currentUserId).order("created_at");
    setGroups(data || []);
  }, [supabaseClient]);

  const loadTags = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) return;
    const { data } = await supabaseClient.from("tags").select("*").eq("user_id", currentUserId).order("name");
    setTags(data || []);
  }, [supabaseClient]);

  const loadSettings = useCallback(async (currentUserId: string, currentUser: User | null, currentProfile: UserProfile | null) => {
    if (!currentUserId || !supabaseClient) return;
    const { data } = await supabaseClient.from("user_settings").select("*").eq("user_id", currentUserId).single();
    if (data) {
      setSettings(data);
      if (!isGuestUser(currentUser, currentProfile) && !data.gemini_api_key) {
        setShowApiKeySetup(true);
      } else {
        setShowApiKeySetup(false);
      }
    } else {
      if (!isGuestUser(currentUser, currentProfile)) {
        setShowApiKeySetup(true);
      }
      setSettings(null);
    }
  }, [supabaseClient, isGuestUser]);

  const loadUserData = useCallback(async (userIdToLoad: string, currentUser: User | null) => {
    if (!userIdToLoad) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // Fetch profile first as it might be needed for other load functions (e.g. isGuestUser check)
    await loadUserProfile(userIdToLoad);
    // Now that userProfile state is set (or attempted), other functions can use it if they access it via state
    // However, it's better to pass the fetched profile directly if needed immediately to avoid stale state.
    // For now, loadSettings will use the isGuestUser helper which can check the profile state.
    const profileData = await supabaseClient.from("user_profiles").select("*").eq("user_id", userIdToLoad).single();
    setUserProfile(profileData.data); // ensure userProfile state is updated before settings load

    await Promise.all([
      loadTasks(userIdToLoad),
      loadGroups(userIdToLoad),
      loadTags(userIdToLoad),
      loadSettings(userIdToLoad, currentUser, profileData.data), // Pass profile data to loadSettings
    ]);
    setLoading(false);
  }, [loadTasks, loadGroups, loadTags, loadSettings, loadUserProfile, supabaseClient]);

  useEffect(() => {
    setUser(initialUser);
    if (initialUser) {
      loadUserData(initialUser.id, initialUser);
    } else {
      setLoading(true);
      const ensureSession = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          // AppInitializer should handle anonymous user creation.
          // If no session here, it might mean AppInitializer is still working
          // or there was an issue. Rely on onAuthStateChange to eventually set the user.
          console.log("TaskDashboard: No initial user and no session from getSession. Waiting for AppInitializer/onAuthStateChange.");
          // We might still want to set loading to false after a timeout if no user appears,
          // or handle this state more gracefully. For now, AppInitializer is the primary source of user session.
          setLoading(false);
        }
      };
      ensureSession();
    }
  }, [initialUser, supabaseClient, loadUserData, toast]);

  useEffect(() => {
    if (user?.id && user.id !== loadedUserId) {
      // User has changed or is loaded for the first time
      setTasks([]); setGroups([]); setTags([]); setSettings(null); setUserProfile(null); // Reset data for new user
      setLoading(true); // Show loading for new user data
      loadUserData(user.id, user);
      setLoadedUserId(user.id);
    } else if (!user?.id && loadedUserId) {
      // User logged out
      setTasks([]); setGroups([]); setTags([]); setSettings(null); setUserProfile(null); // Reset profile
      setLoadedUserId(null); // Reset loaded user ID
      setLoading(false); // Not loading data for a logged-out state
    } else if (!user?.id) {
      // Initial state, no user, not previously loaded
      setLoading(false);
    }
    // If user.id === loadedUserId, do nothing, data is already loaded and realtime handles updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadUserData, loadedUserId]); // loadUserData and loadedUserId are dependencies

  // Guest Conversion Handler
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
            const isCurrentProfileGuest = userProfile?.is_guest === true;

            // console.log("Guest conversion check:", {
            //   newAuthUserEmail: newAuthUser.email,
            //   isNewUserEmailGuest,
            //   userProfileIsGuest: userProfile?.is_guest,
            //   currentProfileUserId: userProfile?.user_id,
            //   newAuthUserId: newAuthUser.id
            // });

            // Ensure we are not trying to convert if the profile loaded is already for the new user and is_guest is false
            // This can happen if profile reloads very quickly.
            // The key is that the *profile we have in state* is still the guest one.
            if (!isNewUserEmailGuest && isCurrentProfileGuest && userProfile?.user_id === newAuthUser.id) {
              // console.log("Conditions met for calling /api/user/set-registered");
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

  // Realtime subscriptions
  useEffect(() => {
    if (!user?.id || !supabaseClient) return;

    const channels: SupabaseClient['channels'] = [];

    // Handle Tasks
    const tasksChannel = supabaseClient
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Existing logic for main tasks list (setTasks) should be mostly fine.
          // It will receive tasks with counts, not full subtasks/tags.
          // If a task that is in detailedTasks is updated, we might want to refresh its details.
          const taskId = payload.new?.id || payload.old?.id;

          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            // No subtasks/tags to initialize here as they are not part of the main task object anymore
            setTasks(prevTasks => [...prevTasks, newTask].sort((a,b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0")));
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks(prevTasks =>
              prevTasks.map(task => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task))
                       .sort((a,b) => parseFloat(a.order_index || "0") - parseFloat(b.order_index || "0"))
            );
            // If the updated task is in detailedTasks, invalidate its details to be refetched on next view, or refetch now.
            // For simplicity, let's invalidate. User can re-expand to get fresh details.
            // Or, more proactively:
            if (taskId && detailedTasks[taskId]) {
              // setDetailedTasks(prev => { ...prev, [taskId]: undefined }); // Mark as stale
              // OR refetch:
              // loadTaskDetails(taskId); // This might cause issues if called too frequently from many updates.
              // A safer invalidation:
              setDetailedTasks(prev => {
                const newDetailed = { ...prev };
                delete newDetailed[taskId]; // Remove to trigger reload on next access
                return newDetailed;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldTaskId = (payload.old as Task).id;
            setTasks(prevTasks => prevTasks.filter(task => task.id !== oldTaskId));
            if (oldTaskId) {
              setDetailedTasks(prev => {
                const newDetailed = { ...prev };
                delete newDetailed[oldTaskId];
                return newDetailed;
              });
            }
          }
        }
      )
      .subscribe();
    channels.push(tasksChannel);

    // Handle Task Groups
    const groupsChannel = supabaseClient
      .channel('public:task_groups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_groups', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new && (payload.new as TaskGroup).user_id !== user.id) return;
          // No user_id in old payload for groups, rely on filter or session.

          if (payload.eventType === 'INSERT') {
            setGroups(prevGroups => [...prevGroups, payload.new as TaskGroup].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
          } else if (payload.eventType === 'UPDATE') {
            setGroups(prevGroups =>
              prevGroups.map(group => (group.id === (payload.new as TaskGroup).id ? payload.new as TaskGroup : group))
                        .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            );
          } else if (payload.eventType === 'DELETE') {
            setGroups(prevGroups => prevGroups.filter(group => group.id !== (payload.old as TaskGroup).id));
          }
        }
      )
      .subscribe();
    channels.push(groupsChannel);

    // Handle Tags
    const tagsChannel = supabaseClient
      .channel('public:tags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new && (payload.new as Tag).user_id !== user.id) return;
          // No user_id in old payload for tags, rely on filter or session.

          if (payload.eventType === 'INSERT') {
            setTags(prevTags => [...prevTags, payload.new as Tag].sort((a,b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setTags(prevTags =>
              prevTags.map(tag => (tag.id === (payload.new as Tag).id ? payload.new as Tag : tag))
                      .sort((a,b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === 'DELETE') {
            setTags(prevTags => prevTags.filter(tag => tag.id !== (payload.old as Tag).id));
          }
        }
      )
      .subscribe();
    channels.push(tagsChannel);

    // Handle User Profiles
    const userProfileChannel = supabaseClient
      .channel('public:user_profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if ((payload.new as UserProfile).user_id === user.id) {
            setUserProfile(prevProfile => ({ ...prevProfile, ...(payload.new as UserProfile) }));
          }
        }
      )
      .subscribe();
    channels.push(userProfileChannel);

    // Handle User Settings
    const userSettingsChannel = supabaseClient
      .channel('public:user_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if ((payload.new as UserSettings).user_id === user.id) {
            setSettings(prevSettings => ({ ...prevSettings, ...(payload.new as UserSettings) }));
          }
        }
      )
      .subscribe();
    channels.push(userSettingsChannel);

    // Handle Subtasks
    // Subtasks do not have a direct user_id column. RLS for subtasks is based on the parent task's user_id.
    // So, we subscribe to all subtask changes and then filter client-side by checking if the parent task exists in our state.
    const subtasksChannel = supabaseClient
      .channel('public:subtasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' },
        (payload) => {
          const subtaskRecord = (payload.new || payload.old) as any; // Type to Subtask later
          if (!subtaskRecord || !subtaskRecord.task_id) return;

          setTasks(prevTasks => { // This whole block needs to be re-evaluated for lazy loading
            const parentTaskId = subtaskRecord.task_id;
            // If the parent task's details are loaded, update them.
            if (detailedTasks[parentTaskId]) {
              let newSubtasksList: Subtask[];
              const currentSubtasks = detailedTasks[parentTaskId]?.subtasks || [];

              if (payload.eventType === 'INSERT') {
                newSubtasksList = [...currentSubtasks, payload.new as Subtask].sort((a,b) => a.order_index - b.order_index);
              } else if (payload.eventType === 'UPDATE') {
                newSubtasksList = currentSubtasks.map(st => (st.id === (payload.new as Subtask).id ? payload.new as Subtask : st))
                                                 .sort((a,b) => a.order_index - b.order_index);
              } else if (payload.eventType === 'DELETE') {
                newSubtasksList = currentSubtasks.filter(st => st.id !== (payload.old as Subtask).id);
              } else {
                newSubtasksList = currentSubtasks; // Should not happen
              }
              setDetailedTasks(prevDetailed => ({
                ...prevDetailed,
                [parentTaskId]: { ...prevDetailed[parentTaskId], subtasks: newSubtasksList }
              }));
            }
            // Also update the subtask_count on the main task object in the `tasks` state
            const parentTaskIndex = prevTasks.findIndex(t => t.id === parentTaskId);
            if (parentTaskIndex !== -1) {
              const newTasks = [...prevTasks];
              const currentTask = { ...newTasks[parentTaskIndex] };
              if (payload.eventType === 'INSERT') {
                currentTask.subtask_count = (currentTask.subtask_count || 0) + 1;
              } else if (payload.eventType === 'DELETE') {
                currentTask.subtask_count = Math.max(0, (currentTask.subtask_count || 0) - 1);
              }
              // UPDATE to a subtask doesn't change count.
              newTasks[parentTaskIndex] = currentTask;
              return newTasks;
            }
            return prevTasks; // Return original if parent task not found for count update
          });
        }
      )
      .subscribe();
    channels.push(subtasksChannel);

    // Realtime for task_tags (to update tag_count and detailedTasks if a task's tags change)
    const taskTagsChannel = supabaseClient
      .channel('public:task_tags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' },
        async (payload: any) => {
          const taskId = payload.new?.task_id || payload.old?.task_id;
          if (!taskId) return;

          // Update tag_count on the main task object
          setTasks(prevTasks => {
            const parentTaskIndex = prevTasks.findIndex(t => t.id === taskId);
            if (parentTaskIndex !== -1) {
              const newTasks = [...prevTasks];
              const currentTask = { ...newTasks[parentTaskIndex] };
              // Refetch count for simplicity or adjust based on eventType
              // This is a simplification; ideally, you'd increment/decrement.
              // For now, just mark its details as stale if loaded.
              if (payload.eventType === 'INSERT') {
                currentTask.tag_count = (currentTask.tag_count || 0) + 1;
              } else if (payload.eventType === 'DELETE') {
                currentTask.tag_count = Math.max(0, (currentTask.tag_count || 0) - 1);
              }
              newTasks[parentTaskIndex] = currentTask;
              return newTasks;
            }
            return prevTasks;
          });

          // If the task's details are currently loaded, refresh them
          if (detailedTasks[taskId]) {
            // Invalidate and reload, or try to update tags based on payload.
            // Reloading is simpler here.
            // To avoid rapid reloads if many tags change, could debounce or mark stale.
            // loadTaskDetails(taskId); // This might be too aggressive.
            // Mark as stale:
            setDetailedTasks(prev => {
                const newDetailed = { ...prev };
                delete newDetailed[taskId];
                return newDetailed;
            });
          }
        }
      )
      .subscribe();
    channels.push(taskTagsChannel);


    return () => {
      channels.forEach(c => supabaseClient.removeChannel(c));
    };
  }, [user?.id, supabaseClient, setTasks, setGroups, setTags, setUserProfile, setSettings, detailedTasks, loadTaskDetails]); // Added detailedTasks and loadTaskDetails

  // ... (rest of the component, including passing detailedTasks[task.id] and loadTaskDetails to TaskList/TaskCard)
  // The TaskList component will need to be updated to accept and pass these props to TaskCard.
  // TaskCard will then use these props to display subtasks/tags and trigger loading.
  // For example, in TaskList:
  // tasks.map(task => <TaskCard key={task.id} task={task} details={detailedTasks[task.id]} loadDetails={() => loadTaskDetails(task.id)} ... />)
  // And in TaskCard:
  // const { task, details, loadDetails } = props;
  // const currentSubtasks = details?.subtasks || []; // Or show loading / expand button
  // If !details and task.subtask_count > 0, show button that calls loadDetails()

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);


  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const applyFilters = useCallback(() => {
    let result = [...tasks];
    if (activeTab === "today") result = result.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString());
    else if (activeTab === "important") result = result.filter(t => (t.importance_score || 0) >= 15);
    else if (activeTab === "completed") result = result.filter(t => t.completed);
    if (searchQuery) { const query = searchQuery.toLowerCase(); result = result.filter(t => t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query)));}
    if (filterGroup) result = result.filter(t => t.group_id === filterGroup);
    if (filterStatus === "completed") result = result.filter(t => t.completed); else if (filterStatus === "active") result = result.filter(t => !t.completed);
    if (filterPriority === "high") result = result.filter(t => (t.importance_score || 0) >= 15);
    else if (filterPriority === "medium") result = result.filter(t => (t.importance_score || 0) >= 8 && (t.importance_score || 0) < 15);
    else if (filterPriority === "low") result = result.filter(t => (t.importance_score || 0) < 8);
    if (filterTag) result = result.filter(t => t.tags?.some(tag => tag.id === filterTag));
    setFilteredTasks(result);
  }, [tasks, searchQuery, filterGroup, filterStatus, filterPriority, filterTag, activeTab]);
  useEffect(() => { applyFilters(); }, [applyFilters]);

  const handleAddTask = useCallback(() => {
    if (user && isGuestUser(user, userProfile) && tasks.length >= 5 && !hasShownSignInPrompt) {
      setShowSignInPrompt(true); setHasShownSignInPrompt(true);
    } else { setShowAddTask(true); }
  }, [user, userProfile, isGuestUser, tasks.length, hasShownSignInPrompt, setHasShownSignInPrompt]);
  const handleEditTask = useCallback((task: Task) => { setTaskToEdit(task); setShowEditTask(true); }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!user?.id) return; const originalTasks = tasks; setTasks(prev => prev.filter(t => t.id !== taskId));
    try { const { error } = await supabaseClient.from("tasks").delete().eq("id", taskId).eq("user_id", user.id); if (error) throw error; toast({ title: "وظیفه حذف شد" });
    } catch (error) { setTasks(originalTasks); console.error("Error deleting task:", error); toast({ title: "خطا در حذف وظیفه", variant: "destructive" });}
  }, [user?.id, supabaseClient, tasks, toast]);

  const completeTask = useCallback(async (taskId: string, completed: boolean) => {
    if (!user?.id) return; const originalTasks = tasks; const completed_at = completed ? new Date().toISOString() : null; setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed, completed_at } : t));
    try { const { error } = await supabaseClient.from("tasks").update({ completed, completed_at }).eq("id", taskId).eq("user_id", user.id); if (error) throw error; toast({ title: completed ? "وظیفه تکمیل شد" : "وظیفه به حالت قبل بازگشت" });
    } catch (error) { setTasks(originalTasks); console.error("Error completing task:", error); toast({ title: "خطا در تغییر وضعیت وظیفه", variant: "destructive" });}
  }, [user?.id, supabaseClient, tasks, toast]);

  const handleTaskAddedOrUpdated = useCallback(() => { if (user?.id) loadTasks(user.id); }, [user?.id, loadTasks]);
  const handleSettingsChange = useCallback(() => { if (user?.id) loadSettings(user.id, user, userProfile); }, [user, userProfile, loadSettings]);
  const handleTagsChange = useCallback(() => { if (user?.id) loadTags(user.id); }, [user?.id, loadTags]);
  const handleGroupsChange = useCallback(() => { if (user?.id) loadGroups(user.id); }, [user?.id, loadGroups]);

  const clearFilters = useCallback(() => { setSearchQuery(""); setFilterGroup(null); setFilterStatus("all"); setFilterPriority("all"); setFilterTag(null); }, []);

  const handleTaskDropToGroup = useCallback(async (taskId: string, newGroupId: string | null) => {
    if (!user?.id) return; const originalTasks = tasks; setTasks(prev => prev.map(t => t.id === taskId ? { ...t, group_id: newGroupId } : t));
    try { const { error } = await supabaseClient.from("tasks").update({ group_id: newGroupId }).eq("id", taskId).eq("user_id", user.id); if (error) throw error; toast({ title: "وظیفه به‌روزرسانی شد", description: "وظیفه با موفقیت به گروه جدید منتقل شد." });
    } catch (error) { setTasks(originalTasks); console.error("Error updating task group:", error); toast({ title: "خطا در انتقال وظیفه", variant: "destructive" });}
  }, [user?.id, supabaseClient, tasks, toast]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event; if (!over || !user?.id) return;
    if (active.data.current?.type === "task" && active.id !== over.id) {
        const oldIndex = tasks.findIndex((t) => t.id === active.id);
        const newPotentialIndex = tasks.findIndex((t) => t.id === over.id); // This is the index of the item we are dropping ON or BEFORE
        if (oldIndex === -1 || newPotentialIndex === -1) return;

        // Simulate the move to find tasks before and after the new position
        // Note: arrayMove moves the item at oldIndex to be AT newPotentialIndex.
        // So, the item that was at newPotentialIndex and items after it are shifted.
        const tempReorderedTasks = arrayMove(tasks, oldIndex, newPotentialIndex);
        const finalNewIndexInTempArray = tempReorderedTasks.findIndex(t => t.id === active.id);

        const prevTask = finalNewIndexInTempArray > 0 ? tempReorderedTasks[finalNewIndexInTempArray - 1] : null;
        const nextTask = finalNewIndexInTempArray < tempReorderedTasks.length - 1 ? tempReorderedTasks[finalNewIndexInTempArray + 1] : null;

        const newOrderIndex = generateFractionalIndex(prevTask?.order_index, nextTask?.order_index);

        // Update the order_index property of the moved task in the local array
        const reorderedTasksWithUpdatedIndex = tempReorderedTasks.map(task =>
          task.id === active.id ? { ...task, order_index: newOrderIndex } : task
        );

        // The local array is already in the new visual order due to arrayMove.
        // Now that the specific item has its new fractional index,
        // a full sort of `reorderedTasksWithUpdatedIndex` by `order_index` (as string floats)
        // should maintain this order and also correctly place the item based on its new index
        // relative to others if fractional logic created a value that lexicographically fits.
        reorderedTasksWithUpdatedIndex.sort((a, b) => {
            const aIndex = a.order_index ? parseFloat(a.order_index) : 0;
            const bIndex = b.order_index ? parseFloat(b.order_index) : 0;
            return aIndex - bIndex;
        });

        setTasks(reorderedTasksWithUpdatedIndex);

        try {
          const { error } = await supabaseClient
            .from("tasks")
            .update({ order_index: newOrderIndex })
            .eq("id", active.id)
            .eq("user_id", user.id);
          if (error) throw error;
        } catch (error) {
          console.error("Error reordering tasks:", error);
          toast({ title: "خطا در به‌روزرسانی ترتیب وظایف", variant: "destructive" });
          // Revert local state or reload tasks on error
          loadTasks(user.id); // Reload to ensure consistency
        }
    } setActiveId(null);
  };
  const handleDragStart = (event: any) => { setActiveId(event.active.id); }; const handleDragCancel = () => { setActiveId(null); };
  const hasActiveFilters = searchQuery || filterGroup || filterStatus !== "all" || filterPriority !== "all" || filterTag;

  if (loading && !userProfile) { // Adjusted loading condition
    return ( /* Skeleton UI remains the same */
      <div className="min-h-screen bg-background">
        <Header user={null} userProfile={null} onSettingsChange={() => setShowSettings(true)} onSearch={setSearchQuery} />
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="min-h-screen bg-background">
        <Header user={user} userProfile={userProfile} onSettingsChange={() => setShowSettings(true)} onSearch={setSearchQuery} />
        <main className="container pt-16 pb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {userProfile?.nickname ? `سلام، ${userProfile.nickname}` : (user && isGuestUser(user, userProfile) ? "سلام، مهمان" : `سلام${user?.user_metadata?.name ? "، " + user.user_metadata.name : (user?.email && !isGuestUser(user, userProfile) ? "، " + user.email.split('@')[0] : "")}`)}
            </h1>
            <p className="text-muted-foreground">{filteredTasks.filter(t => !t.completed).length} وظیفه در انتظار انجام</p>
          </div>
          <Button onClick={handleAddTask} className="mb-4 w-full md:w-auto"><Plus className="h-4 w-4 ml-2" /> افزودن وظیفه جدید</Button>
          {!loading && groups.length === 0 && tasks.length === 0 ? (
            <div className="text-center py-12 my-8 bg-muted/20 rounded-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.688 4.156a2.25 2.25 0 0 1-2.25-2.25V15M11 19.5h1.258c1.28 0 2.501-.422 3.502-1.186A2.25 2.25 0 0 0 18 16.5v-3a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25v3.75m0 0A2.25 2.25 0 0 1 9.75 18h-3a2.25 2.25 0 0 1-2.25-2.25V15m0 0A2.25 2.25 0 0 0 6.75 12.75h3" /></svg></div>
              <h3 className="text-xl font-semibold text-foreground mb-3">شروع کنید!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">با ایجاد یک گروه یا افزودن اولین وظیفه، کار خود را سازماندهی کنید.</p>
              <TaskGroupsBubbles user={user} groups={groups} selectedGroup={filterGroup} onGroupSelect={setFilterGroup} onGroupsChange={handleGroupsChange} onTaskDrop={handleTaskDropToGroup} getTaskCountForGroup={(groupId) => tasks.filter(t => t.group_id === groupId && !t.completed).length} />
            </div>
          ) : (
            <>
              <TaskGroupsBubbles user={user} groups={groups} selectedGroup={filterGroup} onGroupSelect={setFilterGroup} onGroupsChange={handleGroupsChange} onTaskDrop={handleTaskDropToGroup} getTaskCountForGroup={(groupId) => tasks.filter(t => t.group_id === groupId && !t.completed).length} />
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
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowTags(true)}><TagIcon className="h-4 w-4" /><span className="hidden md:inline">برچسب‌ها</span></Button>
                      <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="gap-1" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4" /><span className="hidden md:inline">فیلترها</span></Button>
                    </div>
                  </div>
                  <AnimatePresence>{showFilters && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}><div className="bg-muted/30 rounded-lg p-4 mb-4"><div className="flex flex-wrap gap-3"><div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" placeholder="جستجو..." className="pr-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterGroup || ""} onChange={(e) => setFilterGroup(e.target.value || null)}><option value="">همه گروه‌ها</option>{groups.map((group) => (<option key={group.id} value={group.id}>{group.emoji} {group.name}</option>))}</select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}><option value="all">همه وضعیت‌ها</option><option value="active">در انتظار انجام</option><option value="completed">تکمیل شده</option></select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}><option value="all">همه اولویت‌ها</option><option value="high">اولویت بالا</option><option value="medium">اولویت متوسط</option><option value="low">اولویت پایین</option></select><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-[150px]" value={filterTag || ""} onChange={(e) => setFilterTag(e.target.value || null)}><option value="">همه برچسب‌ها</option>{tags.map((tag) => (<option key={tag.id} value={tag.id}>{tag.name}</option>))}</select>{hasActiveFilters && (<Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-4 w-4" />پاک کردن فیلترها</Button>)}</div></div></motion.div>)}</AnimatePresence>
                  <TabsContent value="all" className="mt-0">{activeTab === "all" && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={handleTaskAddedOrUpdated} onGroupsChange={handleGroupsChange} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} /></div><div className="hidden lg:block"><StatsDashboard tasks={tasks} /></div></div>)}</TabsContent>
                  <TabsContent value="today" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={handleTaskAddedOrUpdated} onGroupsChange={handleGroupsChange} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} /></TabsContent>
                  <TabsContent value="important" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={handleTaskAddedOrUpdated} onGroupsChange={handleGroupsChange} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} /></TabsContent>
                  <TabsContent value="completed" className="mt-0"><TaskList tasks={filteredTasks} groups={groups} settings={settings} user={user} onTasksChange={handleTaskAddedOrUpdated} onGroupsChange={handleGroupsChange} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onComplete={completeTask} detailedTasks={detailedTasks} loadTaskDetails={loadTaskDetails} /></TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </main>
        {showAddTask && (<AddTaskModal user={user} groups={groups} tags={tags} settings={settings} onClose={() => setShowAddTask(false)} onTaskAdded={handleTaskAddedOrUpdated} />)}
        {showEditTask && taskToEdit && (<EditTaskModal user={user} task={taskToEdit} groups={groups} tags={tags} settings={settings} onClose={() => { setShowEditTask(false); setTaskToEdit(null); }} onTaskUpdated={handleTaskAddedOrUpdated} />)}
        {showSignInPrompt && (<SignInPromptModal onClose={() => setShowSignInPrompt(false)} onSignIn={() => { setShowSignInPrompt(false);}} />)}
        {user && showApiKeySetup && (<ApiKeySetup onComplete={() => {setShowApiKeySetup(false); if(user?.id) loadSettings(user.id, user, userProfile);}} onSkip={() => setShowApiKeySetup(false)} />)}
        {showSettings && (<SettingsPanel user={user} profile={userProfile} settings={settings} isOpen={showSettings} onClose={() => setShowSettings(false)} onSettingsChange={handleSettingsChange} />)}
        {showTags && (<TagsModal user={user} tags={tags} onClose={() => setShowTags(false)} onTagsChange={handleTagsChange} />)}
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
