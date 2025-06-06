"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { Task, Subtask } from "@/types" // Added Subtask type
import { Clock, Star, ChevronDown, ChevronUp, MoreHorizontal, Edit, Trash2, GripVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion" // Added AnimatePresence

interface TaskCardProps {
  task: Task
  onComplete: (taskId: string, completed: boolean) => Promise<void> // Modified to pass taskId and completed status
  onUpdate: () => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export function TaskCard({ task, onComplete, onUpdate, onEdit, onDelete }: TaskCardProps) {
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [completingSubtask, setCompletingSubtask] = useState<string | null>(null)

  const handleCompleteTask = async (checked: boolean) => {
    await onComplete(task.id, checked)
  }

  const completeSubtask = async (subtaskId: string) => {
    setCompletingSubtask(subtaskId)
    const originalSubtasks = task.subtasks || []

    // Optimistic update
    const updatedSubtasks = originalSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: true, completed_at: new Date().toISOString() } : st,
    )
    // This requires the parent to update the task prop, which TaskDashboard's realtime will do.
    // For immediate visual feedback, we might need a local state for subtasks if onUpdate is slow.
    // However, since TaskDashboard now has realtime, onUpdate should trigger a quick re-render.

    try {
      const { error } = await supabase
        .from("subtasks")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", subtaskId)
      if (error) throw error
      onUpdate() // Trigger parent to re-fetch/update tasks
    } catch (error) {
      console.error("Error completing subtask:", error)
      // Revert optimistic update if needed, but with realtime, the server state will quickly correct it.
      onUpdate() // Ensure UI is consistent with server on error
    } finally {
      setCompletingSubtask(null)
    }
  }

  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter((st) => st.completed).length
  const tags = task.tags || []

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="task-card border-0 bg-card shadow-sm hover:shadow-md">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={handleCompleteTask} // Changed to handleCompleteTask
                  className="h-5 w-5 rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  aria-label={`Mark task "${task.title}" as complete`}
                />
                <div className="flex-1 min-w-0">
                  {/* Task Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {task.emoji && <span className="text-lg">{task.emoji}</span>}
                        <motion.h3
                          className={cn(
                            "font-medium text-foreground hover:text-primary transition-colors cursor-pointer relative",
                            task.completed && "line-through-animated",
                          )}
                          onClick={() => onEdit && onEdit(task)}
                          animate={{
                            opacity: task.completed ? 0.7 : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {task.title}
                        </motion.h3>
                      </div>

                      {task.description && (
                        <motion.p
                          className={cn(
                            "text-sm text-muted-foreground mb-3 leading-relaxed",
                            task.completed && "line-through-animated",
                          )}
                          animate={{
                            opacity: task.completed ? 0.7 : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {task.description}
                        </motion.p>
                      )}

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className={cn("tag rounded-full px-2 py-0 text-xs font-normal", `tag-${tag.color}`)}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* AI Scores */}
                      {(task.speed_score || task.importance_score) && (
                        <div className="flex items-center gap-2 mb-3">
                          {task.speed_score && (
                            <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5 text-[0.7rem]">
                              <Clock className="h-3 w-3" />
                              <span>{task.speed_score}/20</span>
                            </Badge>
                          )}
                          {task.importance_score && (
                            <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5 text-[0.7rem]">
                              <Star className="h-3 w-3" />
                              <span>{task.importance_score}/20</span>
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Subtasks Summary */}
                      {subtasks.length > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {completedSubtasks}/{subtasks.length}
                            </span>
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                              />
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSubtasks(!showSubtasks)}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            {showSubtasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit && onEdit(task)}>
                    <Edit className="ml-2 h-4 w-4" />
                    <span>ویرایش</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete && onDelete(task.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    <span>حذف</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Subtasks */}
          {showSubtasks && subtasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-2 border-t border-border pt-3"
            >
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => completeSubtask(subtask.id)}
                    disabled={completingSubtask === subtask.id}
                    className="h-4 w-4 rounded-sm"
                  />
                  <motion.span
                    className={cn("text-sm flex-1 relative", subtask.completed && "line-through-animated")}
                    animate={{
                      opacity: subtask.completed ? 0.7 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {subtask.title}
                  </motion.span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
