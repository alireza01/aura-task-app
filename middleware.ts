import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware' // Changed from updateSession

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Refresh session if expired - this is the key part.
  // supabase.auth.getUser() is preferred by Supabase docs for middleware session refresh.
  await supabase.auth.getUser()

  // Any other middleware logic that needs to run on every request
  // (e.g., redirecting based on path, internationalization, etc.)
  // can go here. For this specific task, we are only concerned
  // with auth session refreshing and removing old guest logic.

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
