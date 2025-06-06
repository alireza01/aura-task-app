"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Key, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import type { UserSettings } from "@/types"

interface ApiKeyManagerProps {
  user: User
  settings: UserSettings | null
  onSettingsChange: () => void
}

export default function ApiKeyManager({ user, settings, onSettingsChange }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (settings?.gemini_api_key) {
      // Show masked API key if it exists
      setApiKey("••••••••••••••••••••••••••••••")
    } else {
      setApiKey("")
    }
  }, [settings])

  const handleSaveApiKey = async () => {
    if (!apiKey.trim() || apiKey.includes("•")) {
      toast({
        title: "خطا",
        description: "لطفاً کلید API معتبر وارد کنید",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setTestResult(null)

    try {
      // Test the API key first
      setTesting(true)
      const testResponse = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      if (!testResponse.ok) {
        setTestResult("error")
        toast({
          title: "کلید API نامعتبر",
          description: "کلید API وارد شده معتبر نیست یا با خطا مواجه شد.",
          variant: "destructive",
        })
        setTesting(false)
        setLoading(false)
        return
      }

      setTestResult("success")
      setTesting(false)

      // Save to database
      const { error: dbError } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        gemini_api_key: apiKey.trim(),
        updated_at: new Date().toISOString(),
      })

      if (dbError) throw dbError

      toast({
        title: "کلید API ذخیره شد",
        description: "کلید API شما با موفقیت ذخیره شد.",
      })

      // Mask the API key after saving
      setApiKey("••••••••••••••••••••••••••••••")
      setShowApiKey(false)
      onSettingsChange()
    } catch (error) {
      console.error("خطا در ذخیره کلید API:", error)
      toast({
        title: "خطا در ذخیره کلید API",
        description: "مشکلی در ذخیره کلید API رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearApiKey = async () => {
    if (!settings?.gemini_api_key) return

    if (!confirm("آیا مطمئن هستید که می‌خواهید کلید API را حذف کنید؟")) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          gemini_api_key: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      if (error) throw error

      setApiKey("")
      toast({
        title: "کلید API حذف شد",
        description: "کلید API شما با موفقیت حذف شد.",
      })
      onSettingsChange()
    } catch (error) {
      console.error("خطا در حذف کلید API:", error)
      toast({
        title: "خطا در حذف کلید API",
        description: "مشکلی در حذف کلید API رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow changing if the field doesn't contain bullets (masked)
    if (!e.target.value.includes("•")) {
      setApiKey(e.target.value)
      setTestResult(null)
    }
  }

  const handleClearInput = () => {
    setApiKey("")
    setTestResult(null)
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
              value={apiKey}
              onChange={handleInputChange}
              placeholder="کلید API خود را اینجا وارد یا به‌روز کنید"
              className="pl-10 text-left dir-ltr"
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={!apiKey || loading}
              aria-label={showApiKey ? "پنهان کردن کلید API" : "نمایش کلید API"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {testResult === "success" && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>کلید API معتبر است و با موفقیت تست شد.</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {testResult === "error" && (
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
          {apiKey && apiKey.includes("•") ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearInput}
                className="flex-1"
                disabled={loading || !apiKey}
              >
                وارد کردن کلید جدید
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleClearApiKey}
                className="flex-1"
                disabled={loading || !settings?.gemini_api_key}
              >
                حذف کلید
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearInput}
                className="flex-1"
                disabled={loading || !apiKey}
              >
                پاک کردن
              </Button>
              <Button
                type="button"
                onClick={handleSaveApiKey}
                className="flex-1"
                disabled={loading || !apiKey || apiKey.includes("•")}
              >
                {loading ? (
                  <>
                    {testing ? "در حال تست..." : "در حال ذخیره..."}
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
