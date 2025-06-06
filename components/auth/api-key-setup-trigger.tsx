"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
import ApiKeySetupModal from "./api-key-setup-modal"

interface ApiKeySetupTriggerProps {
  user: User
  onApiKeySet?: () => void
}

export default function ApiKeySetupTrigger({ user, onApiKeySet }: ApiKeySetupTriggerProps) {
  const [showModal, setShowModal] = useState(false)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  useEffect(() => {
    checkApiKeyStatus()
  }, [user])

  const checkApiKeyStatus = async () => {
    try {
      // Check if user has API key in settings
      const { data: settings } = await supabase
        .from("user_settings")
        .select("gemini_api_key")
        .eq("user_id", user.id)
        .single()

      const hasKey = !!settings?.gemini_api_key
      setHasApiKey(hasKey)

      // Check if user has skipped setup
      const hasSkipped = localStorage.getItem("aura-task-api-key-setup-skipped") === "true"

      // Show modal if no API key and hasn't skipped
      if (!hasKey && !hasSkipped) {
        // Small delay to ensure smooth UX after login
        setTimeout(() => {
          setShowModal(true)
        }, 1000)
      }
    } catch (error) {
      console.error("Error checking API key status:", error)
      setHasApiKey(false)
    }
  }

  const handleApiKeySet = () => {
    setHasApiKey(true)
    // Clear skip flag since user has now set up the key
    localStorage.removeItem("aura-task-api-key-setup-skipped")
    onApiKeySet?.()
  }

  const handleClose = () => {
    setShowModal(false)
  }

  // Don't render anything if we haven't checked the status yet
  if (hasApiKey === null) {
    return null
  }

  return <ApiKeySetupModal user={user} isOpen={showModal} onClose={handleClose} onApiKeySet={handleApiKeySet} />
}
