"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

import ApiKeyManager from "@/components/settings/api-key-manager"
import AiBehaviorCustomizer from "@/components/settings/ai-behavior-customizer"
import ThemeSelector from "@/components/settings/theme-selector"
import AccountActions from "@/components/settings/account-actions"
import type { UserSettings, GuestUser } from "@/types"

interface SettingsPanelProps {
  user: User | GuestUser | null
  settings: UserSettings | null
  isOpen: boolean
  onClose: () => void
  onSettingsChange: () => void
}

export default function SettingsPanel({ user, settings, isOpen, onClose, onSettingsChange }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("ai")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  // Reset state when panel opens
  useEffect(() => {
    if (isOpen) {
      setHasChanges(false)
    }
  }, [isOpen])

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (hasChanges) {
          // Ask for confirmation if there are unsaved changes
          const confirmed = window.confirm(
            "تغییرات ذخیره نشده دارید. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟",
          )
          if (confirmed) {
            onClose()
          }
        } else {
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, hasChanges, onClose])

  const handleSettingsChange = () => {
    setHasChanges(true)
    onSettingsChange()
  }

  const handleClose = () => {
    if (hasChanges) {
      // Ask for confirmation if there are unsaved changes
      const confirmed = window.confirm("تغییرات ذخیره نشده دارید. آیا مطمئن هستید که می‌خواهید بدون ذخیره خارج شوید؟")
      if (confirmed) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-0">
            <DialogHeader className="flex flex-row-reverse items-center justify-between">
              <DialogTitle className="text-xl font-semibold">تنظیمات</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 rounded-full"
                aria-label="بستن تنظیمات"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <Tabs defaultValue="ai" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ai">هوش مصنوعی</TabsTrigger>
                  <TabsTrigger value="appearance">ظاهر</TabsTrigger>
                  <TabsTrigger value="account">حساب کاربری</TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-6 py-4">
                  <ApiKeyManager user={user} settings={settings} onSettingsChange={handleSettingsChange} />
                  {user && !("isGuest" in user) && (
                    <AiBehaviorCustomizer user={user as User} settings={settings} onSettingsChange={handleSettingsChange} />
                  )}
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6 py-4">
                  <ThemeSelector user={user} settings={settings} onSettingsChange={handleSettingsChange} />
                </TabsContent>

                <TabsContent value="account" className="space-y-6 py-4">
                  {user && !("isGuest" in user) && (
                    <AccountActions user={user as User} />
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
