"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface ApiKeySetupModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onApiKeySet: () => void
}

const TOTAL_STEPS = 4

export default function ApiKeySetupModal({ user, isOpen, onClose, onApiKeySet }: ApiKeySetupModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setApiKeyInput("")
      setError("")
      setSuccess(false)
      setIsLoading(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleSkip()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
      setError("")
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError("")
    }
  }

  const handleSkip = () => {
    // Set a flag in user preferences to not show this modal automatically
    localStorage.setItem("aura-task-api-key-setup-skipped", "true")
    onClose()
  }

  const validateApiKey = (key: string): boolean => {
    // Basic validation for Gemini API key format
    return key.length > 20 && key.startsWith("AIza")
  }

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setError("لطفاً کلید API خود را وارد کنید")
      return
    }

    if (!validateApiKey(apiKeyInput.trim())) {
      setError("فرمت کلید API صحیح نیست. کلید باید با 'AIza' شروع شود و حداقل ۲۰ کاراکتر داشته باشد")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Save API key to user settings
      const { error: updateError } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        gemini_api_key: apiKeyInput.trim(),
        updated_at: new Date().toISOString(),
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      toast({
        title: "موفقیت!",
        description: "کلید API با موفقیت ذخیره شد! ویژگی‌های هوش مصنوعی اکنون فعال هستند.",
      })

      // Close modal after a short delay
      setTimeout(() => {
        onApiKeySet()
        onClose()
      }, 2000)
    } catch (error) {
      console.error("Error saving API key:", error)
      setError("خطا در ذخیره کلید. لطفاً دوباره تلاش کنید یا از صحیح بودن کلید اطمینان حاصل کنید")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStep === TOTAL_STEPS && !isLoading) {
      handleSaveApiKey()
    }
  }

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto glass-card border-0">
            <DialogHeader className="flex flex-row-reverse items-center justify-between">
              <DialogTitle className="text-xl font-semibold">
                تنظیم کلید API Gemini برای فعال‌سازی هوش مصنوعی
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-8 w-8 rounded-full"
                aria-label="بستن راهنما"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            {/* Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">
                مرحله {currentStep} از {TOTAL_STEPS}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i + 1 <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="relative min-h-[400px] mt-6">
              <AnimatePresence mode="wait" custom={currentStep}>
                <motion.div
                  key={currentStep}
                  custom={currentStep}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="absolute inset-0"
                >
                  {currentStep === 1 && <StepOne />}
                  {currentStep === 2 && <StepTwo />}
                  {currentStep === 3 && <StepThree />}
                  {currentStep === 4 && (
                    <StepFour
                      apiKeyInput={apiKeyInput}
                      setApiKeyInput={setApiKeyInput}
                      showApiKey={showApiKey}
                      setShowApiKey={setShowApiKey}
                      error={error}
                      success={success}
                      isLoading={isLoading}
                      onKeyPress={handleKeyPress}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkip} className="text-sm">
                  فعلاً رد شو
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  قبلی
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button onClick={handleNext} className="flex items-center gap-2">
                    بعدی
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={isLoading || success}
                    className="flex items-center gap-2 min-w-[200px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        ذخیره شد!
                      </>
                    ) : (
                      <>
                        ذخیره و فعال‌سازی هوش مصنوعی
                        <CheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}

// Step Components
function StepOne() {
  return (
    <div className="space-y-6 text-right">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">به AuraTask خوش آمدید!</h2>
        <p className="text-lg text-muted-foreground">کلید API Gemini شما لازم است</p>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <p className="text-base leading-relaxed">
          برای استفاده از ویژگی‌های هوشمند مانند <strong>رتبه‌بندی خودکار وظایف</strong> و
          <strong> پیشنهاد وظایف فرعی</strong>، AuraTask از مدل هوش مصنوعی Gemini گوگل استفاده می‌کند.
        </p>

        <p className="text-base leading-relaxed">
          برای این کار، شما باید کلید API شخصی خودتان را از Google AI Studio تهیه و در اینجا وارد کنید. این کلید{" "}
          <strong>رایگان است</strong> (در محدوده استفاده رایگان گوگل).
        </p>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ما کلید شما را به صورت امن در حساب کاربری AuraTask شما ذخیره می‌کنیم تا در دستگاه‌های مختلف به آن دسترسی
              داشته باشید.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepTwo() {
  const handleOpenAIStudio = () => {
    window.open("https://aistudio.google.com/", "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-6 text-right">
      <h2 className="text-xl font-bold text-center">دریافت کلید از Google AI Studio</h2>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
            ۱
          </div>
          <div>
            <p className="text-base mb-3">
              روی دکمه زیر کلیک کنید تا به Google AI Studio بروید. (این صفحه در یک تب جدید باز می‌شود)
            </p>
            <Button onClick={handleOpenAIStudio} className="flex items-center gap-2" size="lg">
              رفتن به Google AI Studio
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
            ۲
          </div>
          <p className="text-base">اگر حساب گوگل ندارید یا وارد نشده‌اید، ابتدا وارد شوید.</p>
        </div>
      </div>

      {/* Visual Aid Placeholder */}
      <div className="bg-muted rounded-lg p-8 text-center">
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-white dark:bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <ExternalLink className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-muted-foreground">تصویر صفحه اصلی Google AI Studio</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">پس از ورود، صفحه‌ای مشابه تصویر بالا خواهید دید</p>
      </div>
    </div>
  )
}

