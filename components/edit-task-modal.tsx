"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Task, TaskGroup, UserSettings, Tag, User, GuestUser } from "@/types"
import { Edit3 } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"
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
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", [])
  const showToast = toast

  const handleSaveTask = async (formData: any) => {
    setLoading(true)
    try {
      if (user) {
        // Update in database
        const { error: taskError } = await supabase
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
        await supabase.from("subtasks").delete().eq("task_id", task.id)
        if (formData.subtasks && formData.subtasks.length > 0) {
          const subtaskInserts = formData.subtasks.map((subtaskTitle: string, index: number) => ({
            task_id: task.id,
            title: subtaskTitle.trim(),
            order_index: index,
          }))
          await supabase.from("subtasks").insert(subtaskInserts)
        }

        // Update tags
        await supabase.from("task_tags").delete().eq("task_id", task.id)
        if (formData.selectedTags && formData.selectedTags.length > 0) {
          const tagInserts = formData.selectedTags.map((tagId: string) => ({
            task_id: task.id,
            tag_id: tagId,
          }))
          await supabase.from("task_tags").insert(tagInserts)
        }
      } else {
        // Update in local storage
        const updatedTask: Task = {
          ...task,
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          group_id: formData.groupId === "none" ? null : formData.groupId,
          speed_score: formData.speedScore,
          importance_score: formData.importanceScore,
          emoji: formData.emoji,
          updated_at: new Date().toISOString(),
          tags: formData.selectedTags.map((tagId: string) => tags.find((t) => t.id === tagId)!).filter(Boolean),
          subtasks: formData.subtasks.map((title: string, index: number) => ({
            id: `${Date.now()}-${index}`,
            task_id: task.id,
            title: title.trim(),
            completed: false,
            order_index: index,
            created_at: new Date().toISOString(),
          })),
        }

        const updatedTasks = localTasks.map((t) => (t.id === task.id ? updatedTask : t))
        setLocalTasks(updatedTasks)
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
