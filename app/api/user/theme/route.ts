// app/api/user/theme/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { theme } = await request.json();
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase.auth.updateUser({
      data: { theme: theme }, // Ensure your Supabase user_metadata allows 'theme'
    });

    if (error) {
      console.error('Error updating theme:', error);
      return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Theme updated successfully' });
  }

  return NextResponse.json({ error: 'User not found' }, { status: 401 });
}
