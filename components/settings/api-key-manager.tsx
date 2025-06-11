"use client"

import type React from "react"
import { useState, useEffect } from "react"
// Removed createClient, User, UserSettings imports as they are handled by store
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Key, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import { useAppStore } from "@/lib/store" // Import the new Zustand store

interface ApiKeyManagerProps {
  // user: User // Comes from store
  // settings: UserSettings | null // Comes from store
  // onSettingsChange: () => void // Will call store action if needed
}

export default function ApiKeyManager({}: ApiKeyManagerProps) {
  const [localApiKeyInput, setLocalApiKeyInput] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  // const [loading, setLoading] = useState(false) // from store: isLoadingApiKey
  // const [testing, setTesting] = useState(false) // from store: isTestingApiKey
  // const [testResult, setTestResult] = useState<"success" | "error" | null>(null) // from store: isApiKeyValid

  const { toast } = useToast()

  // Settings state from store
  const storeApiKey = useAppStore(state => state.apiKey) // Masked or null
  const isApiKeyValid = useAppStore(state => state.isApiKeyValid)
  const isLoading = useAppStore(state => state.isLoadingApiKey)
  const isTesting = useAppStore(state => state.isTestingApiKey)
  // const userId = useAppStore(state => state.user?.id) // Not directly needed if actions handle user context

  // Actions from store
  const storeSaveApiKey = useAppStore(state => state.saveApiKey)
  const storeClearApiKey = useAppStore(state => state.clearApiKey)
  // const storeTestApiKey = useAppStore(state => state.testApiKey) // saveApiKey calls test internally

  useEffect(() => {
    if (storeApiKey) {
      setLocalApiKeyInput(storeApiKey) // storeApiKey is already masked or null
    } else {
      setLocalApiKeyInput("")
    }
  }, [storeApiKey])

  const handleSaveApiKey = async () => {
    if (!localApiKeyInput.trim() || localApiKeyInput.includes("•")) {
      toast({
        title: "خطا",
        description: "لطفاً کلید API معتبر وارد کنید",
        variant: "destructive",
      })
      return
    }

    const success = await storeSaveApiKey(localApiKeyInput.trim())
    if (success) {
      toast({
        title: "کلید API ذخیره شد",
        description: "کلید API شما با موفقیت ذخیره شد.",
      })
      // localApiKeyInput will be updated by useEffect watching storeApiKey
      setShowApiKey(false)
      // onSettingsChange might be replaced by direct store updates or specific refresh action if needed
      // e.g., useAppStore.getState().loadInitialSettings(userId)
    } else {
      // Error toast is handled by observing isApiKeyValid state below, or implicitly if save failed for other reasons
       toast({
         title: "خطا در ذخیره کلید API",
         description: "مشکلی در ذخیره کلید API رخ داد. لطفاً دوباره تلاش کنید.",
         variant: "destructive",
       })
    }
  }

  const handleClearApiKey = async () => {
    // Check if there's actually a key stored (even if masked)
    if (!storeApiKey) return

    if (!confirm("آیا مطمئن هستید که می‌خواهید کلید API را حذف کنید؟")) {
      return
    }

    const success = await storeClearApiKey()
    if (success) {
      toast({
        title: "کلید API حذف شد",
        description: "کلید API شما با موفقیت حذف شد.",
      })
      // localApiKeyInput will be updated by useEffect watching storeApiKey
    } else {
       toast({
         title: "خطا در حذف کلید API",
         description: "مشکلی در حذف کلید API رخ داد. لطفاً دوباره تلاش کنید.",
         variant: "destructive",
       })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalApiKeyInput(e.target.value)
    // Reset isApiKeyValid from store if user types. SettingsSlice's saveApiKey will set it.
    // This is tricky because isApiKeyValid is a store state.
    // A better approach: saveApiKey action in store should reset isApiKeyValid to null at start.
  }

  const handleClearInput = () => {
    setLocalApiKeyInput("")
    // Similarly, could reset isApiKeyValid to null here via an action if desired.
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5 text-primary" />
          کلید API Gemini شما
        </CardTitle>
        <CardDescription>برای استفاده از قابلیت‌های هوش مصنوعی، کلید API Gemini خود را وارد کنید.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">کلید API</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showApiKey ? "text" : "password"}
              value={localApiKeyInput}
              onChange={handleInputChange}
              placeholder="کلید API خود را اینجا وارد یا به‌روز کنید"
              className="pl-10 text-left dir-ltr"
              disabled={isLoading || isTesting}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={!localApiKeyInput || isLoading || isTesting}
              aria-label={showApiKey ? "پنهان کردن کلید API" : "نمایش کلید API"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isApiKeyValid === true && !isTesting && !isLoading && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>کلید API معتبر است.</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {isApiKeyValid === false && !isTesting && !isLoading && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>کلید API نامعتبر است یا با خطا مواجه شد.</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>
            نمی‌دانید کلید API چیست یا چگونه آن را دریافت کنید؟{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              راهنما را مشاهده کنید
              <ExternalLink className="h-3 w-3 mr-1" />
            </a>
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          {/* Show "Enter New Key" and "Delete Key" if a key is already stored (masked) */}
          {storeApiKey && localApiKeyInput.includes("•") ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearInput} // Clears local input to allow entering a new key
                className="flex-1"
                disabled={isLoading || isTesting}
              >
                وارد کردن کلید جدید
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleClearApiKey}
                className="flex-1"
                disabled={isLoading || isTesting || !storeApiKey} // Disable if no key in store
              >
                حذف کلید
              </Button>
            </>
          ) : (
            // Show "Clear" and "Save Key" if user is inputting a new key or field is empty
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearInput}
                className="flex-1"
                disabled={isLoading || isTesting || !localApiKeyInput}
              >
                پاک کردن
              </Button>
              <Button
                type="button"
                onClick={handleSaveApiKey}
                className="flex-1"
                disabled={isLoading || isTesting || !localApiKeyInput || localApiKeyInput.includes("•")}
              >
                {isLoading || isTesting ? (
                  <>
                    {isTesting ? "در حال تست..." : "در حال ذخیره..."}
                    <span className="mr-2 inline-block">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </motion.div>
                    </span>
                  </>
                ) : (
                  "ذخیره کلید"
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
