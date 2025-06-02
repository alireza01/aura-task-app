"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserSettings } from "@/types"
import { Settings, Key, Palette, LogOut, RotateCcw } from "lucide-react"

interface SettingsModalProps {
  user: User
  settings: UserSettings | null
  onClose: () => void
  onSettingsChange: () => void
}

export default function SettingsModal({ user, settings, onClose, onSettingsChange }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [speedWeight, setSpeedWeight] = useState([settings?.speed_weight || 50])
  const [importanceWeight, setImportanceWeight] = useState([settings?.importance_weight || 50])
  const [theme, setTheme] = useState(settings?.theme || "default")
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (settings) {
      setApiKey(settings.gemini_api_key ? "••••••••••••••••" : "")
      setSpeedWeight([settings.speed_weight || 50])
      setImportanceWeight([settings.importance_weight || 50])
      setTheme(settings.theme || "default")
    }
  }, [settings])

  const handleSaveSettings = async () => {
    setLoading(true)

    try {
      const updates: any = {
        user_id: user.id,
        speed_weight: speedWeight[0],
        importance_weight: importanceWeight[0],
        theme,
        updated_at: new Date().toISOString(),
      }

      // Only update API key if it's been changed
      if (apiKey && !apiKey.includes("•")) {
        updates.gemini_api_key = apiKey
      }

      await supabase.from("user_settings").upsert(updates)

      onSettingsChange()
      onClose()
    } catch (error) {
      console.error("خطا در ذخیره تنظیمات:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetWeights = () => {
    setSpeedWeight([50])
    setImportanceWeight([50])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 space-x-reverse">
            <Settings className="w-5 h-5" />
            <span>تنظیمات</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai">هوش مصنوعی</TabsTrigger>
            <TabsTrigger value="appearance">ظاهر</TabsTrigger>
            <TabsTrigger value="account">حساب کاربری</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <Key className="w-4 h-4" />
                  <span>کلید API</span>
                </CardTitle>
                <CardDescription>کلید Gemini API برای استفاده از قابلیت‌های هوش مصنوعی</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="api-key">کلید API Gemini</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="text-left"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>وزن‌دهی رتبه‌بندی</CardTitle>
                <CardDescription>تأثیر سرعت و اهمیت در رتبه‌بندی خودکار وظایف را تنظیم کنید</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>وزن سرعت</Label>
                    <span className="text-sm text-gray-500">{speedWeight[0]}%</span>
                  </div>
                  <Slider
                    value={speedWeight}
                    onValueChange={setSpeedWeight}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>وزن اهمیت</Label>
                    <span className="text-sm text-gray-500">{importanceWeight[0]}%</span>
                  </div>
                  <Slider
                    value={importanceWeight}
                    onValueChange={setImportanceWeight}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>

                <Button variant="outline" size="sm" onClick={handleResetWeights} className="w-full">
                  <RotateCcw className="w-4 h-4 ml-2" />
                  بازگشت به حالت پیش‌فرض
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 space-x-reverse">
                  <Palette className="w-4 h-4" />
                  <span>تم ظاهری</span>
                </CardTitle>
                <CardDescription>ظاهر اپلیکیشن را مطابق سلیقه خود تنظیم کنید</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label>انتخاب تم</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">سیاه و سفید (پیش‌فرض)</SelectItem>
                      <SelectItem value="alireza">علیرضا (مینیمال)</SelectItem>
                      <SelectItem value="neda">ندا (دخترانه)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {theme === "default" && "تم کلاسیک با رنگ‌های سیاه و سفید"}
                    {theme === "alireza" && "طراحی مینیمال و مدرن"}
                    {theme === "neda" && "طراحی شاد و رنگارنگ با انیمیشن‌های جذاب"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات حساب</CardTitle>
                <CardDescription>مدیریت حساب کاربری شما</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">{user.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-gray-500">
                      عضو از {new Date(user.created_at).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>

                <Button variant="destructive" onClick={handleSignOut} className="w-full">
                  <LogOut className="w-4 h-4 ml-2" />
                  خروج از حساب
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex space-x-3 space-x-reverse pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            انصراف
          </Button>
          <Button onClick={handleSaveSettings} disabled={loading} className="flex-1">
            {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
