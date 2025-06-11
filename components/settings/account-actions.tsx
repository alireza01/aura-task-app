'use client'

import { supabase } from '@/lib/supabase/client'
import type { User, UserProfile } from '@/types'
import { Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function AccountActions({ user, profile }: { user: User; profile: UserProfile }) {
  const handleSignIn = async () => {
    // Use signInWithOAuth for both anonymous and non-anonymous users
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  // If the user is anonymous, show the sign-in/up card
  if (user.is_anonymous) {
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

  // This part is for signed-in (non-guest) users
  return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            You are signed in as {profile?.nickname || user.email}.
          </CardDescription>
        </CardHeader>
      </Card>
  );
}
