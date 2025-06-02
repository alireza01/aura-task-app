"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TaskQuickAddProps {
  onAddTask: () => void
  onQuickCreate?: (title: string) => void
  className?: string
}

export default function TaskQuickAdd({ onAddTask, onQuickCreate, className }: TaskQuickAddProps) {
  const [quickTitle, setQuickTitle] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickTitle.trim()) {
      if (onQuickCreate) {
        onQuickCreate(quickTitle.trim())
        setQuickTitle("")
        setIsFocused(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuickTitle("")
      setIsFocused(false)
    }
  }

  return (
    <motion.div
      className={cn("mb-6", className)}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="glass-card p-4 border-0">
        <form onSubmit={handleQuickSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => !quickTitle && setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="یک وظیفه جدید اضافه کنید..."
              className={cn(
                "glass border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-300 pr-12",
                isFocused && "ring-2 ring-primary/20",
              )}
            />
            <motion.div
              className="absolute right-3 top-1/2 -translate-y-1/2"
              animate={{ scale: isFocused ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>

          <motion.div className="flex gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {quickTitle.trim() && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  type="submit"
                  size="sm"
                  className="glass-button bg-primary/90 text-white hover:bg-primary gap-2"
                >
                  <Plus className="w-4 h-4" />
                  سریع
                </Button>
              </motion.div>
            )}

            <Button type="button" onClick={onAddTask} size="sm" variant="outline" className="glass-button gap-2">
              <Plus className="w-4 h-4" />
              تفصیلی
            </Button>
          </motion.div>
        </form>

        <motion.div
          className="mt-3 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 1 : 0.7 }}
          transition={{ duration: 0.2 }}
        >
          <p>💡 نکته: برای ایجاد سریع Enter بزنید، برای تنظیمات بیشتر روی "تفصیلی" کلیک کنید</p>
        </motion.div>
      </div>
    </motion.div>
  )
}
