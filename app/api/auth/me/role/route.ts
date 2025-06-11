// API route to fetch the current user's role
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/logger';

export async function GET() {
  const supabase = createClient();
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
        serverLogger.info("User profile not found, defaulting to 'user' role", { userId: user.id });
        return NextResponse.json({ role: 'user' });
    }
    serverLogger.error('Error fetching user profile', { userId: user.id }, error);
    return NextResponse.json({ error: 'Internal server error fetching role' }, { status: 500 });
  }

  if (!profile) {
    // Should ideally be handled by the error block above with PGRST116
    return NextResponse.json({ role: 'user' });
  }

  return NextResponse.json({ role: profile.role });
}
