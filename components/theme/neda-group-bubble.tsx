"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { gsap } from "gsap"
import { cn } from "@/lib/utils"
import type { TaskGroup } from "@/types"
import BubbleEffects from "./neda-bubble-effects"

interface NedaGroupBubbleProps {
  group: TaskGroup
  isSelected: boolean
  taskCount: number
  onClick: () => void
  onDelete?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
  isDragOver?: boolean
}

export default function NedaGroupBubble({
  group,
  isSelected,
  taskCount,
  onClick,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
}: NedaGroupBubbleProps) {
  const [showDeleteEffect, setShowDeleteEffect] = useState(false)
  const [effectPosition, setEffectPosition] = useState({ x: 0, y: 0 })
  const bubbleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bubble = bubbleRef.current
    if (!bubble) return

    // Entrance animation
    gsap.fromTo(
      bubble,
      {
        scale: 0,
        opacity: 0,
        y: 20,
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "back.out(1.7)",
        delay: Math.random() * 0.3,
      },
    )

    // Hover wobble effect
    const handleMouseEnter = () => {
      gsap.to(bubble, {
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out",
      })

      // Subtle wobble
      gsap.to(bubble, {
        rotation: 2,
        duration: 0.1,
        yoyo: true,
        repeat: 3,
        ease: "power2.inOut",
      })
    }

    const handleMouseLeave = () => {
      gsap.to(bubble, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: "power2.out",
      })
    }

    bubble.addEventListener("mouseenter", handleMouseEnter)
    bubble.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      bubble.removeEventListener("mouseenter", handleMouseEnter)
      bubble.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  const handleDelete = () => {
    if (!bubbleRef.current) return

    const rect = bubbleRef.current.getBoundingClientRect()
    setEffectPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })

    // Pop animation before delete
    gsap.to(bubbleRef.current, {
      scale: 1.3,
      duration: 0.2,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(bubbleRef.current, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setShowDeleteEffect(true)
            setTimeout(() => {
              onDelete?.()
            }, 100)
          },
        })
      },
    })
  }

  return (
    <>
      <motion.div
        ref={bubbleRef}
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        whileTap={{ scale: 0.95 }}
        role="button"
        tabIndex={0}
        className={cn(
          "relative flex-shrink-0 px-6 py-4 rounded-3xl transition-all duration-300 min-w-[140px] group",
          "bg-gradient-to-br from-neda-accent-purple to-neda-accent-pink",
          "shadow-lg hover:shadow-xl",
          "border-2 border-transparent",
          isSelected && "ring-4 ring-neda-accent-purple ring-opacity-50 scale-105",
          isDragOver && "scale-110 ring-4 ring-neda-accent-teal ring-opacity-70",
        )}
        style={{
          background: isSelected
            ? "linear-gradient(135deg, #BCA9F0 0%, #FFC0CB 100%)"
            : "linear-gradient(135deg, #D8BFD8 0%, #FFB6C1 100%)",
        }}
      >
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-30"
              animate={{
                y: [-10, -30, -10],
                x: [0, 10, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3 + i,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.5,
              }}
              style={{
                left: `${20 + i * 30}%`,
                top: "70%",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <span className="text-2xl">{group.emoji}</span>
          <div className="flex-1 text-left">
            <span className="font-medium text-white text-sm block truncate max-w-[80px]">{group.name}</span>
            {taskCount > 0 && <span className="text-xs text-white/80">{taskCount} وظیفه</span>}
          </div>
        </div>

        {/* Delete button (appears on hover) */}
        {onDelete && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation()
                handleDelete()
              }
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-neda-accent-pink rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-400 cursor-pointer"
          >
            <span className="text-white text-xs">×</span>
          </div>
        )}

        {/* Ripple effect on click */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ scale: 0, opacity: 0.5 }}
            whileTap={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </motion.div>

      <BubbleEffects trigger={showDeleteEffect} type="pop" x={effectPosition.x} y={effectPosition.y} />
    </>
  )
}
