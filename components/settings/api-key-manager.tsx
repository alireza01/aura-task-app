"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
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
  const [hasApiKeyInitially, setHasApiKeyInitially] = useState(false);
  const { toast } = useToast()
  // const supabaseClient = createClient() // Supabase client direct usage removed

  useEffect(() => {
    const fetchApiKeyStatus = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await fetch("/api/user/api-key");
        if (response.ok) {
          const { hasApiKey } = await response.json();
          setHasApiKeyInitially(hasApiKey);
          if (hasApiKey) {
            setApiKey("••••••••••••••••••••••••••••••");
          } else {
            setApiKey("");
          }
        } else {
          // Handle error fetching status, maybe show a toast
          console.error("Failed to fetch API key status");
          setApiKey(""); // Assume no key if status check fails
          setHasApiKeyInitially(false);
        }
      } catch (error) {
        console.error("Error fetching API key status:", error);
        setApiKey("");
        setHasApiKeyInitially(false);
      } finally {
        setLoading(false);
      }
    };

    fetchApiKeyStatus();
  }, [user]); // Re-fetch if user changes

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

      // Save to database via API route
      const saveResponse = await fetch("/api/user/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || "Failed to save API key");
      }

      toast({
        title: "کلید API ذخیره شد",
        description: "کلید API شما با موفقیت ذخیره شد.",
      });

      setHasApiKeyInitially(true); // Reflect that a key is now set
      // Mask the API key after saving
      setApiKey("••••••••••••••••••••••••••••••")
      setShowApiKey(false)
      onSettingsChange()
    } catch (error: any) {
      console.error("خطا در ذخیره کلید API:", error)
      toast({
        title: "خطا در ذخیره کلید API",
        description: error.message || "مشکلی در ذخیره کلید API رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearApiKey = async () => {
    if (!hasApiKeyInitially && !apiKey.includes("•")) { // No key to clear from server if it wasn't there initially or just typed
        setApiKey("");
        toast({
            title: "کلید API پاک شد",
            description: "ورودی کلید API پاک شد.",
        });
        return;
    }


    if (!confirm("آیا مطمئن هستید که می‌خواهید کلید API را حذف کنید؟ این عمل غیرقابل بازگشت است.")) {
      return
    }

    setLoading(true)

    try {
      const deleteResponse = await fetch("/api/user/api-key", {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || "Failed to delete API key");
      }

      setApiKey("")
      setHasApiKeyInitially(false); // Reflect that key is now cleared
      setShowApiKey(false);
      toast({
        title: "کلید API حذف شد",
        description: "کلید API شما با موفقیت از سرور حذف شد.",
      })
      onSettingsChange()
    } catch (error: any) {
      console.error("خطا در حذف کلید API:", error)
      toast({
        title: "خطا در حذف کلید API",
        description: error.message || "مشکلی در حذف کلید API رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value) // Allow direct input
    setTestResult(null)
    // If user starts typing in a masked field, we assume they want to change it.
    // The actual value of apiKey will be what they type.
    // The hasApiKeyInitially state will tell us if there *was* a key on the server.
  }

  const handleClearInput = () => {
    setApiKey("")
    setTestResult(null)
    // If there was a key on the server, clearing the input locally doesn't remove it from server.
    // User must click "حذف کلید" for that. If no key was on server, this just clears local input.
    if (hasApiKeyInitially) {
        setApiKey("••••••••••••••••••••••••••••••"); // Re-mask if there's a key on server
    }
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
              placeholder={hasApiKeyInitially ? "کلید API تنظیم شده است (برای تغییر، کلید جدید وارد کنید)" : "کلید API خود را اینجا وارد کنید"}
              className="pl-10 text-left dir-ltr"
              disabled={loading && !testing} // Only disable fully if not in testing phase
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={loading || (!apiKey && !hasApiKeyInitially)}
              aria-label={showApiKey ? "پنهان کردن کلید API" : "نمایش کلید API"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {testResult === "success" && apiKey && !apiKey.includes("•") && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>کلید API معتبر است و با موفقیت تست شد.</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {testResult === "error" && apiKey && !apiKey.includes("•") && (
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
          {hasApiKeyInitially || apiKey.includes("•") ? ( // If a key is set on the server OR input is masked
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setApiKey(""); setShowApiKey(true); setTestResult(null); /* setHasApiKeyInitially(false); */ }} // Clear input to allow new entry
                className="flex-1"
                disabled={loading}
              >
                وارد کردن کلید جدید
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleClearApiKey}
                className="flex-1"
                disabled={loading || !hasApiKeyInitially} // Can only clear from server if it was there
              >
                حذف کلید از سرور
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearInput} // Simple clear for non-server key
                className="flex-1"
                disabled={loading || !apiKey}
              >
                پاک کردن ورودی
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
                        <AlertCircle className="h-4 w-4" /> {/* Using AlertCircle for loading, consider Loader2 */}
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
