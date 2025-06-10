"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { TaskGroup, Tag, UserSettings, User, Task } from "@/types/index" // Removed GuestUser
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
// import { useLocalStorage } from "@/hooks/use-local-storage" // Removed
import { useToast } from "@/components/ui/use-toast"
import TaskForm from "@/components/tasks/task-form"

interface AddTaskModalProps {
  user: User | null // This will always be a Supabase user (guest or registered)
  // guestUser: GuestUser | null // Removed
  groups: TaskGroup[]
  tags: Tag[]
  settings: UserSettings | null
  onClose: () => void
  onTaskAdded: () => void
  initialTitle?: string
}

export default function AddTaskModal({
  user,
  // guestUser, // Removed
  groups,
  tags,
  settings,
  onClose,
  onTaskAdded,
  initialTitle = "",
}: AddTaskModalProps) {
  const [loading, setLoading] = useState(false)
  // const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", []) // Removed
  const { toast } = useToast()
  const supabase = createClient()

  const handleSaveTask = async (formData: any) => {
    setLoading(true)
    try {
      if (!user || !user.id) { // User should always exist here (guest or registered Supabase user)
        throw new Error("User not available. Cannot save task.");
      }

      // Always save to Supabase
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id, // Use the Supabase user's ID
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          group_id: formData.groupId === "none" ? null : formData.groupId,
          speed_score: formData.speedScore,
          importance_score: formData.importanceScore,
          emoji: formData.emoji,
          order_index: 0, // TODO: Determine correct order_index, perhaps based on existing tasks for the user
        })
        .select()
        .single()

      if (taskError) {
        throw taskError
      }

      if (task && formData.subtasks && formData.subtasks.length > 0) {
        const subtaskInserts = formData.subtasks.map((subtaskTitle: string, index: number) => ({
          task_id: task.id,
          title: subtaskTitle.trim(),
          order_index: index,
          // user_id: user.id, // Not needed if subtasks table RLS uses task_id to link to user's task
        }))
        const { error: subtaskError } = await supabase.from("subtasks").insert(subtaskInserts)
        if (subtaskError) {
            console.warn("Error saving subtasks, but main task saved:", subtaskError.message);
            // Optionally toast a warning about subtasks
        }
      }

      if (task && formData.selectedTags && formData.selectedTags.length > 0) {
        const tagInserts = formData.selectedTags.map((tagId: string) => ({
          task_id: task.id,
          tag_id: tagId,
          // user_id: user.id, // Not needed if task_tags table RLS uses task_id/tag_id to link to user's items
        }))
        const { error: tagError } = await supabase.from("task_tags").insert(tagInserts)
         if (tagError) {
            console.warn("Error saving task tags, but main task saved:", tagError.message);
            // Optionally toast a warning about tags
        }
      }

      toast({
        title: "وظیفه با موفقیت ایجاد شد!",
        description: "وظیفه جدید شما با موفقیت اضافه شد.",
      })

      onTaskAdded() // This should trigger a refresh in TaskDashboard
      onClose()

    } catch (error: any) {
      console.error("خطا در ایجاد وظیفه:", error)
      toast({
        title: "خطا در ایجاد وظیفه",
        description: error.message || "مشکلی در ذخیره وظیفه رخ داد. لطفاً دوباره امتحان کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card border-0 max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Plus className="w-5 h-5 text-primary" />
            وظیفه جدید
          </DialogTitle>
        </DialogHeader>
        <TaskForm
          user={user}
          // guestUser prop removed from TaskForm if it existed there
          groups={groups}
          tags={tags}
          settings={settings}
          initialTitle={initialTitle}
          loading={loading}
          onSave={handleSaveTask}
          onCancel={onClose}
          isEditMode={false}
        />
      </DialogContent>
    </Dialog>
  )
}
