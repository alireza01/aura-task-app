"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Palette, Moon, Sun, Sparkles } from "lucide-react"
import type { UserSettings, GuestUser } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"
import { useTheme } from "@/components/theme/theme-provider"

interface ThemeSelectorProps {
  user: User | GuestUser | null
  settings: UserSettings | null
  onSettingsChange: () => void
}

export default function ThemeSelector({ user, settings, onSettingsChange }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  // Initialize selectedTheme with the theme from context, update if settings prop changes.
  const [selectedTheme, setSelectedTheme] = useState<string>(theme)
  const { toast } = useToast() // Retain toast for other potential uses or remove if not used elsewhere

  useEffect(() => {
    // Reflect theme from useTheme context
    setSelectedTheme(theme)
  }, [theme])

  useEffect(() => {
    // If initial settings are provided, they might override the context theme initially
    // or update if settings prop changes externally.
    if (settings) {
      setSelectedTheme(settings.theme || "default")
    }
  }, [settings])

  const handleThemeChange = (newThemeValue: string) => {
    const newTheme = newThemeValue as "default" | "alireza" | "neda" // Cast to Theme type
    setSelectedTheme(newTheme) // Update local state for UI responsiveness
    setTheme(newTheme) // Update theme in context, ThemeProvider handles saving
    onSettingsChange() // Callback for parent component
  }

  const themes = [
    {
      id: "default",
      name: "سیاه و سفید (پیش‌فرض)",
      description: "تم کلاسیک با رنگ‌های سیاه و سفید",
      icon: <Sun className="h-5 w-5" />,
      preview: "bg-white border-gray-200",
    },
    {
      id: "alireza",
      name: "پوسته علیرضا",
      description: "طراحی مینیمال و مدرن با لهجه زرد",
      icon: <Moon className="h-5 w-5" />,
      preview: "bg-alireza-main border-alireza-yellow",
    },
    {
      id: "neda",
      name: "پوسته ندا",
      description: "طراحی شاد و رنگارنگ با انیمیشن‌های جذاب",
      icon: <Sparkles className="h-5 w-5" />,
      preview: "bg-neda-main border-neda-accent",
    },
  ]

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-primary" />
          انتخاب پوسته
        </CardTitle>
        <CardDescription>ظاهر اپلیکیشن را مطابق سلیقه خود تنظیم کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedTheme} onValueChange={handleThemeChange} className="space-y-4">
          {themes.map((themeOption) => (
            <div key={themeOption.id} className="relative">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center space-x-2 space-x-reverse rounded-lg border p-4 cursor-pointer transition-all duration-300
                  ${selectedTheme === themeOption.id ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-primary/50"}
                `}
              >
                <RadioGroupItem
                  value={themeOption.id}
                  id={themeOption.id}
                  className="sr-only"
                  aria-label={themeOption.name}
                />

                {/* Theme Preview */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${themeOption.preview} transition-all duration-300`}
                >
                  {themeOption.icon}
                </div>

                <div className="flex-1 mr-4">
                  <Label htmlFor={themeOption.id} className="text-base font-medium cursor-pointer">
                    {themeOption.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                </div>

                {selectedTheme === themeOption.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary"
                  />
                )}
              </motion.div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
