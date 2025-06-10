"use client"
import React, { useState } from 'react';
import type { Subtask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Edit3, Trash2, Check, X as CloseIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SubtaskManagerProps {
  parentTaskId: string; // To associate with parent task
  subtasks: Subtask[];
  onAddSubtask: (title: string) => Promise<Subtask | null>;
  onUpdateSubtask: (subtaskId: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>) => Promise<Subtask | null>;
  onDeleteSubtask: (subtaskId: string) => Promise<boolean>;
  onToggleSubtask: (subtaskId: string, completed: boolean) => Promise<boolean>; // Simplified toggle
  disabled?: boolean; // e.g. if parent task is completed
}

export default function SubtaskManager({
  parentTaskId,
  subtasks,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onToggleSubtask,
  disabled,
}: SubtaskManagerProps) {
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  const handleAdd = async () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub = await onAddSubtask(newSubtaskTitle.trim());
    if (newSub) {
      setNewSubtaskTitle('');
      toast({ title: "Subtask added", duration: 2000 });
    } else {
      toast({ title: "Failed to add subtask", variant: "destructive" });
    }
  };

  const startEdit = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const handleUpdate = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) return;
    const updated = await onUpdateSubtask(subtaskId, { title: editingSubtaskTitle.trim() });
    if (updated) {
      setEditingSubtaskId(null);
      toast({ title: "Subtask updated", duration: 2000 });
    } else {
      toast({ title: "Failed to update subtask", variant: "destructive" });
    }
  };

  const handleDelete = async (subtaskId: string) => {
    const success = await onDeleteSubtask(subtaskId);
    if (success) {
      toast({ title: "Subtask deleted", duration: 2000 });
    } else {
      toast({ title: "Failed to delete subtask", variant: "destructive" });
    }
  };

  const handleToggle = async (subtaskId: string, currentCompletedState: boolean) => {
    await onToggleSubtask(subtaskId, !currentCompletedState);
    // Toast can be handled by the store action or here based on return value
  };


  return (
    <div className="space-y-2 pl-2 border-l-2 border-muted">
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="flex items-center gap-2 text-sm group">
          <Checkbox
            id={`subtask-${parentTaskId}-${subtask.id}`} // Ensure unique ID for checkbox
            checked={subtask.completed}
            onCheckedChange={() => handleToggle(subtask.id, subtask.completed)}
            disabled={disabled}
            className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            aria-label={subtask.title}
          />
          {editingSubtaskId === subtask.id ? (
            <>
              <Input
                value={editingSubtaskTitle}
                onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                className="h-7 text-xs flex-grow"
                autoFocus
                onKeyDown={(e) => {if (e.key === 'Enter') handleUpdate(subtask.id); if (e.key === 'Escape') setEditingSubtaskId(null);}}
                disabled={disabled}
              />
              <Button variant="ghost" size="icon" onClick={() => handleUpdate(subtask.id)} className="h-6 w-6" disabled={disabled}><Check className="h-3.5 w-3.5 text-green-500"/></Button>
              <Button variant="ghost" size="icon" onClick={() => setEditingSubtaskId(null)} className="h-6 w-6" disabled={disabled}><CloseIcon className="h-3.5 w-3.5 text-gray-500"/></Button>
            </>
          ) : (
            <>
              <label htmlFor={`subtask-${parentTaskId}-${subtask.id}`} className={`flex-grow cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                {subtask.title}
              </label>
              {!disabled && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(subtask)} className="h-6 w-6"><Edit3 className="h-3.5 w-3.5"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(subtask.id)} className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-red-500"/></Button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            placeholder="افزودن وظیفه فرعی..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" variant="outline" className="gap-1 px-2.5 py-1 h-8 text-xs">
            <PlusCircle className="h-3.5 w-3.5"/> افزودن
          </Button>
        </div>
      )}
    </div>
  );
}
