"use client"

import React, { useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { GuestUser, Task, TaskGroup, Tag, UserSettings } from '@/types';

import { useTaskStore } from '@/stores/taskStore';
import { useGroupStore } from '@/stores/groupStore';
import { useTagStore } from '@/stores/tagStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming Checkbox is used for AI options
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Wand2, AlertCircle } from 'lucide-react'; // Icons

interface AddTaskModalProps {
  user: SupabaseUser | null;
  guestUser: GuestUser | null;
  // onClose and onTaskAdded props are removed, handled by uiStore and taskStore
}

export default function AddTaskModal({ user, guestUser }: AddTaskModalProps) {
  const { toast } = useToast();

  // Store states
  const groups = useGroupStore((state) => state.groups);
  const tags = useTagStore((state) => state.tags);
  const userSettings = useSettingsStore((state) => state.userSettings);
  const addTaskToStore = useTaskStore((state) => state.addTask);
  const taskStoreError = useTaskStore((state) => state.errorUpdatingTask); // For errors from addTask

  // UI store actions
  const { isAddTaskModalOpen, closeAddTaskModal } = useUIStore((state) => ({
    isAddTaskModalOpen: state.isAddTaskModalOpen,
    closeAddTaskModal: state.closeAddTaskModal,
  }));

  // Local form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]); // For multi-select if implemented

  const [autoRank, setAutoRank] = useState(false);
  const [autoSubtasks, setAutoSubtasks] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isAddTaskModalOpen) {
      setTitle('');
      setDescription('');
      setSelectedGroupId(null);
      setSelectedTagIds([]);
      setAutoRank(false);
      setAutoSubtasks(false);
      setIsProcessingAI(false);
      setAiError(null);
    }
  }, [isAddTaskModalOpen, user, guestUser]);

  const canUseAI = user && userSettings?.gemini_api_key;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setAiError(null); // Clear previous AI errors

    let taskDataFromForm: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'subtasks' | 'tags'>> = {
      title: title.trim(),
      description: description.trim() || undefined, // Use undefined for empty optional fields
      group_id: selectedGroupId,
      // selected_tags: selectedTagIds, // Pass IDs for backend to handle junction table
    };

    let finalTaskData = { ...taskDataFromForm };


    if ((autoRank || autoSubtasks) && canUseAI && user) {
      setIsProcessingAI(true);
      try {
        const response = await fetch('/api/process-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: finalTaskData.title,
            description: finalTaskData.description,
            autoRanking: autoRank,
            autoSubtasks: autoSubtasks,
            userId: user.id,
          }),
        });

        const aiResult = await response.json();

        if (!response.ok) {
          throw new Error(aiResult.error || `AI processing failed with status ${response.status}`);
        }

        // Merge AI results. Ensure not to overwrite existing fields with undefined from AI if AI didn't return them.
        finalTaskData = {
          ...finalTaskData,
          ...(aiResult.speedScore && { speed_score: aiResult.speedScore }),
          ...(aiResult.importanceScore && { importance_score: aiResult.importanceScore }),
          ...(aiResult.emoji && { emoji: aiResult.emoji }),
          // Subtasks need special handling - taskStore.addTask might not support direct subtask creation.
          // This might involve a subsequent call or a more complex addTask payload.
          // For now, AI subtasks are not directly added to the task object here.
        };
        toast({ title: "AI Processing Complete", description: "Task details enhanced by AI."});

      } catch (error: any) {
        console.error("AI Processing Error:", error);
        setAiError(error.message || "An unknown error occurred during AI processing.");
        toast({ title: "AI Processing Failed", description: error.message, variant: "destructive"});
        // Continue without AI data if it fails
      } finally {
        setIsProcessingAI(false);
      }
    }

    // Disable button during store operation as well
    setIsProcessingAI(true); // Re-use for general processing indication
    const newTask = await addTaskToStore(finalTaskData, user?.id || null, guestUser);
    setIsProcessingAI(false);


    if (newTask) {
      toast({ title: "Task Added", description: `"${newTask.title}" was successfully added.` });
      closeAddTaskModal();
    } else {
      toast({
        title: "Failed to Add Task",
        description: taskStoreError || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  if (!isAddTaskModalOpen) {
    return null; // Don't render if not open
  }

  return (
    <Dialog open={isAddTaskModalOpen} onOpenChange={(isOpen) => { if (!isOpen) closeAddTaskModal(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>افزودن وظیفه جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="task-title">عنوان وظیفه</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: نوشتن گزارش هفتگی" />
          </div>
          <div>
            <Label htmlFor="task-description">توضیحات (اختیاری)</Label>
            <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="جزئیات بیشتر در مورد وظیفه..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-group">گروه (اختیاری)</Label>
              <Select value={selectedGroupId || ""} onValueChange={(value) => setSelectedGroupId(value === "none" ? null : value)}>
                <SelectTrigger id="task-group">
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
              {/* Basic Tag Selector Placeholder - A multi-select component would be better */}
              <Label htmlFor="task-tags">برچسب‌ها (اختیاری)</Label>
               <Select onValueChange={(value) => setSelectedTagIds(value ? [value] : [])} value={selectedTagIds[0] || ""} disabled={tags.length === 0}>
                 <SelectTrigger id="task-tags">
                    <SelectValue placeholder={tags.length > 0 ? "انتخاب برچسب" : "برچسبی موجود نیست"} />
                 </SelectTrigger>
                 <SelectContent>
                    {tags.map(tag => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
                 </SelectContent>
               </Select>
            </div>
          </div>

          {user && userSettings?.gemini_api_key && (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-medium flex items-center"><Wand2 className="h-4 w-4 mr-2 text-purple-500"/>پردازش با هوش مصنوعی</h3>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse"> {/* Use rtl:space-x-reverse for RTL support */}
                <Checkbox id="auto-rank" checked={autoRank} onCheckedChange={(checked) => setAutoRank(!!checked)} disabled={!canUseAI || isProcessingAI} />
                <Label htmlFor="auto-rank" className="text-sm font-normal cursor-pointer">رتبه‌بندی خودکار (سرعت/اهمیت)</Label>
              </div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Checkbox id="auto-subtasks" checked={autoSubtasks} onCheckedChange={(checked) => setAutoSubtasks(!!checked)} disabled={!canUseAI || isProcessingAI} />
                <Label htmlFor="auto-subtasks" className="text-sm font-normal cursor-pointer">پیشنهاد وظایف فرعی</Label>
              </div>
              {aiError && (
                <p className="text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1"/>خطای هوش مصنوعی: {aiError}</p>
              )}
            </div>
          )}
           {!user && (
             <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">برای استفاده از ویژگی‌های هوش مصنوعی و ذخیره دائمی اطلاعات، <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { closeAddTaskModal(); useUIStore.getState().openSignInPromptModal();}}>وارد شوید</Button>.</p>
             </div>
           )}


          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">لغو</Button>
            </DialogClose>
            <Button type="submit" disabled={isProcessingAI || !title.trim()}>
              {isProcessingAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessingAI ? 'در حال پردازش...' : 'افزودن وظیفه'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
