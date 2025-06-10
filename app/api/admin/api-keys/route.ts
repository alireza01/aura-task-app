import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types'; // Assuming this path is correct
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to check if user is admin
async function isAdmin(supabase: SupabaseClient<Database>) {
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
    // If profile doesn't exist, they can't be admin
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
    const { data, error } = await supabase
      .from('admin_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin API keys:', error);
      return NextResponse.json({ error: error.message || 'Failed to fetch API keys' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Unexpected error in GET /api/admin/api-keys:', e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient(cookies());

  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
  }

  try {
    const { api_key, name } = await request.json();

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ error: 'API key string is required.' }, { status: 400 });
    }
    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Name, if provided, must be a string.' }, { status: 400 });
    }

    // It's good practice to ensure the API key isn't excessively long.
    if (api_key.length > 1000) { // Adjust max length as needed
        return NextResponse.json({ error: 'API key string is too long.' }, { status: 400 });
    }
    if (name && name.length > 255) { // Adjust max length as needed
        return NextResponse.json({ error: 'Name is too long.' }, { status: 400 });
    }


    const { data, error } = await supabase
      .from('admin_api_keys')
      .insert([{ api_key, name: name || null }])
      .select()
      .single(); // Assuming you want to return the created key

    if (error) {
      console.error('Error creating admin API key:', error);
      if (error.code === '23505') { // Unique constraint violation for api_key
        return NextResponse.json({ error: 'This API key already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Failed to create API key' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error('Unexpected error in POST /api/admin/api-keys:', e);
    // Check if it's a JSON parsing error
    if (e instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