function StepThree() {
  return (
    <div className="space-y-6 text-right">
      <h2 className="text-xl font-bold text-center">کلید API خود را ایجاد یا پیدا کنید</h2>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
            ۱
          </div>
          <p className="text-base">
            در Google AI Studio، به دنبال گزینه‌ای مانند <strong>'Get API key'</strong> یا
            <strong> 'Create API key'</strong> بگردید. معمولاً در منوی سمت چپ یا بخش
            <strong> 'API Keys'</strong> قرار دارد.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
            ۲
          </div>
          <p className="text-base">
            اگر قبلاً کلید ایجاد نکرده‌اید، روی دکمه
            <strong> 'Create API key in new project'</strong> (یا مشابه) کلیک کنید.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
            ۳
          </div>
          <p className="text-base">
            کلید API شما نمایش داده می‌شود. این یک رشته طولانی از حروف و اعداد است. آن را کپی کنید.
          </p>
        </div>
      </div>

      {/* Visual Aid Placeholders */}
      <div className="space-y-4">
        <div className="bg-muted rounded-lg p-6">
          <div className="w-full h-32 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg flex items-center justify-center mb-2">
            <div className="text-center">
              <div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-lg">🔑</span>
              </div>
              <p className="text-xs text-muted-foreground">منوی API Keys در AI Studio</p>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground">مسیر دسترسی به بخش API Keys</p>
        </div>

        <div className="bg-muted rounded-lg p-6">
          <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center mb-2">
            <div className="text-center">
              <div className="w-12 h-12 bg-white dark:bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <p className="text-xs text-muted-foreground">کپی کردن کلید API</p>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground">کلید API و دکمه کپی</p>
        </div>
      </div>
    </div>
  )
}

interface StepFourProps {
  apiKeyInput: string
  setApiKeyInput: (value: string) => void
  showApiKey: boolean
  setShowApiKey: (show: boolean) => void
  error: string
  success: boolean
  isLoading: boolean
  onKeyPress: (e: React.KeyboardEvent) => void
}

function StepFour({
  apiKeyInput,
  setApiKeyInput,
  showApiKey,
  setShowApiKey,
  error,
  success,
  isLoading,
  onKeyPress,
}: StepFourProps) {
  return (
    <div className="space-y-6 text-right">
      <h2 className="text-xl font-bold text-center">کلید API خود را وارد کنید</h2>

      <p className="text-base text-center text-muted-foreground">
        کلید API کپی شده از Google AI Studio را در کادر زیر جای‌گذاری کنید
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key-input" className="text-base font-medium">
            کلید API Gemini
          </Label>
          <div className="relative">
            <Input
              id="api-key-input"
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="کلید API خود را اینجا وارد کنید"
              className="pr-12 text-left"
              disabled={isLoading || success}
              dir="ltr"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={isLoading || success}
              aria-label={showApiKey ? "مخفی کردن کلید" : "نمایش کلید"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Feedback Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  کلید API با موفقیت ذخیره شد! ویژگی‌های هوش مصنوعی اکنون فعال هستند.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Text */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>نکته:</strong> کلید API معمولاً با "AIza" شروع می‌شود و حدود ۳۹ کاراکتر دارد.
          </p>
        </div>
      </div>
    </div>
  )
}
