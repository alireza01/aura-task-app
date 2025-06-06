"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"

/**
 * Custom React hook to check and manage the status of a user's Gemini API key.
 * It fetches the API key status from Supabase user settings and provides
 * functions to refresh this status.
 *
 * @param {User | null} user - The Supabase user object, or null if no user is authenticated.
 * @returns {{ hasApiKey: boolean | null, isLoading: boolean, refreshApiKeyStatus: () => void }}
 *   An object containing:
 *   - `hasApiKey`: A boolean indicating if the user has an API key, or null if still loading.
 *   - `isLoading`: A boolean indicating if the API key status is currently being checked.
 *   - `refreshApiKeyStatus`: A function to manually re-check the API key status.
 */
export function useApiKeyStatus(user: User | null) {
  // State to store whether the user has an API key. Null initially, then true/false.
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  // State to manage the loading status of the API key check.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // If no user is logged in, set hasApiKey to false and stop loading.
    if (!user) {
      setHasApiKey(false)
      setIsLoading(false)
      return
    }

    // If a user is present, initiate the API key status check.
    checkApiKeyStatus()
  }, [user]) // Re-run this effect whenever the 'user' object changes.

  /**
   * Asynchronously checks the user's Gemini API key status from the Supabase database.
   * It queries the 'user_settings' table for the 'gemini_api_key' associated with the user's ID.
   */
  const checkApiKeyStatus = async () => {
    // If no user is present, exit the function.
    if (!user) return

    try {
      setIsLoading(true) // Set loading to true before fetching data.

      // Fetch the 'gemini_api_key' from the 'user_settings' table for the current user.
      const { data: settings } = await supabase
        .from("user_settings")
        .select("gemini_api_key")
        .eq("user_id", user.id)
        .single() // Expecting a single row for user settings.

      // Determine if an API key exists based on the fetched data.
      const hasKey = !!settings?.gemini_api_key
      setHasApiKey(hasKey) // Update the state with the API key presence.
    } catch (error) {
      // Log any errors that occur during the API key status check.
      console.error("Error checking API key status:", error)
      setHasApiKey(false) // Assume no key on error to prevent false positives.
    } finally {
      setIsLoading(false) // Always set loading to false after the operation completes.
    }
  }

  /**
   * Provides a way to manually refresh the API key status.
   * This can be called after a user potentially adds or removes an API key.
   */
  const refreshApiKeyStatus = () => {
    checkApiKeyStatus()
  }

  return {
    hasApiKey,
    isLoading,
    refreshApiKeyStatus,
  }
}
