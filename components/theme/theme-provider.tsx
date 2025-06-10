// components/theme/theme-provider.tsx
"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import CustomCursor from "./custom-cursor"
import { createClient } from "@/lib/supabase/client"; // For reading user session
import type { User } from "@supabase/supabase-js";

type Theme = "default" | "alireza" | "neda";
const THEME_LOCAL_STORAGE_KEY = "aura-task-theme"; // Define a key for localStorage

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLoadingTheme: boolean; // To indicate if theme is being loaded
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = "default" }: ThemeProviderProps) {
  const [theme, setThemeInternal] = useState<Theme>(defaultTheme);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true); // Start with loading true
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  // Effect to get current user
  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSupabaseUser(user);
    };
    fetchUser();

    // Listen for auth changes to update user
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);


  // Effect to load theme on initial mount or when user changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingTheme(true);

    async function loadTheme() {
      let newTheme: Theme | null = null;

      if (supabaseUser) {
        try {
          const response = await fetch("/api/user/theme"); // GET request
          if (response.ok) {
            const data = await response.json();
            if (data.theme && ["default", "alireza", "neda"].includes(data.theme)) {
              newTheme = data.theme as Theme;
            }
          } else {
            console.warn("Failed to fetch theme from server, using fallback.");
          }
        } catch (error) {
          console.error("Error fetching theme from server:", error);
        }
      }

      // Fallback to localStorage if no user or server fetch failed
      if (!newTheme) {
        try {
          const storedTheme = localStorage.getItem(THEME_LOCAL_STORAGE_KEY) as Theme | null;
          if (storedTheme && ["default", "alireza", "neda"].includes(storedTheme)) {
            newTheme = storedTheme;
          }
        } catch (e) {
          // In case localStorage is disabled or inaccessible
          console.warn("Could not access localStorage for theme.");
        }
      }

      if (isMounted) {
        setThemeInternal(newTheme || defaultTheme);
        setIsLoadingTheme(false);
      }
    }

    loadTheme();
    return () => { isMounted = false; };
  }, [supabaseUser, defaultTheme]);


  // Effect to apply theme to document and save to localStorage
  useEffect(() => {
    if (!isLoadingTheme) { // Only apply and save once theme is loaded
      const root = document.documentElement;
      root.classList.remove("theme-default", "theme-alireza", "theme-neda");
      root.classList.add(`theme-${theme}`);
      try {
        localStorage.setItem(THEME_LOCAL_STORAGE_KEY, theme);
      } catch (e) {
        console.warn("Could not save theme to localStorage.");
      }
    }
  }, [theme, isLoadingTheme]);

  const updateTheme = (newTheme: Theme) => {
    if (["default", "alireza", "neda"].includes(newTheme)) {
      setThemeInternal(newTheme);
      // Saving to server is handled by ThemeSelector, localStorage is updated by the effect above
    }
  };

  // Prevent rendering children until theme is loaded to avoid flash of unstyled content (FOUC)
  // or show a loader if preferred. For now, just don't apply theme class until loaded.
  // Alternatively, apply default theme immediately and then update.
  // The current setup applies defaultTheme initially, then updates from DB/localStorage.

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, isLoadingTheme }}>
      {children}
      {theme === "alireza" && !isLoadingTheme && <CustomCursor />}
    </ThemeContext.Provider>
  );
}
