'use client'

import { useEffect, useState } from 'react' // Ensure useState is imported
import { createClient } from '@/lib/supabase/client'
import { createGuestUser } from '@/lib/auth/actions'

export function GuestSessionManager() {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (checked) return

    const checkAndCreateGuest = async () => {
      // Check if guest session has already been handled in this browser
      const guestSessionHandled = localStorage.getItem('guestSessionHandled');
      if (guestSessionHandled === 'true') {
        console.log('Guest session already handled in this browser.');
        setChecked(true); // Mark as checked to prevent re-running
        return;
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No session found, creating guest user.')
        const result = await createGuestUser();
        if (result.success) {
          console.log('Guest user created successfully, marking as handled.');
          localStorage.setItem('guestSessionHandled', 'true');
        } else {
          console.error('Failed to create guest user:', result.error);
          // Optionally, clear the flag or handle error differently if creation fails
          // localStorage.removeItem('guestSessionHandled');
        }
      } else {
        // If a session exists, we can also mark guest handling as done for this visit
        // or if the existing session is a guest session, ensure the flag is set.
        // For simplicity, if any session exists, we assume guest handling is not needed
        // or has been superseded by a real login.
        localStorage.setItem('guestSessionHandled', 'true');
        console.log('Existing session found.');
      }
      setChecked(true)
    }

    checkAndCreateGuest()
  }, [checked])

  return null // This component does not render anything.
}
