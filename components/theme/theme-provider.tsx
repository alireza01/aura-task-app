"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import CustomCursor from "./custom-cursor"

type Theme = "default" | "alireza" | "neda"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  user: User | null
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = "default" }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    // Load user's theme preference
    const loadTheme = async () => {
      if (user) {
        const { data } = await supabase.from("user_settings").select("theme").eq("user_id", user.id).single()

        if (data?.theme) {
          setTheme(data.theme as Theme)
        }
      } else {
        // Load from localStorage for guest users
        const savedTheme = localStorage.getItem("aura-theme") as Theme
        if (savedTheme) {
          setTheme(savedTheme)
        }
      }
    }

    loadTheme()
  }, [user, supabase])

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    root.classList.remove("theme-default", "theme-alireza", "theme-neda")
    root.classList.add(`theme-${theme}`)

    // Save theme preference
    if (user) {
      supabase.from("user_settings").upsert({
        user_id: user.id,
        theme,
        updated_at: new Date().toISOString(),
      })
    } else {
      localStorage.setItem("aura-theme", theme)
    }
  }, [theme, user, supabase])

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, user }}>
      {children}
      {theme === "alireza" && <CustomCursor />}
    </ThemeContext.Provider>
  )
}
