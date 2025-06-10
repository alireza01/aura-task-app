// app/api/user/theme/route.ts
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Replaced
import { createClient } from '@/lib/supabase/server'; // Use the server client
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const themeSchema = z.object({
  theme: z.string().min(1), // Assuming theme name cannot be empty
});

export async function POST(request: Request) {
  const body = await request.json();
  const validation = themeSchema.safeParse(body);

  if (!validation.success) {
    console.error("API Validation Error:", validation.error.format());
    return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
  }

  const { theme } = validation.data;
  // const supabase = createRouteHandlerClient({ cookies }); // Replaced
  const supabase = createClient(); // Uses cookies() internally

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
