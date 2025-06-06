"use client"

import type React from "react"
import { useState } from "react"
import type { GuestUser, TaskGroup, Tag, UserSettings, User, Task } from "@/types/index"
import { supabase } from "@/lib/supabaseClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useToast } from "@/components/ui/use-toast"
import TaskForm from "@/components/tasks/task-form"

interface AddTaskModalProps {
  user: User | null
  guestUser: GuestUser | null
  groups: TaskGroup[]
  tags: Tag[]
  settings: UserSettings | null
  onClose: () => void
  onTaskAdded: () => void
  initialTitle?: string
}

export default function AddTaskModal({
  user,
  guestUser,
  groups,
  tags,
  settings,
  onClose,
  onTaskAdded,
  initialTitle = "",
}: AddTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", [])
  const { toast } = useToast()

  const handleSaveTask = async (formData: any) => {
    setLoading(true)
    try {
      if (user) {
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: formData.title.trim(),
            description: formData.description?.trim() || null,
            group_id: formData.groupId === "none" ? null : formData.groupId,
            speed_score: formData.speedScore,
            importance_score: formData.importanceScore,
            emoji: formData.emoji,
            order_index: 0,
          })
          .select()
          .single()

        if (taskError) {
          throw taskError
        }

        if (formData.subtasks && formData.subtasks.length > 0) {
          const subtaskInserts = formData.subtasks.map((subtaskTitle: string, index: number) => ({
            task_id: task.id,
            title: subtaskTitle.trim(),
            order_index: index,
          }))
          await supabase.from("subtasks").insert(subtaskInserts)
        }

        if (formData.selectedTags && formData.selectedTags.length > 0) {
          const tagInserts = formData.selectedTags.map((tagId: string) => ({
            task_id: task.id,
            tag_id: tagId,
          }))
          await supabase.from("task_tags").insert(tagInserts)
        }

        toast({
          title: "وظیفه با موفقیت ایجاد شد!",
          description: "وظیفه جدید شما با موفقیت اضافه شد.",
        })
      } else if (guestUser) {
        const newTask: Task = {
          id: Date.now().toString(),
          user_id: guestUser.id,
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          group_id: formData.groupId === "none" ? null : formData.groupId,
          speed_score: formData.speedScore,
          importance_score: formData.importanceScore,
          emoji: formData.emoji,
          order_index: localTasks.length,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          subtasks: formData.subtasks.map((subtaskTitle: string, index: number) => ({
            id: `${Date.now()}-${index}`,
            task_id: Date.now().toString(),
            title: subtaskTitle.trim(),
            completed: false,
            order_index: index,
            created_at: new Date().toISOString(),
          })),
          tags: formData.selectedTags.map((tagId: string) => tags.find((t) => t.id === tagId)!).filter(Boolean),
        }
        setLocalTasks([...localTasks, newTask])
        toast({
          title: "وظیفه در حافظه محلی ایجاد شد!",
          description: "وظیفه جدید شما در مرورگر ذخیره شد.",
        })
      }

      onTaskAdded()
      onClose()
    } catch (error) {
      console.error("خطا در ایجاد وظیفه:", error)
      toast({
        title: "خطا در ایجاد وظیفه",
        description: "مشکلی در ذخیره وظیفه رخ داد. لطفاً دوباره امتحان کنید.",
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
          guestUser={guestUser}
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
