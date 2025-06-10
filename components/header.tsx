"use client"

import Link from "next/link"
import type { User as SupabaseUser } from "@supabase/supabase-js" // Renamed to avoid conflict
import { MainNav } from "@/components/main-nav" // Assuming MainNav exists and is structured for this
import { UserNav } from "@/components/user-nav" // Assuming UserNav exists
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Settings, LogIn, PlusCircle } from "lucide-react"
import { useUIStore } from "@/stores/uiStore" // Import uiStore
import { usePathname } from "next/navigation" // To hide search on auth pages

interface HeaderProps {
  user: SupabaseUser | null
  // onSettingsChange and onSearch props are removed
}

export default function Header({ user }: HeaderProps) {
  const { setSearchQuery, openSettingsPanel, openAddTaskModal } = useUIStore.getState(); // Get actions directly
  const pathname = usePathname();

  const showSearch = !pathname.startsWith("/auth"); // Example: hide search on /auth/* routes

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        {/* Logo and MainNav can be here if MainNav is a separate component */}
        {/* <MainNav /> */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          {/* Replace with your actual logo component or SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>
          </svg>
          <span className="hidden font-bold sm:inline-block">AuraTask</span>
        </Link>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {showSearch && (
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="جستجو وظایف..."
                  className="w-full bg-background pl-10 md:w-64"
                  // value={searchQuery} // searchQuery from uiStore can be used if needed for direct binding
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          <nav className="flex items-center gap-2">
            {user && (
              <Button variant="ghost" size="sm" onClick={openAddTaskModal} className="hidden sm:flex">
                <PlusCircle className="h-4 w-4 mr-1" />
                افزودن وظیفه
              </Button>
            )}
            {user && (
              <Button variant="ghost" size="icon" onClick={openSettingsPanel} aria-label="تنظیمات">
                <Settings className="h-5 w-5" />
              </Button>
            )}
            {user ? (
              <UserNav user={user} /> // UserNav likely handles logout etc.
            ) : (
              <Button asChild variant="secondary" size="sm">
                <Link href="/auth/signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  ورود
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
