'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client' // Assuming this is your client-side Supabase client
import { createGuestUser } from '@/lib/auth/actions'

export function GuestSessionManager() {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (checked) return

    const checkAndCreateGuest = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No session found, creating guest user.')
        await createGuestUser()
      }
      setChecked(true)
    }

    checkAndCreateGuest()
  }, [checked])

  return null // This component does not render anything.
}
