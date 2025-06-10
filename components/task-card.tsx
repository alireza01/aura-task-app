"use client"

import React, { useState, useMemo } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Task, Subtask, Tag, TaskGroup } from '@/types'; // UserSettings might be needed from store

import { useSettingsStore } from '@/stores/settingsStore';
import { useGroupStore } from '@/stores/groupStore'; // To get group details like name/emoji
import { useTaskStore } from '@/stores/taskStore'; // For subtask actions

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SubtaskManager from '@/components/tasks/subtask-manager'; // Will also need refactoring
import { Edit3, Trash2, GripVertical, ChevronDown, ChevronUp, MessageSquare, CalendarDays, Zap, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator'; // Assuming it's still present
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCardProps {
  task: Task;
  user: SupabaseUser | null; // For permission checks or UI variations
  // Callbacks connected to store actions by parent
  onEditTask: () => void;
  onDeleteTask: () => void;
  onCompleteChange: (completed: boolean) => void;

  // Props for DND if this card itself is made draggable (passed by DraggableTaskCard)
  attributes?: Partial<React.HTMLAttributes<HTMLElement>>;
  listeners?: Partial<React.HTMLAttributes<HTMLElement>>;
  transform?: { x: number; y: number; scaleX?: number; scaleY?: number; } | null; // from dnd-kit, corrected scaleY typo
  transition?: string | null; // from dnd-kit
  isDragging?: boolean;
}

export default function TaskCard({
  task,
  user,
  onEditTask,
  onDeleteTask,
  onCompleteChange,
  attributes,
  listeners,
  transform,
  transition,
  isDragging,
}: TaskCardProps) {

  const userSettings = useSettingsStore((state) => state.userSettings);
  const getGroupById = (groupId: string | null) => useGroupStore.getState().groups.find(g => g.id === groupId);

  // Subtask actions from taskStore
  const { addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompleted } = useTaskStore.getState();

  const [expanded, setExpanded] = useState(false); // For description and subtasks

  const group = useMemo(() => task.group_id ? getGroupById(task.group_id) : null, [task.group_id, getGroupById]);

  const handleToggleCompleted = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent card click or other events
    onCompleteChange(!task.completed);
  };

  // Style for DND transform, applied by the DraggableTaskCard wrapper usually.
  // If TaskCard itself is the direct draggable target, this is where it would be used.
  // However, DraggableTaskCard now applies this to its div. So, this might not be needed here.
  // For safety, if transform is passed, apply it.
  const cardStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX || 1}) scaleY(${transform.scaleY || 1})`, transition } : {};
  if (isDragging) {
    // cardStyle.opacity = 0.5; // Example: make it semi-transparent when dragging
    // cardStyle.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
  }


  return (
    <Card
        className={cn(
            "group relative cursor-default shadow-sm hover:shadow-md transition-shadow duration-200",
            task.completed && "bg-muted/40 opacity-70",
            // isDragging handled by DraggableTaskCard wrapper now for opacity/shadow
        )}
        // style and attributes are applied by DraggableTaskCard to its wrapper div
        // {...attributes} // Only if this Card is the direct sortable node
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              id={`task-${task.id}-checkbox`}
              checked={task.completed}
              onCheckedChange={() => onCompleteChange(!task.completed)}
              onClick={handleToggleCompleted}
              aria-label={`Mark task ${task.completed ? 'incomplete' : 'complete'}`}
              className="mt-1 shrink-0 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex-grow">
              <CardTitle
                className={cn(
                    "text-base font-semibold leading-tight",
                    task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.emoji && <span className="mr-2 text-lg">{task.emoji}</span>}
                {task.title}
              </CardTitle>
              {group && (
                <Badge variant="outline" className="mt-1.5 text-xs py-0.5 px-1.5 font-normal">
                  {group.emoji} {group.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {listeners && ( // Drag Handle passed from DraggableTaskCard
                <Button variant="ghost" size="icon" className="cursor-grab h-7 w-7 group-hover:opacity-100 opacity-50 transition-opacity" {...listeners} aria-label="Drag task">
                    <GripVertical className="h-4 w-4" />
                </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 group-hover:opacity-100 opacity-50 transition-opacity" aria-label="Task actions">
                  <Edit3 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-1">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={onEditTask}>Edit Task</Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-red-500 hover:text-red-600" onClick={onDeleteTask}>Delete Task</Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      {(task.description || (task.subtasks && task.subtasks.length > 0) || task.tags?.length || task.due_date || task.speed_score || task.importance_score ) && (
        <CardContent className="px-4 pb-3 pt-0">
            {(task.description || (task.subtasks && task.subtasks.length > 0)) && (
                 <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-full justify-start text-xs text-muted-foreground -ml-2 mb-1 h-auto py-1">
                    {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    {expanded ? "Show Less" : "Show More"}
                 </Button>
            )}

            <AnimatePresence>
            {expanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                >
                    {task.description && (
                        <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap break-words">{task.description}</p>
                    )}
                    {/* Ensure subtasks is an array before checking length and mapping */}
                    {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                        <div className="mt-2 mb-3">
                        <SubtaskManager
                            parentTaskId={task.id}
                            subtasks={task.subtasks}
                            onAddSubtask={async (title) => addSubtask(task.id, { title }, user?.id || null, null /* guestUser - subtasks for logged in */)}
                            onUpdateSubtask={async (subtaskId, sUpdates) => updateSubtask(task.id, subtaskId, sUpdates, user?.id || null, null)}
                            onDeleteSubtask={async (subtaskId) => deleteSubtask(task.id, subtaskId, user?.id || null, null)}
                            onToggleSubtask={async (subtaskId, sCompleted) => toggleSubtaskCompleted(task.id, subtaskId, sCompleted, user?.id || null, null)}
                            disabled={task.completed}
                        />
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                {task.due_date && (
                    <div className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                )}
                {task.speed_score && userSettings?.show_ai_scores && (
                    <div className="flex items-center gap-1" title={`Speed Score: ${task.speed_score}`}>
                        <Zap className="h-3.5 w-3.5 text-blue-500" />
                        <span>{task.speed_score}</span>
                    </div>
                )}
                {task.importance_score && userSettings?.show_ai_scores && (
                    <div className="flex items-center gap-1" title={`Importance Score: ${task.importance_score}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span>{task.importance_score}</span>
                    </div>
                )}
            </div>
            {/* Ensure tags is an array before checking length and mapping */}
            {Array.isArray(task.tags) && task.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, borderColor: tag.color ? `${tag.color}80` : undefined, color: tag.color ? tag.color : undefined }} className="py-0.5 px-1.5 text-xs font-normal">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
        </CardContent>
      )}
       <CardFooter className="px-4 py-2 text-xs text-muted-foreground/70 border-t mt-2" style={{ display: task.created_at ? 'block' : 'none' }}>
        Created: {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}
      </CardFooter>
    </Card>
  );
}
