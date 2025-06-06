"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { Tag, User, GuestUser } from "@/types"
import { TagIcon, Plus, Trash2, Edit3 } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TagsModalProps {
  user: User | null
  guestUser: GuestUser | null
  tags: Tag[]
  onClose: () => void
  onTagsChange: () => void
}

const tagColors = [
  { name: "قرمز", value: "red" as const },
  { name: "سبز", value: "green" as const },
  { name: "آبی", value: "blue" as const },
  { name: "زرد", value: "yellow" as const },
  { name: "بنفش", value: "purple" as const },
  { name: "نارنجی", value: "orange" as const },
]

export default function TagsModal({ user, guestUser, tags, onClose, onTagsChange }: TagsModalProps) {
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState<Tag["color"]>("blue")
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [loading, setLoading] = useState(false)
  const [localTags, setLocalTags] = useLocalStorage<Tag[]>("aura-tags", [])
  const showToast = toast

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setLoading(true)

    try {
      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        user_id: user?.id || guestUser?.id || "guest",
        name: newTagName.trim(),
        color: newTagColor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (user) {
        const { data, error } = await supabase
          .from("tags")
          .insert({
            user_id: user.id,
            name: newTag.name,
            color: newTag.color,
          })
          .select()
          .single()

        if (error) throw error
        newTag.id = data.id
      } else {
        setLocalTags([...localTags, newTag])
      }

      setNewTagName("")
      setNewTagColor("blue")
      onTagsChange()

      showToast("برچسب اضافه شد", {
        description: `برچسب "${newTag.name}" با موفقیت ایجاد شد.`,
      })
    } catch (error) {
      console.error("خطا در ایجاد برچسب:", error)
      showToast("خطا در ایجاد برچسب", {
        description: "مشکلی در ایجاد برچسب رخ داد.",
        duration: 3000,
        className: "bg-red-500 text-white",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTag = async (tag: Tag) => {
    if (!editingTag) return

    setLoading(true)

    try {
      if (user) {
        const { error } = await supabase
          .from("tags")
          .update({
            name: editingTag.name,
            color: editingTag.color,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tag.id)

        if (error) throw error
      } else {
        const updatedTags = localTags.map((t) =>
          t.id === tag.id ? { ...editingTag, updated_at: new Date().toISOString() } : t,
        )
        setLocalTags(updatedTags)
      }

      setEditingTag(null)
      onTagsChange()

      showToast("برچسب به‌روزرسانی شد", {
        description: "تغییرات با موفقیت ذخیره شد.",
      })
    } catch (error) {
      console.error("خطا در به‌روزرسانی برچسب:", error)
      showToast("خطا در به‌روزرسانی", {
        description: "مشکلی در ذخیره تغییرات رخ داد.",
        duration: 3000,
        className: "bg-red-500 text-white",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    setLoading(true)

    try {
      if (user) {
        const { error } = await supabase.from("tags").delete().eq("id", tagId)
        if (error) throw error
      } else {
        const updatedTags = localTags.filter((t) => t.id !== tagId)
        setLocalTags(updatedTags)
      }

      onTagsChange()

      showToast("برچسب حذف شد", {
        description: "برچسب با موفقیت حذف شد.",
      })
    } catch (error) {
      console.error("خطا در حذف برچسب:", error)
      showToast("خطا در حذف برچسب", {
        description: "مشکلی در حذف برچسب رخ داد.",
        duration: 3000,
        className: "bg-red-500 text-white",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
              <TagIcon className="w-5 h-5 text-primary" />
            </motion.div>
            مدیریت برچسب‌ها
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Tag */}
          <motion.form
            onSubmit={handleAddTag}
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="tagName" className="text-sm font-medium">
                نام برچسب
              </Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="نام برچسب جدید..."
                className="glass border-0 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">رنگ برچسب</Label>
              <div className="flex flex-wrap gap-2">
                {tagColors.map((color) => (
                  <motion.button
                    key={color.value}
                    type="button"
                    onClick={() => setNewTagColor(color.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                      `tag-${color.value}`,
                      newTagColor === color.value ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105",
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {color.name}
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !newTagName.trim()}
              className="w-full glass-button bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              افزودن برچسب
            </Button>
          </motion.form>

          {/* Existing Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">برچسب‌های موجود</Label>

            <AnimatePresence>
              {tags.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <TagIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">هنوز برچسبی ایجاد نکرده‌اید</p>
                </motion.div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {tags.map((tag, index) => (
                    <motion.div
                      key={tag.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between glass-card p-3"
                    >
                      {editingTag?.id === tag.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingTag.name}
                            onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                            className="flex-1 h-8 text-sm"
                          />
                          <div className="flex gap-1">
                            {tagColors.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setEditingTag({ ...editingTag, color: color.value })}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2 transition-all",
                                  `bg-${color.value}-200 dark:bg-${color.value}-800`,
                                  editingTag.color === color.value
                                    ? "border-primary scale-110"
                                    : "border-transparent hover:scale-105",
                                )}
                              />
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleEditTag(tag)} className="h-8 w-8 p-0">
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTag(null)}
                              className="h-8 w-8 p-0"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Badge className={cn("tag", `tag-${tag.color}`, "border-0")}>{tag.name}</Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTag(tag)}
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTag(tag.id)}
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Close Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Button onClick={onClose} variant="outline" className="w-full glass-button">
              بستن
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
