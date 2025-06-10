import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to check if user is admin
// This should ideally be a shared utility. For now, defined here.
async function isAdmin(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Auth error or no user:', userError);
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching user profile or profile not found:', profileError?.message);
    return false;
  }
  return profile.role === 'admin';
}

export async function GET(request: Request) {
  const supabase = createClient(cookies());

  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
  }

  try {
    // Total Registered Users
    const { count: totalRegisteredUsers, error: regUsersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_guest', false);
    if (regUsersError) throw regUsersError;

    // Total Guest Accounts
    const { count: totalGuestAccounts, error: guestUsersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_guest', true);
    if (guestUsersError) throw guestUsersError;

    // New Sign-ups (24h) - non-guest users
    // Note: Supabase client might not directly support NOW() - INTERVAL in .gte()
    // This might need an RPC or a more careful construction if direct filter fails.
    // For now, attempting direct filter. If it fails, an RPC would be the robust solution.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: newSignUps24h, error: newSignUpsError } = await supabase
      .from('users') // Querying auth.users table
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo)
      .not('email', 'like', '%@auratask.guest'); // Exclude guest emails
    if (newSignUpsError) throw newSignUpsError;


    // AI API Calls (24h) - Admin keys used
    const { count: aiApiCalls24h, error: aiCallsError } = await supabase
      .from('admin_api_keys')
      .select('*', { count: 'exact', head: true })
      .gte('last_used_at', twentyFourHoursAgo);
    if (aiCallsError) throw aiCallsError;

    const stats = {
      totalRegisteredUsers: totalRegisteredUsers ?? 0,
      totalGuestAccounts: totalGuestAccounts ?? 0,
      newSignUps24h: newSignUps24h ?? 0,
      aiApiCalls24h: aiApiCalls24h ?? 0,
    };

    return NextResponse.json(stats);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching admin statistics:', errorMessage);
    // Check if the error is a PostgrestError for more specific messages
    if (typeof error === 'object' && error !== null && 'message' in error) {
        console.error('Detailed error:', (error as any).message);
    }
    return NextResponse.json({ error: 'Failed to fetch admin statistics', details: errorMessage }, { status: 500 });
  }
}
