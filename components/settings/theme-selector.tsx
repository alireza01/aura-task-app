// components/settings/theme-selector.tsx
"use client"

import { useState, useEffect } from "react"
// import { createClient } from "@/lib/supabase/client" // Remove if not used for reading
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
// import { useToast } from "@/components/ui/use-toast"; // Ensure useToast is imported if you use it for API errors - Sonner is used instead
import { toast as sonnerToast } from "sonner"; // Using sonner for consistency if project uses it
import { motion } from "framer-motion"
import { Palette, Moon, Sun, Sparkles } from "lucide-react"
import type { UserSettings, GuestUser } from "@/types"
// import { useDebounce } from "@/hooks/use-debounce" // Likely not needed anymore for theme saving
import { useTheme } from "@/components/theme/theme-provider"

interface ThemeSelectorProps {
  user: User | GuestUser | null
  settings: UserSettings | null // This might become less directly relevant for theme if fetched by ThemeProvider
  onSettingsChange: () => void
}

export default function ThemeSelector({ user, settings, onSettingsChange }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<string>(theme); // Initialize with context theme
  // const { toast } = useToast(); // Sonner is used instead
  // const [supabase] = useState(() => createClient()) // Remove if not used for other operations

  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  // This useEffect might be simplified or removed if ThemeProvider handles initial load from DB
  useEffect(() => {
    if (settings?.theme && settings.theme !== selectedTheme) {
      // This could cause a loop if not handled carefully with ThemeProvider's own loading.
      // It's generally better for ThemeProvider to be the source of truth after initial load.
      // setSelectedTheme(settings.theme); // Let's rely on theme from context primarily
    }
  }, [settings?.theme, selectedTheme]); // Added selectedTheme to dependency array


  const handleThemeChange = async (newThemeValue: string) => {
    const newTheme = newThemeValue as "default" | "alireza" | "neda"; // Ensure type safety
    setSelectedTheme(newTheme); // Update local UI immediately
    setTheme(newTheme); // Update context, ThemeProvider will apply it visually

    if (user && !('isGuest' in user)) {
      try {
        const response = await fetch("/api/user/theme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ theme: newTheme }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save theme");
        }
        // Optionally, show a success toast, though might be too noisy for theme changes
        // sonnerToast.success("Theme saved to your profile!");
      } catch (error) {
        console.error("Error saving theme preference:", error);
        sonnerToast.error("خطا در ذخیره پوسته", {
          description: (error as Error).message || "Could not save theme to your profile.",
        });
      }
    }

    onSettingsChange(); // Notify parent if needed
  };

  const themes = [
    {
      id: "default",
      name: "سیاه و سفید (پیش‌فرض)",
      description: "تم کلاسیک با رنگ‌های سیاه و سفید",
      icon: <Sun className="h-5 w-5" />,
      preview: "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700", // Added dark mode preview
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
  ];

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
                onClick={() => handleThemeChange(themeOption.id)} // Allow clicking the whole div
              >
                <RadioGroupItem
                  value={themeOption.id}
                  id={themeOption.id}
                  className="sr-only" // Visually hidden, but accessible
                  aria-label={themeOption.name}
                />
                 {/* Theme Preview */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${themeOption.preview} transition-all duration-300`}
                  aria-hidden="true" // Decorative
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
                    className="absolute left-4 rtl:right-4 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
