"use client"

import type { ReactNode } from "react"
import { toast as sonnerToast, type ExternalToast } from "sonner"

interface ToastOptions extends ExternalToast {
  title: ReactNode
  description?: ReactNode
  variant?: "default" | "destructive" | "success" | "warning" | "info"
}

export function useToast() {
  const customToast = (options: ToastOptions) => {
    const { title, description, variant, ...rest } = options

    let className = rest.className || ""
    if (variant === "destructive") {
      className += " bg-red-500 text-white"
    } else if (variant === "success") {
      className += " bg-green-500 text-white"
    } else if (variant === "warning") {
      className += " bg-yellow-500 text-black"
    } else if (variant === "info") {
      className += " bg-blue-500 text-white"
    }

    return sonnerToast(title, {
      description,
      className,
      ...rest,
    })
  }

  return {
    toast: customToast,
    success: sonnerToast.success,
    error: sonnerToast.error,
    loading: sonnerToast.loading,
  }
}