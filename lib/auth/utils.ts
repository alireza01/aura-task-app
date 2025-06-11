import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database.types';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { serverLogger } from '../logger';

/**
 * Checks if the current authenticated user has the 'admin' role.
 *
 * Important: This function is designed for server-side usage where it can securely
 * access user sessions and perform database queries.
 * If you need similar functionality client-side, ensure RLS protects the 'user_profiles' table
 * and consider a dedicated client-side hook or utility that calls a secure API route if necessary.
 *
 * @param supabaseInstance (Optional) An existing Supabase client instance. If not provided, a new server client will be created.
 * @returns Promise<boolean> - True if the user is an admin, false otherwise.
 */
export async function checkAdminRole(supabaseInstance?: SupabaseClient<Database>): Promise<boolean> {
  const supabase = supabaseInstance || createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // FIX: Check if userError is not null before logging
    if (userError) {
      serverLogger.error('checkAdminRole: Auth error or no user', {}, userError);
    }
    return false;
  }

  // Check if the user object itself has an admin role (e.g. from custom claims if you set them up)
  // This is a quick check but might not be your source of truth for roles.
  // if (user.role === 'admin') return true; // Example if Supabase Auth user.role is used directly

  // More robust: Check a 'user_profiles' table or similar for the role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    serverLogger.error('checkAdminRole: Error fetching user profile.', {}, profileError);
    return false;
  }

  if (!profile) {
    serverLogger.warn(`checkAdminRole: No profile found for user ${user.id}.`);
    return false;
  }

  return profile.role === 'admin';
}

/**
 * Retrieves the current authenticated user.
 *
 * Important: This function is designed for server-side usage.
 *
 * @param supabaseInstance (Optional) An existing Supabase client instance.
 * @returns Promise<User | null> - The user object or null if not authenticated or error.
 */
export async function getCurrentUser(supabaseInstance?: SupabaseClient<Database>): Promise<User | null> {
  const supabase = supabaseInstance || createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("getCurrentUser: Error fetching user.", error.message);
    return null;
  }
  return user;
}
