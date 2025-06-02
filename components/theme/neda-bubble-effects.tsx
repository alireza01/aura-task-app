"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"

interface BubbleEffectsProps {
  trigger?: boolean
  type?: "pop" | "confetti" | "sparkle"
  color?: string
  x?: number
  y?: number
}

export default function BubbleEffects({ trigger, type = "pop", color = "#BCA9F0", x = 0, y = 0 }: BubbleEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!trigger || !containerRef.current) return

    const container = containerRef.current

    if (type === "pop") {
      // Create bubble pop effect
      const bubbles = Array.from({ length: 8 }, (_, i) => {
        const bubble = document.createElement("div")
        bubble.className = "absolute w-3 h-3 rounded-full pointer-events-none"
        bubble.style.background = i % 2 === 0 ? color : "#FFC0CB"
        bubble.style.left = `${x}px`
        bubble.style.top = `${y}px`
        container.appendChild(bubble)
        return bubble
      })

      // Animate bubbles
      bubbles.forEach((bubble, i) => {
        const angle = (i / bubbles.length) * Math.PI * 2
        const distance = 50 + Math.random() * 30
        const endX = Math.cos(angle) * distance
        const endY = Math.sin(angle) * distance

        gsap.fromTo(
          bubble,
          {
            scale: 0,
            opacity: 1,
          },
          {
            x: endX,
            y: endY,
            scale: 1,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => {
              container.removeChild(bubble)
            },
          },
        )
      })
    } else if (type === "confetti") {
      // Create confetti effect
      const particles = Array.from({ length: 12 }, (_, i) => {
        const particle = document.createElement("div")
        particle.className = "absolute w-2 h-2 pointer-events-none"
        particle.style.background = ["#BCA9F0", "#FFC0CB", "#A0D2DB"][i % 3]
        particle.style.borderRadius = Math.random() > 0.5 ? "50%" : "0"
        particle.style.left = `${x}px`
        particle.style.top = `${y}px`
        container.appendChild(particle)
        return particle
      })

      particles.forEach((particle, i) => {
        const angle = Math.random() * Math.PI * 2
        const distance = 40 + Math.random() * 40
        const endX = Math.cos(angle) * distance
        const endY = Math.sin(angle) * distance - 20

        gsap.fromTo(
          particle,
          {
            scale: 0,
            rotation: 0,
            opacity: 1,
          },
          {
            x: endX,
            y: endY,
            scale: 1,
            rotation: 360,
            opacity: 0,
            duration: 1.2,
            ease: "power2.out",
            delay: i * 0.05,
            onComplete: () => {
              container.removeChild(particle)
            },
          },
        )
      })
    }
  }, [trigger, type, color, x, y])

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-50" />
}
