import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types'; // Assuming this path is correct
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to check if user is admin (can be refactored into a shared util if not already)
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
    return false;
  }
  return profile.role === 'admin';
}

export async function PUT(
  request: Request,
  { params }: { params: { key_id: string } }
) {
  const supabase = createClient(cookies());
  const { key_id } = params;

  if (!key_id || typeof key_id !== 'string' || !key_id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
    return NextResponse.json({ error: 'Invalid key_id format.' }, { status: 400 });
  }

  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { is_active, name } = body;

    const updatePayload: { is_active?: boolean; name?: string | null } = {};

    if (typeof is_active === 'boolean') {
      updatePayload.is_active = is_active;
    } else if (is_active !== undefined) {
      return NextResponse.json({ error: 'is_active must be a boolean.' }, { status: 400 });
    }

    if (typeof name === 'string') {
      if (name.length > 255) {
        return NextResponse.json({ error: 'Name is too long.' }, { status: 400 });
      }
      updatePayload.name = name;
    } else if (name === null) {
        updatePayload.name = null;
    } else if (name !== undefined) {
      return NextResponse.json({ error: 'Name must be a string or null.' }, { status: 400 });
    }

    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ error: 'No updatable fields provided (is_active or name).' }, { status: 400 });
    }

    // Add updated_at manually as it's a good practice for PUT requests
    // unless the trigger is absolutely guaranteed for all updates from any source.
    // For this case, our schema has a trigger, so it might be redundant but explicit.
    // updatePayload.updated_at = new Date().toISOString();


    const { data, error } = await supabase
      .from('admin_api_keys')
      .update(updatePayload)
      .eq('id', key_id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating admin API key ${key_id}:`, error);
      if (error.code === 'PGRST116') { // "Query returned no rows" - key_id not found
        return NextResponse.json({ error: 'API Key not found.' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message || 'Failed to update API key' }, { status: 500 });
    }

    if (!data) { // Should be caught by PGRST116, but as a safeguard
        return NextResponse.json({ error: 'API Key not found after update attempt.' }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (e: any) {
    console.error(`Unexpected error in PUT /api/admin/api-keys/${key_id}:`, e);
    if (e instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, // request object is not used here but good to keep for consistency
  { params }: { params: { key_id: string } }
) {
  const supabase = createClient(cookies());
  const { key_id } = params;

  if (!key_id || typeof key_id !== 'string' || !key_id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
    return NextResponse.json({ error: 'Invalid key_id format.' }, { status: 400 });
  }

  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
  }

  try {
    const { error, count } = await supabase
      .from('admin_api_keys')
      .delete({ count: 'exact' }) // Ensure we know how many rows were deleted
      .eq('id', key_id);

    if (error) {
      console.error(`Error deleting admin API key ${key_id}:`, error);
      return NextResponse.json({ error: error.message || 'Failed to delete API key' }, { status: 500 });
    }

    if (count === 0) {
        return NextResponse.json({ error: 'API Key not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API Key deleted successfully.' }, { status: 200 }); // Or 204 No Content
  } catch (e: any) {
    console.error(`Unexpected error in DELETE /api/admin/api-keys/${key_id}:`, e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
