"use client"

import React from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Task, TaskGroup, UserSettings } from '@/types'; // Task includes subtasks and tags now

// Import child components
import DraggableTaskCard from '@/components/draggable-task-card'; // Assuming this is the main card component
// TaskCard might be used by DraggableTaskCard or directly if not draggable context

// Import stores if TaskList needs to initiate actions, though often TaskCard does.
// For now, TaskList primarily passes down data or simplified handlers.
// import { useTaskStore } from '@/stores/taskStore';
// import { useUIStore } from '@/stores/uiStore';


interface TaskListProps {
  tasks: Task[]; // Tasks to display, filtered and sorted by parent (TaskDashboard)
  user: SupabaseUser | null;
  // groups, settings, onTasksChange, onGroupsChange, onEditTask, onDeleteTask, onComplete removed
  // These are now handled by stores or passed directly to TaskCard from TaskDashboard if still needed.
  // However, onEditTask, onDeleteTask, onComplete are actions on individual tasks, so TaskCard will handle them
  // by calling store actions, possibly via callbacks passed from TaskDashboard -> TaskList -> TaskCard.
  // For simplicity here, we assume TaskDashboard passes the necessary handlers (which call store actions)
  // directly to DraggableTaskCard or TaskCard within its render logic of this TaskList.
  // OR, TaskList can pass down store actions if it connects to stores.
  // Let's assume TaskDashboard will pass the necessary handlers directly to DraggableTaskCard.
  // So, TaskList becomes a simpler mapping component.

  // Callbacks that will be connected to store actions by the parent (TaskDashboard)
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string, completed: boolean) => void;
}

export default function TaskList({
  tasks,
  user,
  onEditTask,
  onDeleteTask,
  onCompleteTask
}: TaskListProps) {

  // const isLoadingTasks = useTaskStore((state) => state.isLoadingTasks); // If showing loading state here

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 my-8 bg-muted/20 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-muted-foreground mx-auto mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
        </svg>
        <h3 className="text-xl font-semibold text-foreground mb-2">لیست وظایف خالی است</h3>
        <p className="text-muted-foreground">وظیفه‌ای برای نمایش وجود ندارد. یک وظیفه جدید اضافه کنید!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <DraggableTaskCard
          key={task.id}
          task={task}
          user={user}
          // Pass down the handlers from TaskDashboard
          onEditTask={() => onEditTask(task)}
          onDeleteTask={() => onDeleteTask(task.id)}
          onCompleteChange={(completed) => onCompleteTask(task.id, completed)}
          // DraggableTaskCard might also need access to userSettings from its parent or store
        />
      ))}
    </div>
  );
}
