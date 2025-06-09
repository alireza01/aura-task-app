import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from './lib/supabaseClient' // Adjusted path if your client is elsewhere

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Create a Supabase client for middleware
  // The createSupabaseMiddlewareClient function in lib/supabaseClient.ts
  // handles request and response objects for cookie operations.
  const supabase = createSupabaseMiddlewareClient(request, response)

  // Refresh session if expired - important for Server Components
  // and keeping user signed in. The getSession() call, when using
  // the ssr client configured for middleware, will automatically
  // handle cookie updates on the response.
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (auth related routes like login, callback, confirm, etc.)
     * Adjust this matcher according to your application's needs.
     * It's common to exclude asset paths and auth flow paths.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
}
