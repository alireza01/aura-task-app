"use client"

import React from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Task } from '@/types';
import TaskCard from './task-card'; // The actual display component
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableTaskCardProps {
  task: Task;
  user: SupabaseUser | null;
  onEditTask: () => void;
  onDeleteTask: () => void;
  onCompleteChange: (completed: boolean) => void;
}

export default function DraggableTaskCard({
  task,
  user,
  onEditTask,
  onDeleteTask,
  onCompleteChange,
}: DraggableTaskCardProps) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } }); // Add task data for DND context

  const style: React.CSSProperties = { // Explicitly type style for clarity
    transform: CSS.Transform.toString(transform),
    transition,
    // Add other styles when dragging, e.g., opacity, box-shadow
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' : undefined,
    zIndex: isDragging ? 100 : undefined, // Ensure dragging item is on top
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} > {/* Spread attributes on the sortable node */}
      <TaskCard
        task={task}
        user={user}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onCompleteChange={onCompleteChange}
        // attributes are on the wrapper
        listeners={listeners}   // Pass DND listeners for the drag handle inside TaskCard
        isDragging={isDragging} // Pass isDragging for potential internal style changes in TaskCard (though wrapper handles main effect)
        // transform and transition are applied to the div wrapper by useSortable
      />
    </div>
  );
}
