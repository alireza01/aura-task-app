'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mergeGuestAccount } from '@/lib/auth/actions'
import type { User } from '@supabase/supabase-js'

export function GuestMergeHandler() {
  const [user, setUser] = useState<User | null>(null);
  const [isMergeAttempted, setIsMergeAttempted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Fetch the initial user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Reset merge attempt status if user changes (e.g., signs out)
      if (_event === "SIGNED_OUT") {
        setIsMergeAttempted(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);


  useEffect(() => {
    if (isMergeAttempted || !user) return

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
  }, [user, isMergeAttempted])

  return null // This component renders nothing.
}
