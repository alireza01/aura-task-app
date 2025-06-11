"use client"

import { cn } from "@/lib/utils"

import { motion } from "framer-motion"
import { AlertTriangle, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText: string
  cancelText?: string
  type?: "danger" | "warning" | "info"
  onConfirm: () => void
  loading?: boolean
}

const icons = {
  danger: Trash2,
  warning: AlertTriangle,
  info: X,
}

const colors = {
  danger: "text-red-600",
  warning: "text-yellow-600",
  info: "text-blue-600",
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = "انصراف",
  type = "danger",
  onConfirm,
  loading = false,
}: ConfirmationDialogProps) {
  const Icon = icons[type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className={cn("p-2 rounded-full bg-opacity-10", colors[type])}
            >
              <Icon className={cn("h-6 w-6", colors[type])} />
            </motion.div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <p className="text-muted-foreground leading-relaxed">{description}</p>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 glass-button"
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                "flex-1 glass-button",
                type === "danger" && "bg-red-600 hover:bg-red-700 text-white",
                type === "warning" && "bg-yellow-600 hover:bg-yellow-700 text-white",
                type === "info" && "bg-blue-600 hover:bg-blue-700 text-white",
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="loading-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  در حال انجام...
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
