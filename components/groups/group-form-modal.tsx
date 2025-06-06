"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { X, FolderPlus, Edit3, Sparkles } from "lucide-react"
import type { TaskGroup, User, GuestUser, UserSettings } from "@/types"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Form validation schema
const groupFormSchema = z.object({
  name: z.string().min(1, "نام گروه الزامی است").max(50, "نام گروه نباید بیش از ۵۰ کاراکتر باشد").trim(),
})

type GroupFormData = z.infer<typeof groupFormSchema>

interface GroupFormModalProps {
  user: User | null
  guestUser: GuestUser | null
  settings: UserSettings | null
  isOpen: boolean
  onClose: () => void
  onGroupSaved: () => void
  groupToEdit?: TaskGroup | null
}

export default function GroupFormModal({
  user,
  guestUser,
  settings,
  isOpen,
  onClose,
  onGroupSaved,
  groupToEdit = null,
}: GroupFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [localGroups, setLocalGroups] = useLocalStorage<TaskGroup[]>("aura-groups", [])
  const showToast = toast
  const supabase = createClientComponentClient()

  const isEditMode = !!groupToEdit
  const modalTitle = isEditMode ? `ویرایش گروه: ${groupToEdit.name}` : "ایجاد گروه جدید"

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: groupToEdit?.name || "",
    },
  })

  const watchedName = watch("name")

  // Reset form when modal opens/closes or groupToEdit changes
  useEffect(() => {
    if (isOpen) {
      reset({
        name: groupToEdit?.name || "",
      })
      // Focus the input field after a short delay
      setTimeout(() => {
        const input = document.querySelector("[data-group-name-input]") as HTMLInputElement
        if (input) {
          input.focus()
          input.select()
        }
      }, 100)
    }
  }, [isOpen, groupToEdit, reset])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleEscape)
    }

    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // AI emoji assignment function
  const assignAiEmoji = async (groupName: string, groupId: string) => {
    if (!settings?.gemini_api_key) return "📁" // Default emoji if no API key

    setAiLoading(true)
    try {
      const response = await fetch("/api/assign-group-emoji", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupName,
          apiKey: settings.gemini_api_key,
        }),
      })

      if (!response.ok) throw new Error("Failed to get AI emoji")

      const { emoji } = await response.json()

      // Update the group with the AI-assigned emoji
      if (user) {
        await supabase.from("task_groups").update({ emoji }).eq("id", groupId)
      } else {
        // Update local storage
        const updatedGroups = localGroups.map((group) => (group.id === groupId ? { ...group, emoji } : group))
        setLocalGroups(updatedGroups)
      }

      return emoji
    } catch (error) {
      console.error("خطا در تخصیص ایموجی هوشمند:", error)
      return "📁" // Fallback to default emoji
    } finally {
      setAiLoading(false)
    }
  }

  const onSubmit = async (data: GroupFormData) => {
    setLoading(true)

    try {
      const groupName = data.name.trim()

      if (user) {
        // Save to Supabase
        if (isEditMode) {
          // Update existing group
          const { error: updateError } = await supabase
            .from("task_groups")
            .update({
              name: groupName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", groupToEdit!.id)

          if (updateError) throw updateError

          // If name changed significantly, reassign emoji
          if (groupName.toLowerCase() !== groupToEdit!.name.toLowerCase()) {
            await assignAiEmoji(groupName, groupToEdit!.id)
          }

          showToast.success("گروه به‌روزرسانی شد", {
            description: `گروه "${groupName}" با موفقیت به‌روزرسانی شد.`,
          })
        } else {
          // Create new group
          const { data: newGroup, error: insertError } = await supabase
            .from("task_groups")
            .insert({
              user_id: user.id,
              name: groupName,
              emoji: "📁", // Temporary emoji
            })
            .select()
            .single()

          if (insertError) throw insertError

          // Assign AI emoji after creation
          const aiEmoji = await assignAiEmoji(groupName, newGroup.id)

          showToast.success("گروه ایجاد شد", {
            description: `گروه "${groupName}" با موفقیت ایجاد شد.`,
          })
        }
      } else {
        // Save to local storage
        if (isEditMode) {
          const updatedGroups = localGroups.map((group) =>
            group.id === groupToEdit!.id
              ? {
                  ...group,
                  name: groupName,
                  updated_at: new Date().toISOString(),
                }
              : group,
          )
          setLocalGroups(updatedGroups)

          // Reassign emoji if name changed
          if (groupName.toLowerCase() !== groupToEdit!.name.toLowerCase()) {
            await assignAiEmoji(groupName, groupToEdit!.id)
          }

          showToast.success("گروه به‌روزرسانی شد", {
            description: `گروه "${groupName}" در حافظه محلی به‌روزرسانی شد.`,
          })
        } else {
          const newGroup: TaskGroup = {
            id: `group-${Date.now()}`,
            user_id: guestUser?.id || "guest",
            name: groupName,
            emoji: "📁",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          setLocalGroups([...localGroups, newGroup])

          // Assign AI emoji after creation
          await assignAiEmoji(groupName, newGroup.id)

          showToast.success("گروه ایجاد شد", {
            description: `گروه "${groupName}" در حافظه محلی ایجاد شد.`,
          })
        }
      }

      onGroupSaved()
      onClose()
      reset()
    } catch (error) {
      console.error("خطا در ذخیره گروه:", error)
      showToast.error("خطا در ذخیره گروه", {
        description: "مشکلی در ذخیره گروه رخ داد. لطفاً دوباره تلاش کنید.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md glass-card border-0" data-group-modal>
            <DialogHeader className="flex flex-row-reverse items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: isEditMode ? 0 : 360 }}
                  transition={{ duration: 0.5 }}
                >
                  {isEditMode ? (
                    <Edit3 className="h-5 w-5 text-primary" />
                  ) : (
                    <FolderPlus className="h-5 w-5 text-primary" />
                  )}
                </motion.div>
                {modalTitle}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="h-8 w-8 rounded-full"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <motion.form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6 mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2">
                <Label htmlFor="groupName" className="text-sm font-medium">
                  نام گروه *
                </Label>
                <div className="relative">
                  <Input
                    id="groupName"
                    data-group-name-input
                    {...register("name")}
                    placeholder="مثال: پروژه‌های کاری، خریدهای خانه..."
                    className={`glass border-0 focus:ring-2 focus:ring-primary/20 ${
                      errors.name ? "ring-2 ring-destructive/20" : ""
                    }`}
                    disabled={loading}
                  />
                  {aiLoading && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                    >
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </motion.div>
                  )}
                </div>
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.name.message}
                  </motion.p>
                )}
              </div>

              {/* AI Emoji Assignment Info */}
              {settings?.gemini_api_key && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>هوش مصنوعی ایموجی مناسب برای این گروه را انتخاب خواهد کرد</span>
                </motion.div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 glass-button"
                  disabled={loading}
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !watchedName?.trim()}
                  className="flex-1 glass-button bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="loading-dots">
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                      {isEditMode ? "در حال به‌روزرسانی..." : "در حال ایجاد..."}
                    </div>
                  ) : isEditMode ? (
                    "به‌روزرسانی گروه"
                  ) : (
                    "ایجاد گروه"
                  )}
                </Button>
              </div>
            </motion.form>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
