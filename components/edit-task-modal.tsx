"use client"

import React, { useState, useEffect, useMemo } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { GuestUser, Task, TaskGroup, Tag, UserSettings } from '@/types';

import { useTaskStore } from '@/stores/taskStore';
import { useGroupStore } from '@/stores/groupStore';
import { useTagStore } from '@/stores/tagStore';
// import { useSettingsStore } from '@/stores/settingsStore'; // Not strictly needed if not reprocessing with AI
import { useUIStore } from '@/stores/uiStore';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface EditTaskModalProps {
  user: SupabaseUser | null;
  guestUser: GuestUser | null;
  // task prop is removed; will be fetched from store based on taskToEditId
  // onClose and onTaskUpdated props are removed
}

export default function EditTaskModal({ user, guestUser }: EditTaskModalProps) {
  const { toast } = useToast();

  // UI store states and actions
  const { isEditTaskModalOpen, taskToEditId, closeEditTaskModal } = useUIStore((state) => ({
    isEditTaskModalOpen: state.isEditTaskModalOpen,
    taskToEditId: state.taskToEditId,
    closeEditTaskModal: state.closeEditTaskModal,
  }));

  // Data store states and actions
  // Directly use the tasks array and find the task. This ensures it's always up-to-date.
  const taskFromStore = useTaskStore((state) => state.tasks.find(t => t.id === taskToEditId));
  const updateTaskInStore = useTaskStore((state) => state.updateTask);
  const taskStoreError = useTaskStore((state) => state.errorUpdatingTask);
  const groups = useGroupStore((state) => state.groups);
  const tags = useTagStore((state) => state.tags);
  // const userSettings = useSettingsStore((state) => state.userSettings); // For AI, if added

  // taskToEdit is effectively taskFromStore, using a more direct name.
  const taskToEdit = taskFromStore;

  // Local form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]); // Placeholder for future multi-tag select
  const [isProcessing, setIsProcessing] = useState(false);

  // Populate form when taskToEdit changes (modal opens with a task)
  useEffect(() => {
    if (taskToEdit && isEditTaskModalOpen) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setSelectedGroupId(taskToEdit.group_id || null);
      // Ensure taskToEdit.tags is an array before mapping
      setSelectedTagIds(Array.isArray(taskToEdit.tags) ? taskToEdit.tags.map(t => t.id) : []);
    } else if (!isEditTaskModalOpen) { // Reset form when modal is closed
      setTitle('');
      setDescription('');
      setSelectedGroupId(null);
      setSelectedTagIds([]);
      setIsProcessing(false);
    }
  }, [taskToEdit, isEditTaskModalOpen]);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!taskToEdit) {
      toast({ title: "No task selected for editing", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const taskUpdates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined, // Use undefined for empty optional fields
      group_id: selectedGroupId,
      // tags: selectedTagIds.map(id => tags.find(t => t.id === id)).filter(Boolean) as Tag[],
      // For now, assume taskStore's updateTask handles tag associations if needed,
      // or backend does via tag_ids if that were the update mechanism.
      // If taskStore.updateTask expects full tag objects for updates, this needs adjustment.
      // If it expects tag_ids, that would be different.
      // Current taskStore.updateTask only updates core fields, not relations directly.
    };

    const updatedTask = await updateTaskInStore(taskToEdit.id, taskUpdates, user?.id || null, guestUser);
    setIsProcessing(false);

    if (updatedTask) {
      toast({ title: "Task Updated", description: `"${updatedTask.title}" was successfully updated.` });
      closeEditTaskModal();
    } else {
      toast({
        title: "Failed to Update Task",
        description: taskStoreError || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  if (!isEditTaskModalOpen || !taskToEdit) {
    return null; // Don't render if modal is closed or no task is selected
  }

  return (
    <Dialog open={isEditTaskModalOpen} onOpenChange={(isOpen) => { if (!isOpen) closeEditTaskModal(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ویرایش وظیفه: {taskToEdit.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-task-title">عنوان وظیفه</Label>
            <Input id="edit-task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-task-description">توضیحات (اختیاری)</Label>
            <Textarea id="edit-task-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-task-group">گروه (اختیاری)</Label>
              <Select value={selectedGroupId || "none"} onValueChange={(value) => setSelectedGroupId(value === "none" ? null : value)}>
                <SelectTrigger id="edit-task-group">
                  <SelectValue placeholder="انتخاب گروه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون گروه</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.emoji} {group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-task-tags">برچسب‌ها (اختیاری)</Label>
              {/* Basic Tag Selector Placeholder - A multi-select component would be better */}
              <Select
                value={selectedTagIds[0] || ""} // Simplified: assumes single tag selection for now
                onValueChange={(value) => setSelectedTagIds(value ? [value] : [])}
                disabled={tags.length === 0}
              >
                 <SelectTrigger id="edit-task-tags">
                    <SelectValue placeholder={tags.length > 0 ? "انتخاب برچسب" : "برچسبی موجود نیست"} />
                 </SelectTrigger>
                 <SelectContent>
                    {tags.map(tag => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
                 </SelectContent>
               </Select>
            </div>
          </div>

          {/* AI Re-processing could be added here if desired */}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">لغو</Button>
            </DialogClose>
            <Button type="submit" disabled={isProcessing || !title.trim()}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
