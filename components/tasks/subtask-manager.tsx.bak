"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, ListTodo, Sparkles } from "lucide-react"

interface SubTaskManagerProps {
  subtasks: string[]
  onSubtasksChange: (subtasks: string[]) => void
  disabled?: boolean
  aiEnabled?: boolean
}

export default function SubTaskManager({
  subtasks,
  onSubtasksChange,
  disabled = false,
  aiEnabled = false,
}: SubTaskManagerProps) {
  const [newSubtask, setNewSubtask] = useState("")

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return

    onSubtasksChange([...subtasks, newSubtask.trim()])
    setNewSubtask("")
  }

  const handleRemoveSubtask = (index: number) => {
    const updatedSubtasks = subtasks.filter((_, i) => i !== index)
    onSubtasksChange(updatedSubtasks)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListTodo className="h-5 w-5 text-primary" />
          وظایف فرعی
        </CardTitle>
        <CardDescription>
          {aiEnabled && disabled
            ? "هوش مصنوعی وظایف فرعی را به طور خودکار پیشنهاد خواهد داد"
            : "وظایف کوچک‌تری که برای تکمیل این وظیفه نیاز است"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Notice */}
        {aiEnabled && disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">
              هوش مصنوعی پس از ایجاد وظیفه، زیروظایف مناسب را پیشنهاد خواهد داد
            </span>
          </motion.div>
        )}

        {/* Existing Subtasks List */}
        <AnimatePresence>
          {subtasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium">وظایف فرعی موجود:</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {subtasks.map((subtask, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 glass-card p-3"
                  >
                    <span className="flex-1 text-sm">{subtask}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSubtask(index)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`حذف زیروظیفه: ${subtask}`}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add New Subtask */}
        {!disabled && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <Label htmlFor="new-subtask" className="text-sm font-medium">
              افزودن وظیفه فرعی جدید:
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="افزودن وظیفه فرعی..."
                className="glass border-0 focus:ring-2 focus:ring-primary/20"
              />
              <Button
                type="button"
                onClick={handleAddSubtask}
                size="sm"
                disabled={!newSubtask.trim()}
                className="glass-button bg-primary/90 text-white hover:bg-primary"
                aria-label="افزودن زیروظیفه"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {subtasks.length === 0 && !disabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-muted-foreground"
          >
            <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">هنوز زیروظیفه‌ای اضافه نکرده‌اید</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
