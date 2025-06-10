"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import CustomCursor from "./custom-cursor"

type Theme = "default" | "alireza" | "neda"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
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
 * ThemeProvider component manages and provides the current theme
 * to its children components via React Context.
 * It also applies the selected theme as a class to the document's root element.
 *
 * @param {ThemeProviderProps} { children, defaultTheme } - The props for the ThemeProvider.
 * @returns {JSX.Element} A React Context Provider wrapping the children.
 */
export function ThemeProvider({ children, defaultTheme = "default" }: ThemeProviderProps) {
  // State to hold the currently active theme. Initializes with defaultTheme.
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    /**
     * Effect to apply the current theme to the document's root element.
     */
    const root = document.documentElement
    // Remove all existing theme classes to ensure only the current theme is applied.
    root.classList.remove("theme-default", "theme-alireza", "theme-neda")
    // Add the class corresponding to the current theme.
    root.classList.add(`theme-${theme}`)
  }, [theme]) // Re-run this effect when 'theme' changes.

  /**
   * Function to update the current theme. This is exposed via the context.
   * @param {Theme} newTheme - The new theme to set.
   */
  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  return (
    // Provide the theme and theme setter to the context consumers.
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
      {/* Conditionally render CustomCursor only for the "alireza" theme. */}
      {theme === "alireza" && <CustomCursor />}
    </ThemeContext.Provider>
  )
}
