"use client"

import React, { useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { TaskGroup, GuestUser, Task } from '@/types';

import { useGroupStore } from '@/stores/groupStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUIStore } from '@/stores/uiStore';

import { Button } from '@/components/ui/button';
import { PlusCircle, Folder, Edit3, Trash2, Check, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input'; // For editing group name
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // For group actions
import { useDroppable } from '@dnd-kit/core'; // useDroppable if groups are drop targets themselves - removed DndContext as it's in parent

interface TaskGroupsBubblesProps {
  user: SupabaseUser | null; // Keep for auth context if needed for add/edit permissions
  guestUser: GuestUser | null; // Keep for auth context
  // selectedGroup, onGroupSelect, groups, onGroupsChange, getTaskCountForGroup, onTaskDrop removed
  // These will be sourced from Zustand stores or handled by parent DND context.
}

export default function TaskGroupsBubbles({ user, guestUser }: TaskGroupsBubblesProps) {
  const { toast } = useToast();

  // Zustand store selectors and actions
  const groups = useGroupStore((state) => state.groups);
  const addGroup = useGroupStore((state) => state.addGroup);
  const updateGroup = useGroupStore((state) => state.updateGroup);
  const deleteGroup = useGroupStore((state) => state.deleteGroup);
  // const fetchGroups = useGroupStore((state) => state.fetchGroups); // Not typically needed here, parent fetches

  const tasks = useTaskStore((state) => state.tasks);

  const selectedGroupId = useUIStore((state) => state.filterGroupId);
  const setFilterGroupId = useUIStore((state) => state.setFilterGroupId);

  // Local state for inline editing and adding new group
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ title: "Group name cannot be empty", variant: "destructive" });
      return;
    }
    const newGroup = await addGroup({ name: newGroupName, emoji: '📁' }, user?.id || null, guestUser);
    if (newGroup) {
      toast({ title: "Group added", description: `Group "${newGroup.name}" created.` });
      setIsAddingGroup(false);
      setNewGroupName('');
      // Optionally, select the new group:
      // setFilterGroupId(newGroup.id);
    } else {
      toast({ title: "Error adding group", variant: "destructive", description: useGroupStore.getState().errorUpdatingGroup });
    }
  };

  const handleSelectGroup = (groupId: string | null) => {
    setFilterGroupId(groupId);
  };

  const handleEditGroup = (group: TaskGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveGroupEdit = async (groupId: string) => {
    if (!editingGroupName.trim()) {
      toast({ title: "Group name cannot be empty", variant: "destructive" });
      return;
    }
    const updated = await updateGroup(groupId, { name: editingGroupName }, user?.id || null, guestUser);
    if (updated) {
      toast({ title: "Group updated" });
      setEditingGroupId(null);
    } else {
      toast({ title: "Error updating group", variant: "destructive", description: useGroupStore.getState().errorUpdatingGroup });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    // Confirmation dialog should be used here in a real app using uiStore.openConfirmationDialog(...)
    const success = await deleteGroup(groupId, user?.id || null, guestUser);
    if (success) {
      toast({ title: "Group deleted" });
      if (selectedGroupId === groupId) {
        setFilterGroupId(null); // Clear filter if selected group is deleted
      }
    } else {
      toast({ title: "Error deleting group", variant: "destructive", description: useGroupStore.getState().errorUpdatingGroup });
    }
  };

  const getTaskCountForGroup = (groupId: string | null): number => {
    if (groupId === null) return tasks.filter(task => !task.group_id && !task.completed).length; // Ungrouped active tasks
    return tasks.filter(task => task.group_id === groupId && !task.completed).length; // Active tasks in group
  };

  const GroupBubble = ({ group }: { group: TaskGroup }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `group-dropzone-${group.id}`, // Ensure unique ID for droppable
        data: { type: 'group-dropzone', groupId: group.id }
    });
    const taskCount = getTaskCountForGroup(group.id);
    const isSelected = selectedGroupId === group.id;

    return (
        <div ref={setNodeRef} className={`relative p-1 ${isOver ? 'bg-primary/20 rounded-full' : ''}`}> {/* Visual feedback for droppable */}
            <Button
                variant={isSelected ? 'secondary' : 'outline'}
                className={`rounded-full h-10 px-4 text-sm relative group`} // Removed isOver from button itself
                onClick={() => handleSelectGroup(group.id)}
            >
                {editingGroupId === group.id ? (
                    <div className="flex items-center gap-1">
                        <Input
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            className="h-7 text-xs w-24 bg-background" // Ensure input is visible
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGroupEdit(group.id); if (e.key === 'Escape') setEditingGroupId(null); }}
                            onBlur={() => { /* Consider auto-save or explicit cancel */ setEditingGroupId(null);}} // Simplified: cancel on blur
                        />
                        <Check className="h-4 w-4 text-green-500 cursor-pointer hover:text-green-700" onClick={() => handleSaveGroupEdit(group.id)} />
                        <CloseIcon className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700" onClick={() => setEditingGroupId(null)} />
                    </div>
                ) : (
                    <>
                        <span className="mr-1.5">{group.emoji || '📁'}</span>
                        {group.name}
                        {taskCount > 0 && (
                            <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                                {taskCount}
                            </span>
                        )}
                    </>
                )}
            </Button>
            {editingGroupId !== group.id && !isAddingGroup && ( // Hide popover when adding/editing another group
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute -top-1 -right-1 h-5 w-5 p-0.5 rounded-full bg-background opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity border shadow-sm hover:bg-muted">
                            <Edit3 className="h-3 w-3" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs px-2 py-1" onClick={() => handleEditGroup(group)}>Edit Name</Button>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs px-2 py-1 text-red-500 hover:text-red-600" onClick={() => handleDeleteGroup(group.id)}>Delete Group</Button>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
  };

  // Droppable for "All/Ungrouped" tasks
  const { setNodeRef: setUngroupedNodeRef, isOver: isOverUngrouped } = useDroppable({
    id: 'ungrouped-dropzone', // Unique ID for the ungrouped area
    data: { type: 'group-dropzone', groupId: null }
  });


  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
      <div ref={setUngroupedNodeRef} className={`relative p-1 ${isOverUngrouped ? 'bg-primary/20 rounded-full' : ''}`}>
        <Button
            variant={selectedGroupId === null ? 'secondary' : 'outline'}
            className="rounded-full h-10 px-4 text-sm"
            onClick={() => handleSelectGroup(null)}
        >
            همه
            {getTaskCountForGroup(null) > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                    {getTaskCountForGroup(null)}
                </span>
            )}
        </Button>
      </div>

      {groups.map((group) => (
        <GroupBubble key={group.id} group={group} />
      ))}

      {isAddingGroup ? (
        <motion.div layout className="flex items-center gap-1 p-1 bg-muted rounded-full h-10">
          <Input
            type="text"
            placeholder="نام گروه جدید"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="h-8 text-sm w-32 border-primary focus:ring-primary bg-background"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setIsAddingGroup(false); }}
            onBlur={() => setIsAddingGroup(false)} // Cancel on blur
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddGroup}><Check className="h-4 w-4 text-green-500"/></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddingGroup(false)}><CloseIcon className="h-4 w-4 text-red-500"/></Button>
        </motion.div>
      ) : (
        <Button
          variant="outline"
          className="rounded-full h-10 w-10 p-0 flex-shrink-0"
          onClick={() => setIsAddingGroup(true)}
          aria-label="افزودن گروه جدید"
        >
          <PlusCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
