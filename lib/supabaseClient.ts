import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers' // For server component client
// We might need NextRequest and NextResponse for middleware, let's import them conditionally or ensure they are available where createSupabaseMiddlewareClient is called.
// For now, let's assume they will be passed as arguments.

// Function to create a Supabase client for use in Client Components
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Function to create a Supabase client for use in Server Components and Route Handlers
export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // This can happen if the cookie store is read-only, e.g., during Server Component rendering
            // You might want to log this error or handle it silently
            console.log(`Failed to set cookie ${name} in server client:`, error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Also handle read-only cases
             console.log(`Failed to remove cookie ${name} in server client:`, error)
          }
        },
      },
    }
  )
}

// Function to create a Supabase client for use in Middleware
// Note: `req` and `res` will need to be NextRequest and NextResponse, or compatible objects.
export function createSupabaseMiddlewareClient(
  req: { cookies: { get: (name: string) => { value: string } | undefined, getAll: () => Array<{name: string, value: string}> } },
  res?: { cookies: { set: (options: { name: string, value: string } & CookieOptions) => void } }
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          if (res) {
            res.cookies.set({ name, value, ...options })
          }
        },
        remove(name: string, options: CookieOptions) {
          if (res) {
            res.cookies.set({ name, value: '', ...options })
          }
        },
      },
    }
  )
}

// Optional: A global supabase instance for client-side convenience if needed,
// but prefer using createSupabaseBrowserClient() directly in client components.
// export const supabase = createSupabaseBrowserClient();