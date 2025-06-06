"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
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

/**
 * Props for the ThemeProvider component.
 */
interface ThemeProviderProps {
  /** The child components to be rendered within the theme context. */
  children: React.ReactNode
  /** The default theme to apply if no user preference is found. Defaults to "default". */
  defaultTheme?: Theme
}

/**
 * ThemeProvider component manages and provides the current theme and user authentication status
 * to its children components via React Context. It handles loading and saving theme preferences
 * from Supabase for authenticated users and from localStorage for guest users.
 * It also applies the selected theme as a class to the document's root element.
 *
 * @param {ThemeProviderProps} { children, defaultTheme } - The props for the ThemeProvider.
 * @returns {JSX.Element} A React Context Provider wrapping the children.
 */
export function ThemeProvider({ children, defaultTheme = "default" }: ThemeProviderProps) {
  // State to hold the currently active theme. Initializes with defaultTheme.
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  // State to hold the current Supabase user object.
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    /**
     * Effect to get the initial user and listen for authentication state changes.
     * This ensures the user state is always up-to-date with Supabase's authentication.
     */
    // Fetch the initial user session.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Subscribe to authentication state changes.
    // This listener updates the 'user' state whenever a user signs in, signs out, etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    // Cleanup function: unsubscribe from the auth state changes when the component unmounts.
    return () => subscription.unsubscribe()
  }, [supabase.auth]) // Dependency array: re-run only if supabase.auth object changes (unlikely).

  useEffect(() => {
    /**
     * Effect to load the user's theme preference.
     * For authenticated users, it fetches the theme from Supabase.
     * For guest users, it loads the theme from localStorage.
     */
    const loadTheme = async () => {
      if (user) {
        // If user is authenticated, fetch theme from their user settings in Supabase.
        const { data } = await supabase.from("user_settings").select("theme").eq("user_id", user.id).single()

        if (data?.theme) {
          setTheme(data.theme as Theme) // Apply the fetched theme.
        }
      } else {
        // If no user, try to load theme from localStorage (for guest users).
        const savedTheme = localStorage.getItem("aura-theme") as Theme
        if (savedTheme) {
          setTheme(savedTheme) // Apply the saved theme.
        }
      }
    }

    loadTheme() // Call the async function to load the theme.
  }, [user, supabase]) // Re-run this effect when 'user' or 'supabase' changes.

  useEffect(() => {
    /**
     * Effect to apply the current theme to the document's root element
     * and save the theme preference to Supabase or localStorage.
     */
    const root = document.documentElement
    // Remove all existing theme classes to ensure only the current theme is applied.
    root.classList.remove("theme-default", "theme-alireza", "theme-neda")
    // Add the class corresponding to the current theme.
    root.classList.add(`theme-${theme}`)

    // Save theme preference based on user authentication status.
    if (user) {
      // For authenticated users, upsert (insert or update) the theme in Supabase.
      supabase.from("user_settings").upsert({
        user_id: user.id,
        theme,
        updated_at: new Date().toISOString(), // Record the update timestamp.
      })
    } else {
      // For guest users, save the theme to localStorage.
      localStorage.setItem("aura-theme", theme)
    }
  }, [theme, user, supabase]) // Re-run this effect when 'theme', 'user', or 'supabase' changes.

  /**
   * Function to update the current theme. This is exposed via the context.
   * @param {Theme} newTheme - The new theme to set.
   */
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return (
    // Provide the theme, theme setter, and user to the context consumers.
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, user }}>
      {children}
      {/* Conditionally render CustomCursor only for the "alireza" theme. */}
      {theme === "alireza" && <CustomCursor />}
    </ThemeContext.Provider>
  )
}
