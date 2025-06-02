"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FcGoogle } from "react-icons/fc"
import { Sparkles } from "lucide-react"

export default function AuthModal() {
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (error) {
      console.error("خطا در ورود:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">به AuraTask خوش آمدید</CardTitle>
          <CardDescription className="text-gray-600 text-base">مدیریت هوشمند وظایف با قدرت هوش مصنوعی</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>✨ رتبه‌بندی خودکار وظایف</p>
              <p>🎯 تجزیه هوشمند به زیروظایف</p>
              <p>📱 طراحی زیبا و ریسپانسیو</p>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 text-base font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            <FcGoogle className="w-5 h-5 ml-2" />
            {loading ? "در حال ورود..." : "ورود با Google"}
          </Button>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            با ورود، شما با قوانین استفاده و حریم خصوصی ما موافقت می‌کنید
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
