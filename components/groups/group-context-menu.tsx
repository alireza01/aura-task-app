"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit3, Trash2, FolderOpen } from "lucide-react"
import type { TaskGroup, User, UserSettings } from "@/types"
import GroupFormModal from "./group-form-modal"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface GroupContextMenuProps {
  group: TaskGroup
  user: User | null
  settings: UserSettings | null
  onGroupsChange: () => void
  taskCount?: number
  onDeleteRequest: (group: TaskGroup) => void; // Added prop
}

export default function GroupContextMenu({
  group,
  user,
  settings,
  onGroupsChange,
  taskCount = 0,
  onDeleteRequest, // Added prop
}: GroupContextMenuProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  // const [loading, setLoading] = useState(false) // Loading state for delete will be handled by parent/dialog
  const showToast = toast
  // const supabase = createClient() // Supabase client not needed here for delete

  // Local handleDeleteGroup is removed. Action is passed to parent via onDeleteRequest.
  // The check for taskCount > 0 should ideally be done in the parent before showing the dialog,
  // or the dialog itself could show this info. For now, onDeleteRequest will be called,
  // and parent (TaskGroupsBubbles) already has a check in promptDeleteGroup.

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3 w-3" />
            <span className="sr-only">گزینه‌های گروه</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowEditModal(true)} className="gap-2">
            <Edit3 className="h-4 w-4" />
            ویرایش گروه
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" disabled>
            <FolderOpen className="h-4 w-4" />
            {taskCount} وظیفه
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDeleteRequest(group)} // Call onDeleteRequest with the group
            disabled={taskCount > 0} // Disable if tasks exist, parent also checks
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            حذف گروه
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupFormModal
        user={user}
        settings={settings}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onGroupSaved={onGroupsChange}
        groupToEdit={group}
      />
    </>
  )
}
