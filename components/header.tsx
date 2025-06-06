"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search, Settings, LogOut, Moon, Sun, Sparkles, UserIcon } from "lucide-react"
import { motion } from "framer-motion"

interface HeaderProps {
  user: User | null
  onSettingsChange?: () => void
  onSearch?: (query: string) => void
}

export default function Header({ user, onSettingsChange, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (error) {
      console.error("خطا در ورود:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, onSearch])

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
              aria-label="آرم AuraTask"
              role="button"
            >
              <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
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
              placeholder="جستجو در وظایف..."
              className="w-full pl-10 glass border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="جستجو"
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
              aria-label="تغییر تم"
            >
              <Sun
                className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                aria-hidden="true"
              />
              <Moon
                className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                aria-hidden="true"
              />
              <span className="sr-only">تغییر تم</span>
            </Button>
          </motion.div>

          {/* Settings */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsChange}
              className="glass-button w-10 h-10 rounded-xl"
              aria-label="تنظیمات"
            >
              <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.3 }}>
                <Settings className="h-4 w-4" aria-hidden="true" />
              </motion.div>
              <span className="sr-only">تنظیمات</span>
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
                    aria-label="پروفایل کاربری"
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
                    <p className="font-medium text-sm">{user.user_metadata?.full_name || user.email}</p>
                    <p className="w-[200px] truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSettingsChange && onSettingsChange()}>
                  <Settings className="ml-2 h-4 w-4" />
                  <span>تنظیمات</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>خروج</span>
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
                aria-label="ورود"
              >
                <UserIcon className="w-4 h-4" />
                {loading ? "در حال ورود..." : "ورود"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.header>
  )
}
