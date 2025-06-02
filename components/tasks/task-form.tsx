"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Clock, Star, Plus, Loader2 } from "lucide-react"
import type { Task, TaskGroup, UserSettings, User, GuestUser, Tag } from "@/types"
import SubTaskManager from "@/components/tasks/subtask-manager"
import { cn } from "@/lib/utils"

// Form validation schema
const taskFormSchema = z.object({
  title: z.string().min(1, "عنوان وظیفه الزامی است"),
  description: z.string().optional(),
  groupId: z.string().optional(),
  autoRanking: z.boolean(),
  autoSubtasks: z.boolean(),
  speedScore: z.number().min(1).max(20),
  importanceScore: z.number().min(1).max(20),
  emoji: z.string().optional(),
  subtasks: z.array(z.string()).optional(),
})

type TaskFormData = z.infer<typeof taskFormSchema>

interface TaskFormProps {
  user: User | null
  guestUser: GuestUser | null
  groups: TaskGroup[]
  tags: Tag[]
  settings: UserSettings | null
  taskToEdit?: Task | null
  initialTitle?: string
  loading: boolean
  onSave: (data: any) => void
  onCancel: () => void
  isEditMode: boolean
}

export default function TaskForm({
  user,
  guestUser,
  groups,
  tags, // Add tags here
  settings,
  taskToEdit,
  initialTitle = "",
  loading,
  onSave,
  onCancel,
  isEditMode,
}: TaskFormProps) {
  const [subtasks, setSubtasks] = useState<string[]>([])
  const [aiProcessing, setAiProcessing] = useState(false)
  const canUseAI = user && settings?.gemini_api_key

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: taskToEdit?.title || initialTitle,
      description: taskToEdit?.description || "",
      groupId: taskToEdit?.group_id || "",
      speedScore: taskToEdit?.speed_score || 10,
      importanceScore: taskToEdit?.importance_score || 10,
      emoji: taskToEdit?.emoji || "📝",
      autoRanking: canUseAI ? true : false,
      autoSubtasks: canUseAI ? true : false,
    },
  })

  const watchAutoRanking = watch("autoRanking")
  const watchAutoSubtasks = watch("autoSubtasks")
  const watchTitle = watch("title")
  const watchDescription = watch("description")

  // Initialize subtasks for edit mode
  useEffect(() => {
    if (taskToEdit?.subtasks) {
      setSubtasks(taskToEdit.subtasks.map((st) => st.title))
    }
  }, [taskToEdit])

  // Handle tags separately as they are not part of react-hook-form
  const [selectedTags, setSelectedTags] = useState<string[]>(taskToEdit?.tags?.map((t) => t.id) || [])

  useEffect(() => {
    if (taskToEdit?.tags) {
      setSelectedTags(taskToEdit.tags.map((t) => t.id))
    }
  }, [taskToEdit])

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const handleFormSubmit = async (data: TaskFormData) => {
    const finalData = { ...data, subtasks, selectedTags }

    // AI Processing if enabled
    if (canUseAI && (data.autoRanking || data.autoSubtasks)) {
      setAiProcessing(true)

      try {
        const aiResponse = await fetch("/api/process-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            autoRanking: data.autoRanking,
            autoSubtasks: data.autoSubtasks,
            userId: user!.id,
          }),
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()

          if (data.autoRanking) {
            finalData.speedScore = aiData.speedScore
            finalData.importanceScore = aiData.importanceScore
          }

          finalData.emoji = aiData.emoji
          if (data.autoSubtasks && aiData.subtasks?.length > 0) {
            finalData.subtasks = [...subtasks, ...aiData.subtasks]
          }
        }
      } catch (error) {
        console.error("خطا در پردازش هوش مصنوعی:", error)
      } finally {
        setAiProcessing(false)
      }
    }

    onSave(finalData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Title */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Label htmlFor="title" className="text-sm font-medium">
          عنوان وظیفه *
        </Label>
        <Input
          id="title"
          {...register("title")}
          value={watchTitle}
          onChange={(e) => setValue("title", e.target.value)}
          placeholder="عنوان وظیفه را وارد کنید..."
          required
          className="glass border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
          aria-invalid={errors.title ? "true" : "false"}
        />
        {errors.title && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {errors.title.message}
          </motion.p>
        )}
      </motion.div>

      {/* Description */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Label htmlFor="description" className="text-sm font-medium">
          توضیحات
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          value={watchDescription}
          onChange={(e) => setValue("description", e.target.value)}
          placeholder="توضیحات تکمیلی..."
          rows={3}
          className="glass border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
        />
      </motion.div>

      {/* Emoji */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Label htmlFor="emoji" className="text-sm font-medium">
          ایموجی
        </Label>
        <Input
          id="emoji"
          {...register("emoji")}
          value={watch("emoji")}
          onChange={(e) => setValue("emoji", e.target.value)}
          placeholder="📝"
          className="glass border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-300 w-20 text-center text-lg"
        />
      </motion.div>

      {/* Group Selection */}
      {groups.length > 0 && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Label className="text-sm font-medium">گروه</Label>
          <Select value={watch("groupId")} onValueChange={(value) => setValue("groupId", value)}>
            <SelectTrigger className="glass border-0 focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder="انتخاب گروه (اختیاری)" />
            </SelectTrigger>
            <SelectContent className="glass-card border-0">
              <SelectItem value="none">بدون گروه</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <span className="flex items-center gap-2">
                    {group.emoji} {group.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Label className="text-sm font-medium">برچسب‌ها</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: Tag) => (
              <motion.div key={tag.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover-scale",
                    selectedTags.includes(tag.id) ? `tag-${tag.color} border-0` : "glass border-0 hover:bg-primary/10",
                  )}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Settings */}
      {canUseAI && (
        <motion.div
          className="space-y-4 glass-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">تنظیمات هوش مصنوعی</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <Label className="text-sm">رتبه‌بندی خودکار</Label>
            </div>
            <Switch checked={watchAutoRanking} onCheckedChange={(value) => setValue("autoRanking", value)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-500" />
              <Label className="text-sm">تولید زیروظایف</Label>
            </div>
            <Switch checked={watchAutoSubtasks} onCheckedChange={(value) => setValue("autoSubtasks", value)} />
          </div>
        </motion.div>
      )}

      {/* Manual Scoring */}
      {(!canUseAI || !watchAutoRanking) && (
        <motion.div
          className="space-y-4 glass-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <Label className="text-sm">سرعت انجام</Label>
              </div>
              <span className="text-sm font-medium">{watch("speedScore")}/20</span>
            </div>
            <Slider
              value={[watch("speedScore")]}
              onValueChange={(value) => setValue("speedScore", value[0])}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-500" />
                <Label className="text-sm">اهمیت</Label>
              </div>
              <span className="text-sm font-medium">{watch("importanceScore")}/20</span>
            </div>
            <Slider
              value={[watch("importanceScore")]}
              onValueChange={(value) => setValue("importanceScore", value[0])}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </motion.div>
      )}

      {/* Subtasks */}
      {(!canUseAI || !watchAutoSubtasks) && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Label className="text-sm font-medium">زیروظایف</Label>

          <SubTaskManager
            subtasks={subtasks}
            onSubtasksChange={setSubtasks}
            disabled={!!(canUseAI && watchAutoSubtasks && !isEditMode)}
            aiEnabled={!!(canUseAI && watchAutoSubtasks)}
          />
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="flex gap-3 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 glass-button">
          انصراف
        </Button>
        <Button
          type="submit"
          disabled={loading || aiProcessing || !watchTitle?.trim()}
          className="flex-1 glass-button bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading || aiProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {aiProcessing ? "پردازش هوش مصنوعی..." : isEditMode ? "در حال به‌روزرسانی..." : "در حال ایجاد..."}
            </div>
          ) : isEditMode ? (
            "ذخیره تغییرات"
          ) : (
            "ایجاد وظیفه"
          )}
        </Button>
      </motion.div>
    </form>
  )
}
