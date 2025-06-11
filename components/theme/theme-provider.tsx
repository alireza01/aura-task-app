// components/theme/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useAppStore } from '@/lib/store'; // NEW Zustand Store

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const theme = useAppStore((state) => state.theme); // Get theme from our Zustand store
  const { setTheme: setNextTheme } = useTheme(); // Get setTheme from next-themes

  // Effect to synchronize next-themes with our Zustand store
  React.useEffect(() => {
    // Only update if the theme in next-themes is different from our store's theme
    // This check might be overly simplistic if next-themes also has 'system' resolving differently.
    // However, the primary drive is from our store to next-themes.
    setNextTheme(theme);
  }, [theme, setNextTheme]);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
