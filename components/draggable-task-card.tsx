"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskCard } from "@/components/task-card"
import type { Task, Subtask, Tag } from "@/types" // Added Subtask and Tag types

interface DraggableTaskCardProps {
  task: Task
  onComplete: (taskId: string, completed: boolean) => Promise<void>
  onUpdate: () => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  details?: {
    subtasks: Subtask[]
    tags: Tag[]
  }
  loadDetails: () => void
  isLoadingDetails: boolean
}

export function DraggableTaskCard(props: DraggableTaskCardProps) {
  const { task } = props;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard {...props} />
    </div>
  )
}