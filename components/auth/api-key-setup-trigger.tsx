"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import ApiKeySetupModal from "./api-key-setup-modal"

interface ApiKeySetupTriggerProps {
  user: User
  onApiKeySet?: () => void
}

export default function ApiKeySetupTrigger({ user, onApiKeySet }: ApiKeySetupTriggerProps) {
  const [showModal, setShowModal] = useState(false)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  // const supabaseClient = createClient() // Direct Supabase client usage removed

  useEffect(() => {
    const checkApiKeyStatus = async () => {
      if (!user) {
        setHasApiKey(false); // No user, no API key
        return;
      }
      try {
        // Check API key status via the API route
        const response = await fetch("/api/user/api-key"); // Ensure this is the correct endpoint for GET status
        let keyExists = false;
        if (response.ok) {
          const data = await response.json();
          keyExists = data.hasApiKey;
        } else {
          console.error("Failed to fetch API key status:", response.statusText);
          // Assume no key if status check fails, or handle error more gracefully
        }
        setHasApiKey(keyExists);

        // Check if user has skipped setup
        const hasSkipped = localStorage.getItem("aura-task-api-key-setup-skipped") === "true";

        // Show modal if no API key and hasn't skipped
        if (!keyExists && !hasSkipped) {
          // Small delay to ensure smooth UX after login
          setTimeout(() => {
            setShowModal(true);
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking API key status:", error);
        setHasApiKey(false); // Assume no key on error
      }
    };

    checkApiKeyStatus()
  }, [user])

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
