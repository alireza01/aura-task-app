import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, TaskGroup } from '@/types';
import { useToast } from '@/components/ui/use-toast'; // For notifications
import { v4 as uuidv4 } from 'uuid'; // For generating local IDs if needed, though DB handles it

interface UseGroupsProps {
  user: User | null;
  initialSupabaseClient?: SupabaseClient;
  initialGroups?: TaskGroup[];
}

export function useGroups({
  user,
  initialSupabaseClient,
  initialGroups = [],
}: UseGroupsProps) {
  const [supabaseClient] = useState(() => initialSupabaseClient || createClient());
  const { toast } = useToast();

  const [groups, setGroups] = useState<TaskGroup[]>(initialGroups);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(true);

  const loadGroups = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) {
      setLoadingGroups(false);
      return;
    }
    setLoadingGroups(true);
    const { data, error } = await supabaseClient
      .from("task_groups")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading groups:", error);
      setGroups([]);
      toast({ title: "خطا در بارگیری گروه‌ها", description: error.message, variant: "destructive" });
    } else {
      setGroups(data || []);
    }
    setLoadingGroups(false);
  }, [supabaseClient, toast]);

  useEffect(() => {
    if (user?.id) {
      if (initialGroups.length === 0 || (groups.length > 0 && groups[0].user_id !== user.id)) {
        loadGroups(user.id);
      } else if (initialGroups.length > 0 && groups.length === 0) {
        setGroups(initialGroups);
        setLoadingGroups(false);
      } else {
         setLoadingGroups(false);
      }
    } else {
      setGroups([]);
      setLoadingGroups(false);
    }
  }, [user?.id, loadGroups, initialGroups]);

  const addGroup = useCallback(async (groupData: Omit<TaskGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id || !supabaseClient) {
      toast({ title: "خطا", description: "کاربر شناسایی نشد.", variant: "destructive" });
      return null;
    }

    // Optimistic update (optional, but good for UX)
    // const tempId = uuidv4(); // Generate a temporary ID for optimistic update
    // const newGroupOptimistic: TaskGroup = {
    //   ...groupData,
    //   id: tempId,
    //   user_id: user.id,
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString(),
    // };
    // setGroups(prev => [...prev, newGroupOptimistic].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

    try {
      const { data, error } = await supabaseClient
        .from("task_groups")
        .insert({ ...groupData, user_id: user.id })
        .select()
        .single();

      if (error) {
        // setGroups(prev => prev.filter(g => g.id !== tempId)); // Revert optimistic update
        toast({ title: "خطا در افزودن گروه", description: error.message, variant: "destructive" });
        console.error("Error adding group:", error);
        return null;
      }

      // Realtime should ideally handle adding the group to state, preventing duplicates.
      // If not relying purely on realtime for immediate feedback after add:
      // setGroups(prev => prev.filter(g => g.id !== tempId)); // Remove optimistic
      // setGroups(prev => [...prev, data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      toast({ title: "گروه افزوده شد", description: `گروه "${data.name}" با موفقیت ایجاد شد.` });
      return data;
    } catch (error) {
      // setGroups(prev => prev.filter(g => g.id !== tempId)); // Revert optimistic update
      toast({ title: "خطای ناشناخته", description: "مشکلی در افزودن گروه رخ داد.", variant: "destructive" });
      console.error("Unexpected error adding group:", error);
      return null;
    }
  }, [user?.id, supabaseClient, toast]);

  const updateGroup = useCallback(async (groupId: string, groupData: Partial<Omit<TaskGroup, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user?.id || !supabaseClient) {
      toast({ title: "خطا", description: "کاربر شناسایی نشد.", variant: "destructive" });
      return null;
    }

    // Optimistic update (optional)
    // const originalGroups = [...groups];
    // setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...groupData, updated_at: new Date().toISOString() } : g));

    try {
      const { data, error } = await supabaseClient
        .from("task_groups")
        .update({ ...groupData, updated_at: new Date().toISOString() })
        .eq("id", groupId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        // setGroups(originalGroups); // Revert optimistic update
        toast({ title: "خطا در به‌روزرسانی گروه", description: error.message, variant: "destructive" });
        console.error("Error updating group:", error);
        return null;
      }
      // Realtime should handle this update.
      // If not relying purely on realtime for immediate feedback:
      // setGroups(prev => prev.map(g => g.id === data.id ? data : g).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      toast({ title: "گروه به‌روزرسانی شد", description: `گروه "${data.name}" با موفقیت به‌روزرسانی شد.` });
      return data;
    } catch (error) {
      // setGroups(originalGroups); // Revert optimistic update
      toast({ title: "خطای ناشناخته", description: "مشکلی در به‌روزرسانی گروه رخ داد.", variant: "destructive" });
      console.error("Unexpected error updating group:", error);
      return null;
    }
  }, [user?.id, supabaseClient, toast]); // removed groups from deps for optimistic

  const deleteGroup = useCallback(async (groupId: string) => {
    if (!user?.id || !supabaseClient) {
      toast({ title: "خطا", description: "کاربر شناسایی نشد.", variant: "destructive" });
      return false;
    }

    // Optimistic update (optional)
    // const groupToDelete = groups.find(g => g.id === groupId);
    // const originalGroups = [...groups];
    // setGroups(prev => prev.filter(g => g.id !== groupId));

    try {
      const { error } = await supabaseClient
        .from("task_groups")
        .delete()
        .eq("id", groupId)
        .eq("user_id", user.id);

      if (error) {
        // setGroups(originalGroups); // Revert optimistic update
        toast({ title: "خطا در حذف گروه", description: error.message, variant: "destructive" });
        console.error("Error deleting group:", error);
        return false;
      }
      // Realtime should handle this.
      // If not relying purely on realtime for immediate feedback:
      // setGroups(prev => prev.filter(g => g.id !== groupId));
      toast({ title: "گروه حذف شد" /* description: `گروه "${groupToDelete?.name}" حذف شد.` */ });
      return true;
    } catch (error) {
      // setGroups(originalGroups); // Revert optimistic update
      toast({ title: "خطای ناشناخته", description: "مشکلی در حذف گروه رخ داد.", variant: "destructive" });
      console.error("Unexpected error deleting group:", error);
      return false;
    }
  }, [user?.id, supabaseClient, toast]); // removed groups from deps for optimistic

  // Realtime subscription for task_groups
  useEffect(() => {
    if (!user?.id || !supabaseClient) return;

    const groupsChannel = supabaseClient
      .channel('use-groups-public-task-groups') // Unique channel name
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'task_groups', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newGroup = payload.new as TaskGroup;
              setGroups(prevGroups => {
                if (prevGroups.find(g => g.id === newGroup.id)) return prevGroups; // Already exists
                return [...prevGroups, newGroup].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedGroup = payload.new as TaskGroup;
              setGroups(prevGroups =>
                prevGroups.map(group => (group.id === updatedGroup.id ? { ...group, ...updatedGroup } : group))
                          .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              );
            } else if (payload.eventType === 'DELETE') {
              const oldGroupId = (payload.old as TaskGroup).id;
              setGroups(prevGroups => prevGroups.filter(group => group.id !== oldGroupId));
            }
          }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('useGroups: Subscribed to task_groups realtime channel');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('useGroups: Task_groups channel error/timeout', err);
          toast({ title: "خطای اتصال بی‌درنگ", description: "مشکلی در همگام‌سازی بی‌درنگ گروه‌ها رخ داده است.", variant: "warning" });
        }
      });

    return () => {
      if (groupsChannel) {
        supabaseClient.removeChannel(groupsChannel);
      }
    };
  }, [user?.id, supabaseClient, toast]);

  return {
    groups,
    loadingGroups,
    loadGroups, // Allow manual refresh
    addGroup,
    updateGroup,
    deleteGroup,
    setGroups, // Expose setter for advanced cases or testing
  };
}
