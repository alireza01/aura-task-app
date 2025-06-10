"use client"

import { useState } from "react"
import { TaskCard } from "@/components/task-card"
import type { Task, TaskGroup as TaskGroupType, UserSettings, User } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Archive, RotateCcw, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableTaskCard } from './draggable-task-card';

interface TaskListProps {
  tasks: Task[]
  groups: TaskGroupType[]
  settings: UserSettings | null
  user: User | null
  onTasksChange: () => void
  onGroupsChange: () => void
  onComplete: (taskId: string, completed: boolean) => Promise<void> // Added for optimistic updates
  onEditTask?: (task: Task) => void
  onDeleteTask?: (taskId: string) => void
}

export default function TaskList({
  tasks,
  groups,
  settings,
  user,
  onTasksChange,
  onGroupsChange,
  onComplete, // Destructure onComplete prop
  onEditTask,
  onDeleteTask,
}: TaskListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groups.map((g) => g.id)))
  const [showArchive, setShowArchive] = useState(false)

  const activeTasks = tasks.filter((task) => !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)
  const ungroupedTasks = activeTasks.filter((task) => !task.group_id)

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const unarchiveTask = async (taskId: string) => {
    // Use onComplete prop to unarchive (set completed to false)
    await onComplete(taskId, false)
    onTasksChange() // Trigger parent to re-fetch/update tasks if needed
  }

  const renderTaskGroup = (group: TaskGroupType) => {
    const groupTasks = activeTasks.filter((task) => task.group_id === group.id)
    if (groupTasks.length === 0) return null

    const isExpanded = expandedGroups.has(group.id)
    const completedCount = tasks.filter((task) => task.group_id === group.id && task.completed).length
    const totalCount = tasks.filter((task) => task.group_id === group.id).length

    return (
      <Card key={group.id} className="border-gray-200">
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleGroup(group.id)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              {group.emoji && <span className="text-xl">{group.emoji}</span>}
              <span className="text-gray-900">{group.name}</span>
              <span className="text-sm text-gray-500">({totalCount})</span>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              {totalCount > 0 && (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-xs text-gray-500">
                    {completedCount}/{totalCount}
                  </span>
                  <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <Button variant="ghost" size="sm" className="text-gray-500">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            <AnimatePresence mode="popLayout">
              <SortableContext items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {groupTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                      transition={{ duration: 0.3 }}
                    >
                      <DraggableTaskCard
                        task={task}
                        onComplete={onComplete} // Use onComplete prop
                        onUpdate={onTasksChange}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                      />
                    </motion.div>
                  ))}

                  {groupTasks.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-center py-8 text-gray-500"
                    >
                      <p className="text-sm">✨ هنوز وظیفه‌ای وجود ندارد. یکی در بالا اضافه کنید!</p>
                    </motion.div>
                  )}
                </div>
              </SortableContext>
            </AnimatePresence>
          </CardContent>
        )}
      </Card>
    )
  }

  const renderUngroupedTasks = () => {
    if (ungroupedTasks.length > 0) {
      return (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900">وظایف عمومی</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="popLayout">
              <SortableContext items={ungroupedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {ungroupedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                      transition={{ duration: 0.3 }}
                    >
                      <DraggableTaskCard
                        key={task.id}
                        task={task}
                        onComplete={onComplete} // Use onComplete prop
                        onUpdate={onTasksChange}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                      />
                    </motion.div>
                  ))}
                </div>
              </SortableContext>
            </AnimatePresence>
          </CardContent>
        </Card>
      );
    }
    // Show empty state for ungrouped tasks if there are no groups and no ungrouped tasks.
    // This specific message will be shown if there are NO groups at all, and NO ungrouped tasks.
    // If there ARE groups, but they are empty, their own empty messages will show.
    // If there are no groups, but there ARE ungrouped tasks, then this won't show.
    if (groups.length === 0 && ungroupedTasks.length === 0 && activeTasks.length === 0 && completedTasks.length === 0) {
       return null; // The overall empty state will handle this
    } else if (groups.length > 0 && ungroupedTasks.length === 0) {
      // If there are groups, but the "Ungrouped" section specifically is empty, don't show a specific message for "Ungrouped"
      // as the user might just be using groups.
      return null;
    } else if (ungroupedTasks.length === 0 && activeTasks.length > 0) {
      // If there are active tasks in groups, but no ungrouped tasks, don't show empty state for ungrouped.
      return null;
    }


    // Default empty state for ungrouped tasks if no other condition met to hide it.
    // This case is tricky: show it if there are no groups and no tasks at all,
    // or if there are groups (possibly with tasks) but specifically the ungrouped section is empty.
    // The main "هیچ وظیفه‌ای وجود ندارد" will cover the absolute empty case.
    // So, we only want to show this if there *could* be ungrouped tasks but there aren't.
    // This is mostly for when a user *might* expect an ungrouped section but it's empty.
    // However, the overall empty state at the end of the component is probably better.
    // Let's simplify: only show ungrouped tasks if they exist. If not, this section is just not rendered.
    // The main component empty state will handle the "no tasks at all" scenario.
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Task Groups */}
      {groups.map(renderTaskGroup)}

      {/* Ungrouped Tasks */}
      {renderUngroupedTasks()}

      {/* Archive Section */}
      {completedTasks.length > 0 && (
        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-gray-500" />
                <CardTitle className="text-gray-700">آرشیو ({completedTasks.length})</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowArchive(!showArchive)} className="text-gray-500">
                {showArchive ? "پنهان کردن" : "نمایش"}
              </Button>
            </div>
          </CardHeader>

          <AnimatePresence>
            {showArchive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="space-y-3">
                  {completedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      <div className="absolute top-2 left-2 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unarchiveTask(task.id)}
                          className="h-8 w-8 p-0 bg-white/80 hover:bg-white shadow-sm"
                          title="بازگردانی از آرشیو"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="opacity-60">
                        <TaskCard
                          task={task}
                          onComplete={onComplete} // Use onComplete prop
                          onUpdate={onTasksChange}
                          onEdit={onEditTask}
                          onDelete={onDeleteTask}
                        />
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Empty State: Only show if there are no active tasks AND no completed tasks either (truly empty) */}
      {tasks.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">✨ هنوز هیچ وظیفه‌ای ایجاد نکرده‌اید.</h3>
          <p className="text-muted-foreground">با کلیک بر روی دکمه "افزودن وظیفه جدید" در بالا شروع کنید!</p>
        </motion.div>
      )}
    </div>
  )
}
