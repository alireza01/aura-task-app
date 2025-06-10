"use client"

import { useState, useEffect } from "react"
import { supabase as supabaseClientInstance } from "@/lib/supabase/client" // Changed import and aliased
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Edit3 } from "lucide-react"
import type { Task, TaskGroup, UserSettings, User, Tag } from "@/types"
import type { TaskFormData } from "@/types"
import TaskForm from "@/components/tasks/task-form"
// import { useLocalStorage } from "@/hooks/use-local-storage" // Removed

interface TaskFormModalProps {
  user: User | null
  groups: TaskGroup[]
  tags: Tag[]
  settings: UserSettings | null
  isOpen: boolean
  onClose: () => void
  onTaskSaved: () => void
  taskToEdit?: Task | null
  initialTitle?: string
}

export default function TaskFormModal({
  user,
  groups,
  tags,
  settings,
  isOpen,
  onClose,
  onTaskSaved,
  taskToEdit = null,
  initialTitle = "",
}: TaskFormModalProps) {
  const [loading, setLoading] = useState(false)
  // const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", []) // Removed
  const showToast = toast
  // const [supabaseClient, setSupabaseClient] = useState<any>(null) // Removed state
  // useEffect for setting supabaseClient removed

  const isEditMode = !!taskToEdit
  const modalTitle = isEditMode ? `ویرایش وظیفه: ${taskToEdit?.title}` : "ایجاد وظیفه جدید"

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleEscape)
      // Focus management - focus first input when modal opens
      const firstInput = document.querySelector('[data-modal-content] input[type="text"]') as HTMLInputElement
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100)
      }
    }

    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  const handleSaveTask = async (taskData: TaskFormData & { selectedTags: string[] }) => {
    setLoading(true)

    try {
      if (user && supabaseClientInstance) { // Use aliased instance
        // Save to Supabase
        if (isEditMode) {
          // Update existing task
          const { error: taskError } = await supabaseClientInstance // Use aliased instance
            .from("tasks")
            .update({
              title: taskData.title,
              description: taskData.description || null,
              group_id: taskData.groupId || null,
              speed_score: taskData.speedScore,
              importance_score: taskData.importanceScore,
              emoji: taskData.emoji,
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskToEdit!.id)

          if (taskError) throw taskError

          // Granular Subtask Update Logic
          const newSubtaskTitles = (taskData.subtasks || []).map(st => st.trim());
          const { data: existingSubtasksData, error: fetchSubtasksError } = await supabaseClientInstance // Use aliased instance
            .from("subtasks")
            .select("id, title, order_index") // Fetched order_index too
            .eq("task_id", taskToEdit!.id);

          if (fetchSubtasksError) throw fetchSubtasksError;
          const existingSubtasks = existingSubtasksData || [];

          const subtasksToDelete = existingSubtasks.filter(dbSt => !newSubtaskTitles.includes(dbSt.title));
          if (subtasksToDelete.length > 0) {
            const deleteError = await supabaseClientInstance.from("subtasks").delete().in("id", subtasksToDelete.map(st => st.id)); // Use aliased instance
            if (deleteError.error) throw deleteError.error;
          }

          const subtasksToAdd = [];
          const subtasksToUpdateOrder = [];

          for (let i = 0; i < newSubtaskTitles.length; i++) {
            const newTitle = newSubtaskTitles[i];
            const existing = existingSubtasks.find(dbSt => dbSt.title === newTitle);
            if (existing) {
              // Check if order_index needs update
              if (existing.order_index !== i) {
                subtasksToUpdateOrder.push({ id: existing.id, order_index: i });
              }
            } else {
              subtasksToAdd.push({ task_id: taskToEdit!.id, title: newTitle, order_index: i, completed: false });
            }
          }

          if (subtasksToAdd.length > 0) {
            const { error: insertSubtasksError } = await supabaseClientInstance.from("subtasks").insert(subtasksToAdd); // Use aliased instance
            if (insertSubtasksError) throw insertSubtasksError;
          }

          for (const subtask of subtasksToUpdateOrder) {
            const { error: updateOrderError } = await supabaseClientInstance // Use aliased instance
              .from("subtasks")
              .update({ order_index: subtask.order_index })
              .eq("id", subtask.id);
            if (updateOrderError) throw updateOrderError;
          }

          // Granular Tag Update Logic
          const selectedTagIds = taskData.selectedTags || [];
          const { data: existingTaskTagsData, error: fetchTagsError } = await supabaseClientInstance // Use aliased instance
            .from("task_tags")
            .select("tag_id")
            .eq("task_id", taskToEdit!.id);

          if (fetchTagsError) throw fetchTagsError;
          const existingTagIds = (existingTaskTagsData || []).map(ett => ett.tag_id);

          const tagsToDelete = existingTagIds.filter(tagId => !selectedTagIds.includes(tagId));
          if (tagsToDelete.length > 0) {
            const { error: deleteTagsError } = await supabaseClientInstance // Use aliased instance
              .from("task_tags")
              .delete()
              .eq("task_id", taskToEdit!.id)
              .in("tag_id", tagsToDelete);
            if (deleteTagsError) throw deleteTagsError;
          }

          const tagsToAdd = selectedTagIds.filter(tagId => !existingTagIds.includes(tagId));
          if (tagsToAdd.length > 0) {
            const tagInserts = tagsToAdd.map(tagId => ({ task_id: taskToEdit!.id, tag_id: tagId }));
            const { error: insertTagsError } = await supabaseClientInstance.from("task_tags").insert(tagInserts); // Use aliased instance
            if (insertTagsError) throw insertTagsError;
          }

          showToast("وظیفه به‌روزرسانی شد", {
            description: "تغییرات با موفقیت ذخیره شد.",
          })
        } else {
          // Create new task
          const { data: newTask, error: taskError } = await supabaseClientInstance // Use aliased instance
            .from("tasks")
            .insert({
              user_id: user.id,
              title: taskData.title,
              description: taskData.description || null,
              group_id: taskData.groupId || null,
              speed_score: taskData.speedScore,
              importance_score: taskData.importanceScore,
              emoji: taskData.emoji,
              order_index: 0,
            })
            .select()
            .single()

          if (taskError) throw taskError

          // Handle subtasks creation
          if (taskData.subtasks && taskData.subtasks.length > 0) {
            const subtaskInserts = taskData.subtasks.map((subtask: string, index: number) => ({
              task_id: newTask.id,
              title: subtask.trim(),
              order_index: index,
            }))

            await supabaseClientInstance.from("subtasks").insert(subtaskInserts) // Use aliased instance
          }

          showToast("وظیفه ایجاد شد", {
            description: "وظیفه جدید با موفقیت ایجاد شد.",
          })
        }
      }
      // Removed guest user logic block here
      // If there's no 'user' (Supabase user, including anonymous), we should not attempt to save.
      // This path should ideally not be hit if AppInitializer ensures a user (anonymous or real) always exists.
      // Or if UI prevents action. For safety, we can add a check:
      else if (!user) {
         console.warn("Attempted to save task without a user session. Task save aborted.");
        showToast("خطا: عدم شناسایی کاربر", {
          description: "امکان ذخیره وظیفه بدون کاربر معتبر وجود ندارد. لطفاً وارد شوید.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      onTaskSaved()
      onClose()
    } catch (error: unknown) {
      console.error("خطا در ذخیره وظیفه:", error);
      let errorMessage = "مشکلی در ذخیره وظیفه رخ داد. لطفاً دوباره تلاش کنید.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      showToast("خطا در ذخیره وظیفه", {
        description: errorMessage,
        duration: 3000,
        className: "bg-red-500 text-white",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-0" data-modal-content>
            <DialogHeader className="flex flex-row-reverse items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: isEditMode ? 0 : 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {isEditMode ? <Edit3 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                </motion.div>
                {modalTitle}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full" aria-label="بستن">
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <TaskForm
                user={user}
                groups={groups}
                tags={tags}
                settings={settings}
                taskToEdit={taskToEdit}
                initialTitle={initialTitle}
                loading={loading}
                onSave={handleSaveTask}
                onCancel={onClose}
                isEditMode={isEditMode}
              />
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
