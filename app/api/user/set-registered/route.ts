import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { serverLogger } from '@/lib/logger';

export async function POST(request: Request) {
  const supabase = createClient(cookies());

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: User not authenticated.' }, { status: 401 });
  }

  // It's a good practice to ensure the user isn't ALREADY marked as non-guest,
  // though the main harm is just an unnecessary DB write.
  // const { data: profile, error: profileError } = await supabase
  //   .from('user_profiles')
  //   .select('is_guest')
  //   .eq('user_id', user.id)
  //   .single();

  // if (profileError && profileError.code !== 'PGRST116') { // PGRST116: No rows found (should not happen if trigger works)
  //   return NextResponse.json({ error: 'Failed to retrieve user profile.' , details: profileError.message }, { status: 500 });
  // }
  // if (profile && !profile.is_guest) {
  //   return NextResponse.json({ message: 'User already marked as registered.' });
  // }


  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ is_guest: false, updated_at: new Date().toISOString() }) // Explicitly set updated_at
    .eq('user_id', user.id);

  if (updateError) {
    serverLogger.error(`Failed to update is_guest for user ${user.id}`, { userId: user.id }, updateError);
    return NextResponse.json({ error: 'Failed to update user profile status.', details: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'User profile updated to registered.' });
}
