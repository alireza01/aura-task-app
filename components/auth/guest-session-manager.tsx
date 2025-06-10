// components/auth/guest-session-manager.tsx
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client'; // Ensure this path is correct
import { useAppStore } from '@/lib/hooks/use-app-store'; // Ensure this path is correct (will be created in a later step)

export default function GuestSessionManager() {
  const { user, setUser } = useAppStore();
  const [isGuestSessionAttempted, setIsGuestSessionAttempted] = useState(false);

  useEffect(() => {
    const manageGuestSession = async () => {
      if (user || isGuestSessionAttempted) {
        return;
      }

      setIsGuestSessionAttempted(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("No active session, creating guest session...");
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            throw error;
          }
          if (data.user) {
            // The onAuthStateChange listener in AppInitializer will handle setting the user
            console.log("Guest session created:", data.user.id);
          }
        } catch (error) {
          console.error("Error creating guest session:", error);
          // Reset the attempt flag if it fails, to allow for a retry if necessary
          setIsGuestSessionAttempted(false);
        }
      } else {
         // If a session exists, AppInitializer's onAuthStateChange should handle it.
         // However, if setUser is available and user is not set, this is a fallback.
         // The guide includes this, so we will too.
         setUser(session.user);
      }
    };

    manageGuestSession();
  }, [user, setUser, isGuestSessionAttempted]);

  return null; // This component does not render anything
}
