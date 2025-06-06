"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FcGoogle } from "react-icons/fc"
import { Save, Clock, Sparkles } from "lucide-react"

interface SignInPromptModalProps {
  onClose: () => void
  onSignIn: () => void
}

export default function SignInPromptModal({ onClose, onSignIn }: SignInPromptModalProps) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      onSignIn()
    } catch (error) {
      console.error("خطا در ورود:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleContinueWithoutSignIn = () => {
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">ذخیره دائمی وظایف</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Save className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600 leading-relaxed">
              برای این که وظایف شما برای همیشه ذخیره بماند و از قابلیت‌های هوش مصنوعی استفاده کنید، لطفاً وارد حساب Google
              خود شوید.
            </p>
          </div>

          <div className="space-y-3">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Save className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">ذخیره دائمی</p>
                    <p className="text-sm text-green-700">وظایف شما در ابر ذخیره می‌شود</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">هوش مصنوعی</p>
                    <p className="text-sm text-blue-700">رتبه‌بندی و تجزیه خودکار وظایف</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-orange-900">دسترسی همه جا</p>
                    <p className="text-sm text-orange-700">از هر دستگاهی به وظایف دسترسی داشته باشید</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Button onClick={handleSignIn} disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
              <FcGoogle className="w-5 h-5 ml-2" />
              {loading ? "در حال ورود..." : "ورود با Google"}
            </Button>

            <Button onClick={handleContinueWithoutSignIn} variant="outline" className="w-full">
              ادامه بدون ورود (موقت)
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            اگر بدون ورود ادامه دهید، وظایف شما فقط روی این دستگاه ذخیره می‌شود و ممکن است از دست برود.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
