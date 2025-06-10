// components/settings/theme-selector.tsx
"use client";

// components/settings/theme-selector.tsx
"use client";

import * as React from "react";
import { Moon, Sun, Save } from "lucide-react";
import { useTheme as useNextTheme } from "next-themes";
import { useAppStore } from "@/lib/store"; // Import the new Zustand store

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ThemeSelector() {
  const currentThemeInStore = useAppStore(state => state.theme);
  const isSavingTheme = useAppStore(state => state.isSavingTheme);
  const zustandSetTheme = useAppStore(state => state.setTheme);
  const saveThemePreference = useAppStore(state => state.saveThemePreference);
  const userProfile = useAppStore(state => state.userProfile);

  const isGuest = userProfile?.is_guest;
  const { setTheme: nextThemesSetTheme, resolvedTheme } = useNextTheme();

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
                onClick={() => saveThemePreference(currentThemeInStore)}
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
    </div>
  );
}
