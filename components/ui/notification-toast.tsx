"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Toast {
  id: string
  title: string
  description?: string
  type: "success" | "error" | "warning" | "info"
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
}

export default function NotificationToast({ toast, onRemove }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const Icon = icons[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "back.out(1.7)" }}
          className={cn(
            "relative flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md",
            colors[toast.type],
            "backdrop-blur-sm",
          )}
        >
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{toast.title}</h4>
            {toast.description && <p className="text-sm opacity-90 mt-1">{toast.description}</p>}

            {toast.action && (
              <button onClick={toast.action.onClick} className="text-sm font-medium underline hover:no-underline mt-2">
                {toast.action.label}
              </button>
            )}
          </div>

          <button onClick={handleClose} className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Toast Manager Component
interface ToastManagerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastManager({ toasts, onRemove }: ToastManagerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <NotificationToast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}
