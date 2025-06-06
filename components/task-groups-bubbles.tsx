"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import type { TaskGroup, User, GuestUser } from "@/types"
import { Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from "sonner"
import { useTheme } from "@/components/theme/theme-provider"
import GroupFormModal from "./groups/group-form-modal"
import GroupContextMenu from "./groups/group-context-menu"
import NedaGroupBubble from "./theme/neda-group-bubble"

interface TaskGroupsBubblesProps {
  user: User | null
  guestUser: GuestUser | null
  groups: TaskGroup[]
  selectedGroup: string | null
  onGroupSelect: (groupId: string | null) => void
  onGroupsChange: () => void
  onTaskDrop?: (taskId: string, groupId: string) => void
  getTaskCountForGroup: (groupId: string) => number
}

export default function TaskGroupsBubbles({
  user,
  guestUser,
  groups,
  selectedGroup,
  onGroupSelect,
  onGroupsChange,
  onTaskDrop,
  getTaskCountForGroup,
}: TaskGroupsBubblesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)
  const [localGroups, setLocalGroups] = useLocalStorage<TaskGroup[]>("aura-groups", [])
  const showToast = toast
  const { theme } = useTheme()

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    setDragOverGroup(groupId)
  }

  const handleDragLeave = () => {
    setDragOverGroup(null)
  }

  const handleDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId && onTaskDrop) {
      onTaskDrop(taskId, groupId)
    }
    setDragOverGroup(null)
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      if (user) {
        const { error } = await supabase.from("task_groups").delete().eq("id", groupId)
        if (error) throw error
      } else {
        const updatedGroups = localGroups.filter((g) => g.id !== groupId)
        setLocalGroups(updatedGroups)
      }

      onGroupsChange()
      showToast("گروه حذف شد", {
        description: "گروه با موفقیت حذف شد.",
      })
    } catch (error) {
      console.error("خطا در حذف گروه:", error)
      showToast("خطا در حذف گروه", {
        description: "مشکلی در حذف گروه رخ داد.",
        duration: 3000,
        className: "bg-red-500 text-white",
      })
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">گروه‌های وظایف</h2>
        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
          className={cn(
            "gap-2 transition-all duration-300",
            theme === "neda" ? "bubbly-button text-white" : "glass-button bg-primary/90 text-white hover:bg-primary",
          )}
        >
          <Plus className="w-4 h-4" />
          گروه جدید
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <AnimatePresence>
          {/* All Tasks Bubble */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGroupSelect(null)}
            className={cn(
              "flex-shrink-0 px-4 py-3 transition-all duration-200 min-w-[120px]",
              theme === "neda"
                ? "rounded-3xl bg-gradient-to-br from-purple-200 to-pink-200 text-purple-800"
                : "rounded-2xl glass-card border-0",
              selectedGroup === null
                ? theme === "neda"
                  ? "ring-4 ring-purple-300 scale-105"
                  : "bg-primary text-primary-foreground shadow-lg"
                : "hover:bg-muted/50 hover:shadow-md",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="font-medium text-sm">همه وظایف</span>
            </div>
          </motion.button>

          {/* Group Bubbles */}
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {theme === "neda" ? (
                <NedaGroupBubble
                  group={group}
                  isSelected={selectedGroup === group.id}
                  taskCount={getTaskCountForGroup(group.id)}
                  onClick={() => onGroupSelect(group.id)}
                  onDelete={() => handleDeleteGroup(group.id)}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, group.id)}
                  isDragOver={dragOverGroup === group.id}
                />
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onGroupSelect(group.id)}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, group.id)}
                  className={cn(
                    "flex-shrink-0 px-4 py-3 rounded-2xl glass-card border-0 transition-all duration-200 min-w-[120px]",
                    selectedGroup === group.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "hover:bg-muted/50 hover:shadow-md",
                    dragOverGroup === group.id && "ring-2 ring-primary ring-offset-2 bg-primary/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{group.emoji}</span>
                    <span className="font-medium text-sm truncate max-w-[80px]">{group.name}</span>
                  </div>
                </motion.button>
              )}

              {theme !== "neda" && (
                <GroupContextMenu
                  group={group}
                  user={user}
                  guestUser={guestUser}
                  settings={null}
                  taskCount={getTaskCountForGroup(group.id)}
                  onGroupsChange={onGroupsChange}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Group Modal */}
      <GroupFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupSaved={onGroupsChange}
        user={user}
        guestUser={guestUser}
        settings={null}
      />
    </div>
  )
}
