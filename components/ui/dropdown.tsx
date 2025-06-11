"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  value?: string
  placeholder?: string
  onSelect: (value: string) => void
  className?: string
  disabled?: boolean
}

export default function Dropdown({ options, value, placeholder, onSelect, className, disabled }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, options.length)
  }, [options])

  useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex(option => option.value === value && !option.disabled)
      setFocusedOptionIndex(selectedIndex !== -1 ? selectedIndex : options.findIndex(option => !option.disabled))
    } else {
      setFocusedOptionIndex(-1)
    }
  }, [isOpen, options, value])

  useEffect(() => {
    if (isOpen && focusedOptionIndex !== -1 && optionRefs.current[focusedOptionIndex]) {
      optionRefs.current[focusedOptionIndex]?.scrollIntoView({
        block: "nearest",
      })
    }
  }, [isOpen, focusedOptionIndex])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault()
        if (isOpen) {
          if (focusedOptionIndex !== -1 && options[focusedOptionIndex] && !options[focusedOptionIndex].disabled) {
            onSelect(options[focusedOptionIndex].value)
            setIsOpen(false)
          }
        } else {
          setIsOpen(true)
        }
        break
      case "Escape":
        setIsOpen(false)
        break
      case "ArrowDown":
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          let nextIndex = focusedOptionIndex
          do {
            nextIndex = (nextIndex + 1) % options.length
          } while (options[nextIndex].disabled && nextIndex !== focusedOptionIndex)
          if (!options[nextIndex].disabled) {
            setFocusedOptionIndex(nextIndex)
          }
        }
        break
      case "ArrowUp":
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true) // Optionally open and focus last/first
        } else {
          let prevIndex = focusedOptionIndex
          do {
            prevIndex = (prevIndex - 1 + options.length) % options.length
          } while (options[prevIndex].disabled && prevIndex !== focusedOptionIndex)
          if (!options[prevIndex].disabled) {
            setFocusedOptionIndex(prevIndex)
          }
        }
        break
    }
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        id={cn("dropdown-button", placeholder?.replace(/\s+/g, "-").toLowerCase())}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-right",
          "bg-background border border-border rounded-lg",
          "hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "border-primary ring-2 ring-primary/20",
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && focusedOptionIndex !== -1 ? `dropdown-option-${options[focusedOptionIndex]?.value}` : undefined}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon}
          <span className={cn("text-sm", !selectedOption && "text-muted-foreground")}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 z-50"
          >
            <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden" role="listbox">
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {options.map((option, index) => (
                  <button
                    ref={(el) => (optionRefs.current[index] = el)}
                    id={`dropdown-option-${option.value}`}
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (!option.disabled) {
                        onSelect(option.value)
                        setIsOpen(false)
                      }
                    }}
                    onMouseEnter={() => !option.disabled && setFocusedOptionIndex(index)}
                    disabled={option.disabled}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-right text-sm",
                      "hover:bg-muted focus:bg-muted focus:outline-none transition-colors duration-150",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      option.value === value && "bg-primary/10 text-primary",
                      index === focusedOptionIndex && !option.disabled && "bg-muted",
                    )}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                    {option.value === value && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
