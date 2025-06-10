import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types'; // Assuming this path is correct
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const updateApiKeySchema = z.object({
  name: z.string().max(255).optional().nullable(), // Allow null to remove name
  is_active: z.boolean().optional(),
}).refine(data => data.name !== undefined || data.is_active !== undefined, {
  message: "At least one field (name or is_active) must be provided for update.",
});

// Helper function to check if user is admin (can be refactored into a shared util if not already)
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
    const validation = updateApiKeySchema.safeParse(body);

    if (!validation.success) {
      console.error("API Validation Error:", validation.error.format());
      return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
    }

    const { name, is_active } = validation.data;
    const updatePayload: { name?: string | null; is_active?: boolean } = {};

    if (name !== undefined) {
      updatePayload.name = name;
    }
    if (is_active !== undefined) {
      updatePayload.is_active = is_active;
    }
    // The refine in the schema ensures at least one is present.

    // Add updated_at manually if not handled by DB trigger for all updates.
    // Our schema has a trigger, so this is likely not needed.
    // updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('admin_api_keys')
      .update(updatePayload as any) // Use 'as any' if Supabase types conflict with optional nulls
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

  } catch (e: unknown) {
    console.error(`Unexpected error in PUT /api/admin/api-keys/${key_id}:`, e);
    if (e instanceof SyntaxError) { // SyntaxError is a specific type of Error
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred' }, { status: 500 });
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
  } catch (e: unknown) {
    console.error(`Unexpected error in DELETE /api/admin/api-keys/${key_id}:`, e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred' }, { status: 500 });
  }
}
