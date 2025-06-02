"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"

export function useApiKeyStatus(user: User | null) {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!user) {
      setHasApiKey(false)
      setIsLoading(false)
      return
    }

    checkApiKeyStatus()
  }, [user])

  const checkApiKeyStatus = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const { data: settings } = await supabase
        .from("user_settings")
        .select("gemini_api_key")
        .eq("user_id", user.id)
        .single()

      const hasKey = !!settings?.gemini_api_key
      setHasApiKey(hasKey)
    } catch (error) {
      console.error("Error checking API key status:", error)
      setHasApiKey(false)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshApiKeyStatus = () => {
    checkApiKeyStatus()
  }

  return {
    hasApiKey,
    isLoading,
    refreshApiKeyStatus,
  }
}
