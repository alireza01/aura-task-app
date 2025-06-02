"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { FcGoogle } from "react-icons/fc"
import { Loader2 } from "lucide-react"

export default function SignInView() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (error) {
      console.error("خطا در ورود:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-24 h-24 md:w-32 md:h-32 relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-primary/20 rounded-full animate-pulse [animation-delay:0.2s]" />
            <div className="absolute inset-4 bg-primary/30 rounded-full animate-pulse [animation-delay:0.4s]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl md:text-5xl">✨</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-4 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">آواتسک</h1>
          <p className="text-muted-foreground">مدیریت هوشمند وظایف شما</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8 text-center"
        >
          <p className="text-lg">به آواتسک خوش آمدید. برای شروع، با حساب گوگل خود وارد شوید.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            size="lg"
            className="h-12 px-6 gap-2 text-base shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>در حال ورود...</span>
              </>
            ) : (
              <>
                <FcGoogle className="h-5 w-5" />
                <span>ورود با گوگل</span>
              </>
            )}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12 text-center text-sm text-muted-foreground"
        >
          <p>با ورود، شما شرایط استفاده از خدمات و سیاست حفظ حریم خصوصی ما را می‌پذیرید.</p>
        </motion.div>
      </div>
    </div>
  )
}
