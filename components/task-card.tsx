"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
  onComplete: (taskId: string, completed: boolean) => Promise<void>
  onUpdate: () => void // Kept for now, but might be less relevant with on-demand loading for details
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  details?: { subtasks: Subtask[], tags: Tag[] } | null
  loadDetails?: () => void
  isLoadingDetails?: boolean
}

export function TaskCard({
  task,
  onComplete,
  onUpdate,
  onEdit,
  onDelete,
  details,
  loadDetails,
  isLoadingDetails,
}: TaskCardProps) {
  const [showDetailsSection, setShowDetailsSection] = useState(false) // Used to control visibility of details
  const [completingSubtask, setCompletingSubtask] = useState<string | null>(null)
  const [supabaseClient, setSupabaseClient] = useState<any>(null)

  useEffect(() => {
    setSupabaseClient(createClient())
  }, [])

  const handleCompleteTask = async (checked: boolean) => {
    await onComplete(task.id, checked)
  }

  const handleExpandDetails = () => {
    if (loadDetails) {
      loadDetails();
    }
    setShowDetailsSection(true);
  };

  const completeSubtask = async (subtaskId: string) => {
    if (!supabaseClient) return
    setCompletingSubtask(subtaskId)
    // Subtasks for optimistic update should come from `details` if available
    const currentSubtasks = details?.subtasks || task.subtasks || [];

    // Optimistic update
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: true, completed_at: new Date().toISOString() } : st,
    );
    // The parent (TaskDashboard) should update the `details` prop via its state management
    // when a subtask completion is confirmed by Supabase, triggering a re-render.

    try {
      const { error } = await supabaseClient
        .from("subtasks")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", subtaskId)
      if (error) throw error
      // onUpdate is not strictly needed here if parent re-fetches details or realtime updates details
    } catch (error) {
      console.error("Error completing subtask:", error)
      // Realtime should correct any optimistic update discrepancies.
    } finally {
      setCompletingSubtask(null)
    }
  }

  const displaySubtasks = details?.subtasks || task.subtasks || []
  const completedSubtasksCount = displaySubtasks.filter((st) => st.completed).length
  const displayTags = details?.tags || task.tags || []
  const dragInstructionsId = `drag-handle-instructions-${task.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-roledescription="draggable task" // Added for the draggable element
    >
      <Card className="task-card border-0 bg-card shadow-sm hover:shadow-md">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="cursor-grab active:cursor-grabbing"
              aria-describedby={dragInstructionsId} // Added for drag handle
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0 flex items-start justify-between">
              {/* Visually hidden instructions for screen readers */}
              <span id={dragInstructionsId} className="sr-only">
                Press space to lift, arrow keys to move, space to drop, escape to cancel.
              </span>
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
                            task.completed && "line-through-animated activated",
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
                            task.completed && "line-through-animated activated",
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

                      {/* Tags - now uses displayTags */}
                      {displayTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {displayTags.map((tag) => (
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

                      {/* Subtasks/Tags Expansion UI */}
                      {(!details && (task.subtask_count > 0 || task.tag_count > 0)) && loadDetails && (
                        <div className="my-3">
                          <Button onClick={handleExpandDetails} variant="outline" size="sm" className="gap-1.5">
                            {isLoadingDetails ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                style={{ display: "inline-block" }}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span>
                              {isLoadingDetails ? "بارگیری..." : `مشاهده جزئیات (${task.subtask_count || 0} زیروظیفه, ${task.tag_count || 0} برچسب)`}
                            </span>
                          </Button>
                        </div>
                      )}

                      {/* Subtasks Summary - shown if details are loaded OR if there are legacy subtasks and no expand button */}
                      {(details || (displaySubtasks.length > 0 && !loadDetails)) && displaySubtasks.length > 0 && (
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {completedSubtasksCount}/{displaySubtasks.length} زیروظیفه تکمیل شده
                            </span>
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${displaySubtasks.length > 0 ? (completedSubtasksCount / displaySubtasks.length) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          {/* Toggle button for showing/hiding the subtask list if details are loaded */}
                          {details && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => setShowDetailsSection(!showDetailsSection)}
                               className="h-7 w-7 p-0 rounded-full"
                             >
                               {showDetailsSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                             </Button>
                          )}
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

          {/* Subtasks Section - Render if showDetailsSection is true AND (details are loaded OR legacy subtasks exist) */}
          {showDetailsSection && (details || displaySubtasks.length > 0) && displaySubtasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-2 border-t border-border pt-3"
            >
              <h4 className="text-xs font-semibold text-muted-foreground mb-1">زیروظیفه‌ها:</h4>
              {displaySubtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => completeSubtask(subtask.id)}
                    disabled={completingSubtask === subtask.id}
                    className="h-4 w-4 rounded-sm"
                  />
                  <motion.span
                    className={cn("text-sm flex-1 relative", subtask.completed && "line-through-animated activated")}
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
          {/* Display tags here as well if details are loaded and section is shown, and not already shown above */}
          {/* This example primarily focuses on subtasks in the collapsible section. Tags are shown above. */}
          {/* If tags were also meant to be part of this collapsible section, similar logic for displayTags would be here. */}

        </div>
      </Card>
    </motion.div>
  )
}
