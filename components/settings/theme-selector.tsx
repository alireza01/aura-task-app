"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
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
  const [selectedTheme, setSelectedTheme] = useState<string>(theme)
  const [loading, setLoading] = useState(false)
  const debouncedTheme = useDebounce(selectedTheme, 500)
  const { toast } = useToast()

  useEffect(() => {
    if (settings) {
      setSelectedTheme(settings.theme || "default")
    }
  }, [settings])

  // Save theme when debounced value changes
  useEffect(() => {
    const saveTheme = async () => {
      if (debouncedTheme === theme) return

      setLoading(true)

      try {
        // Update theme immediately for better UX
        setTheme(debouncedTheme as any)

        if (user && !("isGuest" in user)) { // Only save to Supabase if it's an authenticated user
          const { data: { user: authUser } } = await supabase.auth.getUser();
          console.log("Auth UID from Supabase:", authUser?.id);
          console.log("Attempting to save theme to Supabase with payload:", {
            user_id: user.id,
            theme: debouncedTheme,
            updated_at: new Date().toISOString(),
          });
          const { error } = await supabase.from("user_settings").upsert({
            user_id: user.id,
            theme: debouncedTheme,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          if (error) {
            console.error("Supabase upsert error object:", error)
            throw error
          }
        }

        onSettingsChange()
      } catch (error) {
        console.error("خطا در ذخیره تم:", JSON.stringify(error, null, 2))
        toast({
          title: "خطا در ذخیره تم",
          description: "مشکلی در ذخیره تم رخ داد. لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    saveTheme()
  }, [debouncedTheme, theme, user, supabase, setTheme, onSettingsChange, toast])

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
        <RadioGroup value={selectedTheme} onValueChange={setSelectedTheme} className="space-y-4" disabled={loading}>
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

        {loading && (
          <div className="mt-4 text-center">
            <div className="loading-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">در حال اعمال تم...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
