// app/layout.tsx
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider"; // This is our updated provider
import { Toaster } from "sonner"; // From existing
import { TooltipProvider } from "@/components/ui/tooltip"; // Guide adds this
import AppInitializer from "@/components/auth/app-initializer";
import GuestSessionManager from "@/components/auth/guest-session-manager";
import { GuestMergeHandler } from '@/components/auth/guest-merge-handler'; // From existing

export const metadata = {
  title: "Aura", // Guide's title (temporary)
  description: "Aura is a simple and beautiful task management app.", // Guide's description (temporary)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning> {/* Existing lang/dir and suppressHydrationWarning */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased"> {/* Existing body classes */}
        <AppInitializer />
        <GuestSessionManager />
        <GuestMergeHandler /> {/* Added from existing */}
        <TooltipProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" /> {/* Toaster from existing */}
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
