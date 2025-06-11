// components/header.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { supabase as supabaseClientImport } from "lib/supabase/client"
// FIX: Add UserProfile type to the component props
import type { User, UserProfile } from "types"
import { signOut } from "lib/auth/actions"
import { useDebounce } from "hooks/use-debounce"
import { Button } from "components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu"
import { Input } from "components/ui/input"
import { Search, Settings, LogOut, Moon, Sun, Sparkles, UserIcon } from "lucide-react"
import { motion } from "framer-motion"

interface HeaderProps {
  user: User | null
  // FIX: Add userProfile to props
  userProfile: UserProfile | null
  onSettingsChange?: () => void
  onSearch?: (query: string) => void
  // FIX: Add searchValue to props for controlled component
  searchValue: string;
}

export default function Header({ user, userProfile, onSettingsChange, onSearch, searchValue }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState(searchValue) // FIX: Initialize with prop
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleSignIn = async () => {
    setLoading(true)
    try {
      // FIX: The `linkUser` method is deprecated. Use `signInWithOAuth` with `link` option instead.
      // However, guest upgrade logic is complex. For now, we simplify to a standard sign-in.
      // The Zustand store and AppInitializer should handle the transition from guest to full user.
      await supabaseClientImport.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    // FIX: signOut server action doesn't take arguments
    await signOut()
  }

  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, onSearch])

  // FIX: Sync local search state if the prop changes from outside (e.g., clearing filters)
  useEffect(() => {
    setSearchQuery(searchValue);
  }, [searchValue]);

  // ... (rest of the return JSX is mostly fine, just ensure userProfile is used where appropriate if needed)
  return (
    <motion.header
      className="sticky top-0 z-50 w-full glass border-b border-white/10 shadow-sm transition-shadow duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="container flex h-16 items-center justify-between px-6 flex-row-reverse">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <motion.div
              className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              aria-label="AuraTask Logo"
              role="button"
            >
              <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              aria-hidden="true"
            />
          </div>
          <span className="text-xl font-bold gradient-text">AuraTask</span>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          className="hidden md:flex flex-1 max-w-md mx-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search in tasks..."
              className="w-full pl-10 glass border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              aria-label="Search"
            />
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Theme Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="glass-button w-10 h-10 rounded-xl"
              aria-label="Toggle theme"
            >
              <Sun
                className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                aria-hidden="true"
              />
              <Moon
                className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                aria-hidden="true"
              />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </motion.div>

          {/* Settings */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsChange}
              className="glass-button w-10 h-10 rounded-xl"
              aria-label="Settings"
            >
              <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.3 }}>
                <Settings className="h-4 w-4" aria-hidden="true" />
              </motion.div>
              <span className="sr-only">Settings</span>
            </Button>
          </motion.div>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-xl glass-button"
                    aria-label="User profile"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} alt={user.email || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-card border-0 w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{userProfile?.nickname || user.user_metadata?.full_name || user.email}</p>
                    <p className="w-[200px] truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSettingsChange && onSettingsChange()}>
                  <Settings className="ml-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSignIn}
                disabled={loading}
                variant="outline"
                className="glass-button rounded-xl gap-2"
                aria-label="Sign In"
              >
                <UserIcon className="w-4" />
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.header>
  )
}
