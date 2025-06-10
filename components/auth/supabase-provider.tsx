// components/auth/supabase-provider.tsx
'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-nextjs';
import { createBrowserClient } from '@supabase/ssr';
import React, { useState } from 'react';

// These should be in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // It's important to create the client only once.
  // useState ensures this happens correctly in a Client Component.
  const [supabaseClient] = useState(() =>
    createBrowserClient(supabaseUrl, supabaseAnonKey)
  );

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}
