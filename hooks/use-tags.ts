import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@/lib/supabase/client';
import type { User, Tag } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface UseTagsProps {
  user: User | null;
  initialSupabaseClient?: SupabaseClient;
  initialTags?: Tag[];
}

export function useTags({
  user,
  initialSupabaseClient,
  initialTags = [],
}: UseTagsProps) {
  const [supabaseClient] = useState(() => initialSupabaseClient || createClient());
  const { toast } = useToast();

  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [loadingTags, setLoadingTags] = useState<boolean>(true);

  const loadTags = useCallback(async (currentUserId: string) => {
    if (!currentUserId || !supabaseClient) {
      setLoadingTags(false);
      return;
    }
    setLoadingTags(true);
    const { data, error } = await supabaseClient
      .from("tags")
      .select("*")
      .eq("user_id", currentUserId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading tags:", error);
      setTags([]);
      toast({ title: "خطا در بارگیری برچسب‌ها", description: error.message, variant: "destructive" });
    } else {
      setTags(data || []);
    }
    setLoadingTags(false);
  }, [supabaseClient, toast]);

  useEffect(() => {
    if (user?.id) {
      if (initialTags.length === 0 || (tags.length > 0 && tags[0].user_id !== user.id)) {
        loadTags(user.id);
      } else if (initialTags.length > 0 && tags.length === 0) {
        setTags(initialTags);
        setLoadingTags(false);
      } else {
        setLoadingTags(false);
      }
    } else {
      setTags([]);
      setLoadingTags(false);
    }
  }, [user?.id, loadTags, initialTags]);

  const addTag = useCallback(async (tagData: Omit<Tag, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id || !supabaseClient) {
      toast({ title: "خطا", description: "کاربر شناسایی نشد.", variant: "destructive" });
      return null;
    }
    try {
      const { data, error } = await supabaseClient
        .from("tags")
        .insert({ ...tagData, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast({ title: "خطا در افزودن برچسب", description: error.message, variant: "destructive" });
        console.error("Error adding tag:", error);
        return null;
      }
      toast({ title: "برچسب افزوده شد", description: `برچسب "${data.name}" با موفقیت ایجاد شد.` });
      return data;
    } catch (error) {
      toast({ title: "خطای ناشناخته", description: "مشکلی در افزودن برچسب رخ داد.", variant: "destructive" });
      console.error("Unexpected error adding tag:", error);
      return null;
    }
  }, [user?.id, supabaseClient, toast]);

  const updateTag = useCallback(async (tagId: string, tagData: Partial<Omit<Tag, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user?.id || !supabaseClient) {
      toast({ title: "خطا", description: "کاربر شناسایی نشد.", variant: "destructive" });
      return null;
    }
    try {
      const { data, error } = await supabaseClient
        .from("tags")
        .update({ ...tagData, updated_at: new Date().toISOString() })
        .eq("id", tagId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        toast({ title: "خطا در به‌روزرسانی برچسب", description: error.message, variant: "destructive" });
        console.error("Error updating tag:", error);
        return null;
      }
      toast({ title: "برچسب به‌روزرسانی شد", description: `برچسب "${data.name}" با موفقیت به‌روزرسانی شد.` });
      return data;
    } catch (error) {
      toast({ title: "خطای ناشناخته", description: "مشکلی در به‌روزرسانی برچسب رخ داد.", variant: "destructive" });
      console.error("Unexpected error updating tag:", error);
      return null;
    }
  }, [user?.id, supabaseClient, toast]);

  const deleteTag = useCallback(async (tagId: string) => {
    if (!user?.id || !supabaseClient) {
      toast({ title: "خطا", description: "کاربر شناسایی نشد.", variant: "destructive" });
      return false;
    }
    try {
      const { error } = await supabaseClient
        .from("tags")
        .delete()
        .eq("id", tagId)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "خطا در حذف برچسب", description: error.message, variant: "destructive" });
        console.error("Error deleting tag:", error);
        return false;
      }
      toast({ title: "برچسب حذف شد" });
      return true;
    } catch (error) {
      toast({ title: "خطای ناشناخته", description: "مشکلی در حذف برچسب رخ داد.", variant: "destructive" });
      console.error("Unexpected error deleting tag:", error);
      return false;
    }
  }, [user?.id, supabaseClient, toast]);

  // Realtime subscription for tags
  useEffect(() => {
    if (!user?.id || !supabaseClient) return;

    const tagsChannel = supabaseClient
      .channel('use-tags-public-tags') // Unique channel name
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newTag = payload.new as Tag;
              setTags(prevTags => {
                if (prevTags.find(t => t.id === newTag.id)) return prevTags;
                return [...prevTags, newTag].sort((a,b) => a.name.localeCompare(b.name));
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedTag = payload.new as Tag;
              setTags(prevTags =>
                prevTags.map(tag => (tag.id === updatedTag.id ? { ...tag, ...updatedTag } : tag))
                         .sort((a,b) => a.name.localeCompare(b.name))
              );
            } else if (payload.eventType === 'DELETE') {
              const oldTagId = (payload.old as Tag).id;
              setTags(prevTags => prevTags.filter(tag => tag.id !== oldTagId));
            }
          }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('useTags: Subscribed to tags realtime channel');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('useTags: Tags channel error/timeout', err);
          toast({ title: "خطای اتصال بی‌درنگ", description: "مشکلی در همگام‌سازی بی‌درنگ برچسب‌ها رخ داده است.", variant: "warning" });
        }
      });

    return () => {
      if (tagsChannel) {
        supabaseClient.removeChannel(tagsChannel);
      }
    };
  }, [user?.id, supabaseClient, toast]);

  return {
    tags,
    loadingTags,
    loadTags, // Allow manual refresh
    addTag,
    updateTag,
    deleteTag,
    setTags, // Expose setter for advanced cases or testing
  };
}
