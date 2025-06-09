"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskCard } from "@/components/task-card"
import type { Task } from "@/types"

interface DraggableTaskCardProps {
  task: Task
  onComplete: (taskId: string, completed: boolean) => Promise<void>
  onUpdate: () => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export function DraggableTaskCard({ task, onComplete, onUpdate, onEdit, onDelete }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onComplete={onComplete} onUpdate={onUpdate} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}