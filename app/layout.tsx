// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { GuestSessionManager } from '@/components/auth/guest-session-manager'
import { GuestMergeHandler } from '@/components/auth/guest-merge-handler'
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "آواتسک - مدیریت هوشمند وظایف",
  description: "مدیریت وظایف با قدرت هوش مصنوعی",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* GuestSessionManager and GuestMergeHandler might also benefit from being inside SupabaseProvider
            if they internally rely on useUser or other context-dependent hooks,
            though useUser is the one causing the immediate error.
            Let's place them inside for consistency.
        */}
        <ThemeProvider defaultTheme="default">
          <GuestSessionManager />
          <GuestMergeHandler />
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
