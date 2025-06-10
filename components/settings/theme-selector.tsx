// components/settings/theme-selector.tsx
"use client";

import * as React from "react";
import { Moon, Sun, Save } from "lucide-react";
import { useThemeStore } from "@/lib/hooks/use-theme-store";
import { useTheme as useNextTheme } from "next-themes"; // Import useNextTheme

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/hooks/use-app-store"; // To check if user is guest

export function ThemeSelector() {
  const {
    theme: currentThemeInStore,
    setTheme: zustandSetTheme,
    saveTheme,
    isSavingTheme
  } = useThemeStore();

  const { setTheme: nextThemesSetTheme, resolvedTheme } = useNextTheme();
  const { user } = useAppStore();
  const isGuest = user?.is_anonymous;

  const handleThemeSelect = (newTheme: string) => {
    zustandSetTheme(newTheme); // Update Zustand state
    nextThemesSetTheme(newTheme); // Update next-themes provider
  };

  // Determine the effective theme to display (light/dark) based on 'system' if needed
  const displayTheme = currentThemeInStore === 'system' ? resolvedTheme : currentThemeInStore;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            {displayTheme === 'dark' ? (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleThemeSelect("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeSelect("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleThemeSelect("system")}>
            System
          </DropdownMenuItem>
          {!isGuest && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => saveTheme(currentThemeInStore)}
                disabled={isSavingTheme}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {isSavingTheme ? "Saving..." : "Save Preference"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Optional: Display current theme or save status more explicitly here if needed */}
    </div>
  );
}
