"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Key, ExternalLink, AlertCircle, X } from "lucide-react"

interface ApiKeySetupProps {
  onComplete: () => void
  onSkip: () => void
}

export default function ApiKeySetup({ onComplete, onSkip }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)
  const supabase = createClientComponentClient()

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError("لطفاً کلید API را وارد کنید")
      return
    }

    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("کاربر یافت نشد")

      // Test the API key first
      const testResponse = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      if (!testResponse.ok) {
        throw new Error("کلید API نامعتبر است")
      }

      // Save to database
      const { error: dbError } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        gemini_api_key: apiKey.trim(),
        updated_at: new Date().toISOString(),
      })

      if (dbError) throw dbError

      onComplete()
    } catch (error: any) {
      setError(error.message || "خطا در ذخیره کلید API")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onSkip}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2 space-x-reverse">
              <Key className="w-5 h-5" />
              <span>تنظیم هوش مصنوعی</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm leading-relaxed">
              برای استفاده از قابلیت‌های هوش مصنوعی مانند رتبه‌بندی خودکار و تولید زیروظایف، نیاز به کلید API رایگان
              Gemini دارید.
            </AlertDescription>
          </Alert>

          {step === 1 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">مراحل دریافت کلید API</CardTitle>
                  <CardDescription>این کلید کاملاً رایگان است و تنها چند دقیقه زمان می‌برد</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 pr-4">
                    <li>به سایت Google AI Studio مراجعه کنید</li>
                    <li>با حساب Google خود وارد شوید</li>
                    <li>روی "Get API Key" کلیک کنید</li>
                    <li>یک پروژه جدید ایجاد کنید یا پروژه موجود را انتخاب کنید</li>
                    <li>کلید API را کپی کنید</li>
                  </ol>
                </CardContent>
              </Card>

              <div className="flex space-x-3 space-x-reverse">
                <Button
                  onClick={() => window.open("https://aistudio.google.com/app/apikey", "_blank")}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 ml-2" />
                  باز کردن Google AI Studio
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  مرحله بعد
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">کلید API Gemini</label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="text-left"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500">کلید API شما به صورت امن ذخیره می‌شود</p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3 space-x-reverse">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  مرحله قبل
                </Button>
                <Button onClick={handleSaveApiKey} disabled={loading || !apiKey.trim()} className="flex-1">
                  {loading ? "در حال ذخیره..." : "ذخیره و ادامه"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Badge variant="secondary" className="text-xs">
                رایگان
              </Badge>
              <span className="text-xs text-gray-500">استفاده از Gemini API تا حد مشخصی رایگان است</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-gray-500">
              رد کردن
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
