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
import type { TaskGroup, User, GuestUser, UserSettings } from "@/types"
import GroupFormModal from "./group-form-modal"
import { toast } from "sonner"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface GroupContextMenuProps {
  group: TaskGroup
  user: User | null
  guestUser: GuestUser | null
  settings: UserSettings | null
  onGroupsChange: () => void
  taskCount?: number
}

export default function GroupContextMenu({
  group,
  user,
  guestUser,
  settings,
  onGroupsChange,
  taskCount = 0,
}: GroupContextMenuProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localGroups, setLocalGroups] = useLocalStorage<TaskGroup[]>("aura-groups", [])
  const [localTasks, setLocalTasks] = useLocalStorage("aura-tasks", [])
  const showToast = toast
  const supabase = createClientComponentClient()

  const handleDeleteGroup = async () => {
    if (taskCount > 0) {
      showToast("امکان حذف گروه وجود ندارد", {
        description: "ابتدا تمام وظایف این گروه را حذف یا به گروه دیگری منتقل کنید.",
        duration: 3000,
        className: "bg-red-500 text-white",
      })
      return
    }

    const confirmed = window.confirm(`آیا از حذف گروه "${group.name}" اطمینان دارید؟`)
    if (!confirmed) return

    setLoading(true)

    try {
      if (user) {
        const { error } = await supabase.from("task_groups").delete().eq("id", group.id)
        if (error) throw error
      } else {
        const updatedGroups = localGroups.filter((g) => g.id !== group.id)
        setLocalGroups(updatedGroups)
      }

      showToast("گروه حذف شد", {
        description: `گروه "${group.name}" با موفقیت حذف شد.`,
      })

      onGroupsChange()
    } catch (error) {
      console.error("خطا در حذف گروه:", error)
      showToast("خطا در حذف گروه", {
        description: "مشکلی در حذف گروه رخ داد.",
        duration: 3000,
        className: "bg-red-500 text-white",
      })
    } finally {
      setLoading(false)
    }
  }

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
            onClick={handleDeleteGroup}
            disabled={loading || taskCount > 0}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            حذف گروه
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupFormModal
        user={user}
        guestUser={guestUser}
        settings={settings}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onGroupSaved={onGroupsChange}
        groupToEdit={group}
      />
    </>
  )
}
