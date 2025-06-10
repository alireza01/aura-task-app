'use client'

import { createClient } from '@/lib/supabase/client'
import type { User, UserProfile } from '@/types' // Ensure UserProfile is imported if not already
import { Chrome } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function AccountActions({ user, profile }: { user: User; profile: UserProfile }) {
  const handleSignIn = async () => {
    const supabase = createClient()
    if (user.is_anonymous) {
      console.log('Linking anonymous user with Google');
      await supabase.auth.linkUser({ // Updated to linkUser
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } else {
      // Proceed with the standard OAuth sign-in flow for non-anonymous users
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    }
  }

  // If the user is anonymous, show the sign-in/up card
  // Assuming user.is_anonymous is the source of truth now.
  // The profile prop might still be useful for other profile-specific info.
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
            You are signed in as {user.email}.
          </CardDescription>
        </CardHeader>
      </Card>
  );
}
