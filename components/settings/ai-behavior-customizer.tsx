"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { Sparkles, RotateCcw, Clock, Star } from "lucide-react"
import type { UserSettings } from "@/types"
import { useDebounce } from "@/hooks/use-debounce"

interface AiBehaviorCustomizerProps {
  user: User
  settings: UserSettings | null
  onSettingsChange: () => void
}

export default function AiBehaviorCustomizer({ user, settings, onSettingsChange }: AiBehaviorCustomizerProps) {
  const [speedWeight, setSpeedWeight] = useState([50])
  const [importanceWeight, setImportanceWeight] = useState([50])
  const [autoRanking, setAutoRanking] = useState(true)
  const [autoSubtasks, setAutoSubtasks] = useState(true)
  const [loading, setLoading] = useState(false)
  const debouncedSpeedWeight = useDebounce(speedWeight[0], 500)
  const debouncedImportanceWeight = useDebounce(importanceWeight[0], 500)
  const debouncedAutoRanking = useDebounce(autoRanking, 500)
  const debouncedAutoSubtasks = useDebounce(autoSubtasks, 500)
  const { toast } = useToast()

  useEffect(() => {
    if (settings) {
      setSpeedWeight([settings.speed_weight || 50])
      setImportanceWeight([settings.importance_weight || 50])
      setAutoRanking(settings.auto_ranking ?? true)
      setAutoSubtasks(settings.auto_subtasks ?? true)
    }
  }, [settings])

  // Save settings when debounced values change
  useEffect(() => {
    const saveSettings = async () => {
      if (!settings) return

      // Only save if values have changed
      if (
        debouncedSpeedWeight === settings.speed_weight &&
        debouncedImportanceWeight === settings.importance_weight &&
        debouncedAutoRanking === settings.auto_ranking &&
        debouncedAutoSubtasks === settings.auto_subtasks
      ) {
        return
      }

      setLoading(true)

      try {
        const { error } = await supabase.from("user_settings").upsert({
          user_id: user.id,
          speed_weight: debouncedSpeedWeight,
          importance_weight: debouncedImportanceWeight,
          auto_ranking: debouncedAutoRanking,
          auto_subtasks: debouncedAutoSubtasks,
          updated_at: new Date().toISOString(),
        })

        if (error) throw error

        onSettingsChange()
      } catch (error) {
        console.error("خطا در ذخیره تنظیمات:", error)
        toast({
          title: "خطا در ذخیره تنظیمات",
          description: "مشکلی در ذخیره تنظیمات رخ داد. لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    saveSettings()
  }, [
    debouncedSpeedWeight,
    debouncedImportanceWeight,
    debouncedAutoRanking,
    debouncedAutoSubtasks,
    settings,
    user.id,
    supabase,
    onSettingsChange,
    toast,
  ])

  const handleResetWeights = () => {
    setSpeedWeight([50])
    setImportanceWeight([50])
  }

  return (
    <Card className="glass-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          سفارشی‌سازی رفتار هوش مصنوعی
        </CardTitle>
        <CardDescription>
          وزن نسبی سرعت و اهمیت را برای رتبه‌بندی خودکار وظایف توسط هوش مصنوعی تنظیم کنید.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <Label htmlFor="auto-ranking">رتبه‌بندی خودکار</Label>
            </div>
            <Switch
              id="auto-ranking"
              checked={autoRanking}
              onCheckedChange={setAutoRanking}
              disabled={loading || !settings?.gemini_api_key}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              <Label htmlFor="auto-subtasks">تولید زیروظایف</Label>
            </div>
            <Switch
              id="auto-subtasks"
              checked={autoSubtasks}
              onCheckedChange={setAutoSubtasks}
              disabled={loading || !settings?.gemini_api_key}
            />
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-border">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <Label>وزن سرعت</Label>
              </div>
              <span className="text-sm font-medium">{speedWeight[0]}%</span>
            </div>
            <Slider
              value={speedWeight}
              onValueChange={setSpeedWeight}
              max={100}
              min={0}
              step={5}
              disabled={loading}
              aria-label="وزن سرعت"
            />
            <p className="text-xs text-muted-foreground">
              هر چه این مقدار بیشتر باشد، سرعت انجام وظیفه در رتبه‌بندی اهمیت بیشتری خواهد داشت.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <Label>وزن اهمیت</Label>
              </div>
              <span className="text-sm font-medium">{importanceWeight[0]}%</span>
            </div>
            <Slider
              value={importanceWeight}
              onValueChange={setImportanceWeight}
              max={100}
              min={0}
              step={5}
              disabled={loading}
              aria-label="وزن اهمیت"
            />
            <p className="text-xs text-muted-foreground">
              هر چه این مقدار بیشتر باشد، اهمیت وظیفه در رتبه‌بندی اهمیت بیشتری خواهد داشت.
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetWeights}
              disabled={loading || (speedWeight[0] === 50 && importanceWeight[0] === 50)}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              بازگشت به حالت پیش‌فرض
            </Button>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  )
}
