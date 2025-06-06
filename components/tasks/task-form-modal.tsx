"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Edit3 } from "lucide-react"
import type { Task, TaskGroup, UserSettings, User, GuestUser, Tag } from "@/types"
import type { TaskFormData } from "@/types"
import TaskForm from "@/components/tasks/task-form"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface TaskFormModalProps {
  user: User | null
  guestUser: GuestUser | null
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
  guestUser,
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
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", [])
  const showToast = toast

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
      if (user) {
        // Save to Supabase
        if (isEditMode) {
          // Update existing task
          const { error: taskError } = await supabase
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

          // Handle subtasks update
          if (taskData.subtasks && taskData.subtasks.length > 0) {
            // Delete existing subtasks
            await supabase.from("subtasks").delete().eq("task_id", taskToEdit!.id)

            // Insert new subtasks
            const subtaskInserts = taskData.subtasks.map((subtask: string, index: number) => ({
              task_id: taskToEdit!.id,
              title: subtask.trim(),
              order_index: index,
            }))

            await supabase.from("subtasks").insert(subtaskInserts)
          }

          showToast("وظیفه به‌روزرسانی شد", {
            description: "تغییرات با موفقیت ذخیره شد.",
          })
        } else {
          // Create new task
          const { data: newTask, error: taskError } = await supabase
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

            await supabase.from("subtasks").insert(subtaskInserts)
          }

          showToast("وظیفه ایجاد شد", {
            description: "وظیفه جدید با موفقیت ایجاد شد.",
          })
        }
      } else {
        // Save to local storage
        if (isEditMode) {
          const updatedTasks = localTasks.map((task: Task) =>
            task.id === taskToEdit!.id
              ? ({
                  ...task,
                  title: taskData.title,
                  description: taskData.description || undefined,
                  group_id: taskData.groupId || null,
                  speed_score: taskData.speedScore,
                  importance_score: taskData.importanceScore,
                  emoji: taskData.emoji,
                  updated_at: new Date().toISOString(),
                  subtasks:
                    taskData.subtasks?.map((title: string, index: number) => ({
                      id: `${Date.now()}-${index}`,
                      task_id: taskToEdit!.id,
                      title: title.trim(),
                      completed: false,
                      order_index: index,
                      created_at: new Date().toISOString(),
                    })) || [],
                  tags: tags.filter((tag) => taskData.selectedTags.includes(tag.id)),
                } as Task)
              : task,
          )
          setLocalTasks(updatedTasks)

          showToast("وظیفه به‌روزرسانی شد", {
            description: "تغییرات در حافظه محلی ذخیره شد.",
          })
        } else {
          const newTask: Task = {
            id: Date.now().toString(),
            user_id: guestUser?.id || "guest",
            title: taskData.title,
            description: taskData.description || undefined,
            group_id: taskData.groupId || null,
            speed_score: taskData.speedScore,
            importance_score: taskData.importanceScore,
            emoji: taskData.emoji,
            order_index: localTasks.length,
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            subtasks:
              taskData.subtasks?.map((title: string, index: number) => ({
                id: `${Date.now()}-${index}`,
                task_id: Date.now().toString(),
                title: title.trim(),
                completed: false,
                order_index: index,
                created_at: new Date().toISOString(),
              })) || [],
            tags: tags.filter((tag) => taskData.selectedTags.includes(tag.id)),
          }

          setLocalTasks([...localTasks, newTask])

          showToast("وظیفه ایجاد شد", {
            description: "وظیفه جدید در حافظه محلی ذخیره شد.",
          })
        }
      }

      onTaskSaved()
      onClose()
    } catch (error) {
      console.error("خطا در ذخیره وظیفه:", error)
      showToast("خطا در ذخیره وظیفه", {
        description: "مشکلی در ذخیره وظیفه رخ داد. لطفاً دوباره تلاش کنید.",
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
                guestUser={guestUser}
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
