"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableTaskCard } from "@/components/draggable-task-card"
import { TaskCard } from "@/components/task-card"
import type { Task, TaskGroup as TaskGroupType } from "@/types"
import { ChevronDown, ChevronUp } from "lucide-react"

interface TaskGroupProps {
  /** The task group object containing id, name, and emoji. */
  group: TaskGroupType
  /** An array of tasks belonging to this group. */
  tasks: Task[]
  /** Whether the task group is currently expanded to show tasks. */
  expanded: boolean
  /** Callback function to toggle the expanded state of the group. */
  onToggle: () => void
  /**
   * Callback function to handle task completion status changes.
   * @param taskId The ID of the task to update.
   * @param completed The new completion status of the task.
   */
  onTaskComplete: (taskId: string, completed: boolean) => Promise<void>
  /** Callback function to trigger a refresh of tasks, typically after an update. */
  onTasksChange: () => void
}

/**
 * TaskGroup component displays a collapsible group of tasks.
 * It shows group details, task count, completion progress, and a list of draggable tasks.
 *
 * @param {TaskGroupProps} props - The properties for the TaskGroup component.
 * @returns {JSX.Element} A Card component representing the task group.
 */
export default function TaskGroup({ group, tasks, expanded, onToggle, onTaskComplete, onTasksChange }: TaskGroupProps) {
  // Calculate the number of completed tasks within the group
  const completedTasks = tasks.filter((task) => task.completed).length
  // Get the total number of tasks in the group
  const totalTasks = tasks.length

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            {group.emoji && <span className="text-xl">{group.emoji}</span>}
            <span className="text-gray-900">{group.name}</span>
            <span className="text-sm text-gray-500">({totalTasks})</span>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            {totalTasks > 0 && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-xs text-gray-500">
                  {completedTasks}/{totalTasks}
                </span>
                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" className="text-gray-500">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent>
          <SortableContext items={tasks.filter((task) => !task.completed).map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 min-h-[50px] rounded-lg transition-colors">
              {tasks
                .filter((task) => !task.completed)
                .map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    onComplete={onTaskComplete}
                    onUpdate={onTasksChange}
                  />
                ))}

              {tasks.filter((task) => !task.completed).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">هیچ وظیفه‌ای در این گروه وجود ندارد</p>
                  <p className="text-xs mt-1">وظایف را اینجا بکشید و رها کنید</p>
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      )}
    </Card>
  )
}
