"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task, User, GuestUser } from "@/types"
import { Archive, RotateCcw, Trash2, Calendar, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useToast } from "@/components/ui/use-toast"

interface ArchiveViewProps {
  user: User | null
  archivedTasks: Task[]
  onTasksChange: () => void
  isVisible: boolean
  onToggle: () => void
}

export default function ArchiveView({
  user,
  archivedTasks,
  onTasksChange,
  isVisible,
  onToggle,
}: ArchiveViewProps) {
  const [localTasks, setLocalTasks] = useLocalStorage<Task[]>("aura-tasks", [])
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const handleUnarchive = async (taskId: string) => {
    setLoading(taskId)

    try {
      if (user) {
        await supabase
          .from("tasks")
          .update({
            completed: false,
            completed_at: null,
          })
          .eq("id", taskId)
      } else {
        const updatedTasks = localTasks.map((task) =>
          task.id === taskId ? { ...task, completed: false, completed_at: null } : task,
        )
        setLocalTasks(updatedTasks)
      }

      onTasksChange()

      toast({
        title: "وظیفه بازگردانی شد",
        description: "وظیفه از آرشیو به لیست فعال منتقل شد.",
      })
    } catch (error) {
      console.error("خطا در بازگردانی وظیفه:", error)
      toast({
        title: "خطا در بازگردانی",
        description: "مشکلی در بازگردانی وظیفه رخ داد.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handlePermanentDelete = async (taskId: string) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این وظیفه را برای همیشه حذف کنید؟")) {
      return
    }

    setLoading(taskId)

    try {
      if (user) {
        await supabase.from("tasks").delete().eq("id", taskId)
      } else {
        const updatedTasks = localTasks.filter((task) => task.id !== taskId)
        setLocalTasks(updatedTasks)
      }

      onTasksChange()

      toast({
        title: "وظیفه حذف شد",
        description: "وظیفه برای همیشه حذف شد.",
      })
    } catch (error) {
      console.error("خطا در حذف وظیفه:", error)
      toast({
        title: "خطا در حذف",
        description: "مشکلی در حذف وظیفه رخ داد.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "کمتر از یک ساعت پیش"
    if (diffInHours < 24) return `${diffInHours} ساعت پیش`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} روز پیش`
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks} هفته پیش`
  }

  return (
    <Card className="glass-card border-0 bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-muted-foreground">آرشیو ({archivedTasks.length} وظیفه تکمیل شده)</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {isVisible ? "پنهان کردن" : "نمایش آرشیو"}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {archivedTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">هنوز وظیفه‌ای تکمیل نکرده‌اید</p>
                </motion.div>
              ) : (
                archivedTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card p-4 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {task.emoji && <span className="text-lg opacity-60">{task.emoji}</span>}
                          <h3 className="font-medium text-foreground/70 line-through truncate">{task.title}</h3>
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-through">{task.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>تکمیل شده: {task.completed_at && formatDate(task.completed_at)}</span>
                          <Clock className="w-3 h-3 mr-2" />
                          <span>{task.completed_at && getTimeAgo(task.completed_at)}</span>
                        </div>

                        {/* AI Scores */}
                        {(task.speed_score || task.importance_score) && (
                          <div className="flex items-center gap-2 mt-2">
                            {task.speed_score && (
                              <Badge variant="outline" className="text-xs opacity-60">
                                سرعت: {task.speed_score}/20
                              </Badge>
                            )}
                            {task.importance_score && (
                              <Badge variant="outline" className="text-xs opacity-60">
                                اهمیت: {task.importance_score}/20
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnarchive(task.id)}
                            disabled={loading === task.id}
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            title="بازگردانی از آرشیو"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePermanentDelete(task.id)}
                            disabled={loading === task.id}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            title="حذف دائمی"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    {loading === task.id && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                        <div className="loading-dots">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
