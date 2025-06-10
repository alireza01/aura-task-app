"use client"

import React, { useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { GuestUser, Tag } from '@/types';

import { useTagStore } from '@/stores/tagStore';
import { useUIStore } from '@/stores/uiStore';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { TagIcon, PlusCircle, Edit3, Trash2, Check, X as CloseIcon, Palette } from 'lucide-react';
import { CirclePicker, ColorResult } from 'react-color'; // Example color pickers

interface TagsModalProps {
  user: SupabaseUser | null;
  guestUser: GuestUser | null;
  // tags prop and onTagsChange, onClose removed
}

// Default colors for CirclePicker
const defaultColors = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
  "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39",
  "#ffeb3b", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b",
  "#FFFFFF", "#000000" // Added white and black
];


export default function TagsModal({ user, guestUser }: TagsModalProps) {
  const { toast } = useToast();

  // UI Store
  const { isTagsModalOpen, closeTagsModal } = useUIStore((state) => ({
    isTagsModalOpen: state.isTagsModalOpen,
    closeTagsModal: state.closeTagsModal,
  }));

  // Tag Store
  const tags = useTagStore((state) => state.tags);
  const fetchTags = useTagStore((state) => state.fetchTags);
  const addTag = useTagStore((state) => state.addTag);
  const updateTag = useTagStore((state) => state.updateTag);
  const deleteTag = useTagStore((state) => state.deleteTag);
  const errorUpdatingTag = useTagStore((state) => state.errorUpdatingTag);
  const isLoadingTags = useTagStore((state) => state.isLoadingTags);


  // Local state for form inputs
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#607d8b'); // Default color
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showColorPickerFor, setShowColorPickerFor] = useState<string | null>(null); // 'new' or tag.id

  // Fetch tags when modal opens or user changes (if not already loaded by TaskDashboard)
  // This ensures the modal always has fresh tag data if opened independently.
  useEffect(() => {
    if (isTagsModalOpen) {
      // Tags might already be fetched by TaskDashboard.
      // Calling fetchTags here again is fine; store action should prevent redundant calls if data exists.
      fetchTags(user?.id || null, guestUser);
    }
  }, [isTagsModalOpen, user, guestUser, fetchTags]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast({ title: "Tag name cannot be empty", variant: "destructive" });
      return;
    }
    const createdTag = await addTag({ name: newTagName.trim(), color: newTagColor }, user?.id || null, guestUser);
    if (createdTag) {
      toast({ title: "Tag Added", description: `Tag "${createdTag.name}" created.` });
      setNewTagName('');
      setNewTagColor('#607d8b'); // Reset color
    } else {
      toast({ title: "Error Adding Tag", description: errorUpdatingTag || "Unknown error", variant: "destructive" });
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !editingTag.name.trim()) {
      toast({ title: "Tag name cannot be empty", variant: "destructive" });
      return;
    }
    const updated = await updateTag(editingTag.id, { name: editingTag.name.trim(), color: editingTag.color }, user?.id || null, guestUser);
    if (updated) {
      toast({ title: "Tag Updated" });
      setEditingTag(null);
    } else {
      toast({ title: "Error Updating Tag", description: errorUpdatingTag || "Unknown error", variant: "destructive" });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    // Add confirmation dialog in real app
    const success = await deleteTag(tagId, user?.id || null, guestUser);
    if (success) {
      toast({ title: "Tag Deleted" });
      if (editingTag?.id === tagId) setEditingTag(null); // Clear editing state if deleted
    } else {
      toast({ title: "Error Deleting Tag", description: errorUpdatingTag || "Unknown error", variant: "destructive" });
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTag({ ...tag }); // Clone to edit locally
    setShowColorPickerFor(null); // Close any open color pickers
  };

  const cancelEditing = () => {
    setEditingTag(null);
  };

  const handleColorChangeComplete = (color: ColorResult, tagIdOrNew: string) => {
    if (tagIdOrNew === 'new') {
        setNewTagColor(color.hex);
    } else if (editingTag && editingTag.id === tagIdOrNew) {
        setEditingTag({ ...editingTag, color: color.hex });
    }
    setShowColorPickerFor(null); // Close picker after selection
  };

  if (!isTagsModalOpen) {
    return null;
  }

  return (
    <Dialog open={isTagsModalOpen} onOpenChange={(isOpen) => !isOpen && closeTagsModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center"><TagIcon className="mr-2 h-5 w-5" /> مدیریت برچسب‌ها</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Add New Tag Form */}
          <div className="flex items-center gap-2 p-2 border rounded-lg">
            <Input
              placeholder="نام برچسب جدید"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-grow"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <div className="relative">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowColorPickerFor(showColorPickerFor === 'new' ? null : 'new')}>
                    <Palette className="h-4 w-4" style={{ color: newTagColor }} />
                </Button>
                {showColorPickerFor === 'new' && (
                    <div className="absolute z-50 mt-1 right-0 sm:left-0 sm:right-auto"> {/* Position picker */}
                        <div className="fixed inset-0 " onClick={() => setShowColorPickerFor(null)} /> {/* Overlay to close */}
                        <CirclePicker colors={defaultColors} color={newTagColor} onChangeComplete={(color) => handleColorChangeComplete(color, 'new')} />
                    </div>
                )}
            </div>
            <Button onClick={handleAddTag} size="icon" className="h-9 w-9" disabled={!newTagName.trim()}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>

          {/* List of Existing Tags */}
          {isLoadingTags && <p className="text-sm text-muted-foreground text-center">در حال بارگذاری برچسب‌ها...</p>}
          {!isLoadingTags && tags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">هنوز برچسبی ایجاد نشده است.</p>
          )}
          <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                {editingTag?.id === tag.id ? (
                  <>
                    <Input
                      value={editingTag.name}
                      onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                      className="h-8 flex-grow mr-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTag(); if (e.key === 'Escape') cancelEditing();}}
                    />
                    <div className="relative mr-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowColorPickerFor(showColorPickerFor === tag.id ? null : tag.id)}>
                            <Palette className="h-4 w-4" style={{ color: editingTag.color || '#000000' }} />
                        </Button>
                        {showColorPickerFor === tag.id && (
                             <div className="absolute z-50 mt-1 right-0">
                                <div className="fixed inset-0 " onClick={() => setShowColorPickerFor(null)} />
                                <CirclePicker colors={defaultColors} color={editingTag.color || '#000000'} onChangeComplete={(color) => handleColorChangeComplete(color, tag.id)} />
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleUpdateTag} className="h-8 w-8"><Check className="h-4 w-4 text-green-500"/></Button>
                    <Button variant="ghost" size="icon" onClick={cancelEditing} className="h-8 w-8"><CloseIcon className="h-4 w-4 text-gray-500"/></Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <span style={{ backgroundColor: tag.color || '#ccc' }} className="w-3 h-3 rounded-full mr-2 shrink-0 border"></span>
                      <span className="text-sm">{tag.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => startEditing(tag)} className="h-7 w-7"><Edit3 className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)} className="h-7 w-7"><Trash2 className="h-4 w-4 text-red-500"/></Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">بستن</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
