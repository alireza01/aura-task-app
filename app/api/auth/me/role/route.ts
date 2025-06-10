// API route to fetch the current user's role
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // If profile doesn't exist yet (e.g., new user, trigger hasn't run or failed)
    // We can assume 'user' role for now, or handle more gracefully depending on requirements.
    // For this case, let's assume 'user' if profile is not found.
    if (error.code === 'PGRST116') { // PGRST116: "Query returned no rows"
        return NextResponse.json({ role: 'user' });
    }
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error fetching role' }, { status: 500 });
  }

  if (!profile) {
    // Should ideally be handled by the error block above with PGRST116
    return NextResponse.json({ role: 'user' });
  }

  return NextResponse.json({ role: profile.role });
}
