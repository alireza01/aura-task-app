// In components/settings/account-actions.tsx

'use client'

import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function AccountActions({ user }: { user: User & { is_guest?: boolean } }) {
  const handleSignIn = async () => {
    // 1. If the current user is a guest, store their ID for later.
    if (user.is_guest) {
      console.log('Storing guest ID for potential merge:', user.id)
      localStorage.setItem('GUEST_ID_TO_MERGE', user.id)
    }

    // 2. Proceed with the standard OAuth sign-in flow.
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  // If the user is a guest, show the sign-in/up card
  if (user.is_guest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save Your Progress</CardTitle>
          <CardDescription>
            You are using a guest account. Sign in with Google to save your data
            and access it on any device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignIn} className="w-full">
            <Chrome className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ... rest of your component for logged-in users
  return null
}
