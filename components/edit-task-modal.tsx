"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Task, TaskGroup, UserSettings, Tag, User, GuestUser } from "@/types"
import { Edit3 } from "lucide-react"
import { toast } from "sonner"
import TaskForm from "@/components/tasks/task-form"

interface EditTaskModalProps {
  user: User | null
  guestUser: GuestUser | null
  task: Task
  groups: TaskGroup[]
  tags: Tag[]
  settings: UserSettings | null
  onClose: () => void
  onTaskUpdated: () => void
}

export default function EditTaskModal({
  user,
  guestUser,
  task,
  groups,
  tags,
  settings,
  onClose,
  onTaskUpdated,
}: EditTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const showToast = toast
  const supabaseClient = createClient()

  const handleSaveTask = async (formData: any) => {
    setLoading(true)
    try {
      // Ensure we have a user session, even for guests
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser();

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Update in database
      const { error: taskError } = await supabaseClient
        .from("tasks")
          .update({
            title: formData.title.trim(),
            description: formData.description?.trim() || null,
            group_id: formData.groupId === "none" ? null : formData.groupId,
            speed_score: formData.speedScore,
            importance_score: formData.importanceScore,
            emoji: formData.emoji,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id)

        if (taskError) throw taskError

        // Update subtasks
        await supabaseClient.from("subtasks").delete().eq("task_id", task.id)
        if (formData.subtasks && formData.subtasks.length > 0) {
          const subtaskInserts = formData.subtasks.map((subtaskTitle: string, index: number) => ({
            task_id: task.id,
            title: subtaskTitle.trim(),
            order_index: index,
            user_id: currentUser.id, // Add user_id for subtasks
          }))
          await supabaseClient.from("subtasks").insert(subtaskInserts)
        }

        // Update tags
        await supabaseClient.from("task_tags").delete().eq("task_id", task.id)
        if (formData.selectedTags && formData.selectedTags.length > 0) {
          const tagInserts = formData.selectedTags.map((tagId: string) => ({
            task_id: task.id,
            tag_id: tagId,
            user_id: currentUser.id, // Add user_id for task_tags
          }))
          await supabaseClient.from("task_tags").insert(tagInserts)
        }

      showToast("وظیفه به‌روزرسانی شد", {
        description: "تغییرات با موفقیت ذخیره شد.",
      })

      onTaskUpdated()
      onClose()
    } catch (error) {
      console.error("خطا در به‌روزرسانی وظیفه:", error)
      showToast("خطا در به‌روزرسانی", {
        description: "مشکلی در ذخیره تغییرات رخ داد.",
        duration: 3000,
        className: "bg-red-500 text-white",
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
            <Edit3 className="w-5 h-5 text-primary" />
            ویرایش وظیفه
          </DialogTitle>
        </DialogHeader>
        <TaskForm
          user={user}
          guestUser={guestUser}
          groups={groups}
          tags={tags}
          settings={settings}
          taskToEdit={task}
          loading={loading}
          onSave={handleSaveTask}
          onCancel={onClose}
          isEditMode={true}
        />
      </DialogContent>
    </Dialog>
  )
}
