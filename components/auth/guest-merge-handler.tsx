// In components/auth/guest-merge-handler.tsx

'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@supabase/auth-helpers-nextjs'
import { mergeGuestAccount } from '@/lib/auth/actions'

export function GuestMergeHandler() {
  const { user } = useUser() // Replace with your actual user state management
  const [isMergeAttempted, setIsMergeAttempted] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || isMergeAttempted || !user) return

    const guestIdToMerge = localStorage.getItem('GUEST_ID_TO_MERGE')

    // Check if there's a logged-in (non-guest) user AND a guest ID to merge
    if (guestIdToMerge && !user.is_anonymous) {
      setIsMergeAttempted(true)
      console.log(`Client: Found guest ID ${guestIdToMerge} to merge into ${user.id}.`)

      mergeGuestAccount(guestIdToMerge).then((result) => {
        if (result.success) {
          console.log('Client: Merge successful. Cleaning up.')
          localStorage.removeItem('GUEST_ID_TO_MERGE')
          // Refresh the page to ensure all data is correctly displayed
          window.location.reload()
        } else {
          console.error('Client: Merge failed.', result.error)
          // Optionally, show a toast notification to the user about the failure
          localStorage.removeItem('GUEST_ID_TO_MERGE')
        }
      })
    } else if (guestIdToMerge && user.is_anonymous && guestIdToMerge === user.id) {
        // Cleanup in case the user reloads the page before the redirect happens
        // and is still the same guest.
        localStorage.removeItem('GUEST_ID_TO_MERGE');
    }
  }, [user, isMergeAttempted, isMounted])

  return null // This component renders nothing.
}
