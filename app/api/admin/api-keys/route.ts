import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types'; // Assuming this path is correct
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkAdminRole } from '@/lib/auth/utils';
import { serverLogger } from '@/lib/logger';

const createApiKeySchema = z.object({
  api_key: z.string().min(1).max(1000), // Assuming a reasonable max length for an API key
  name: z.string().max(255).optional().nullable(),
});

export async function GET(request: Request) {
  const supabase = createClient(cookies());

  if (!(await checkAdminRole(supabase))) {
    return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from('admin_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      serverLogger.error('Error fetching admin API keys', {}, error);
      return NextResponse.json({ error: error.message || 'Failed to fetch API keys' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e: unknown) {
    serverLogger.error('Unexpected error in GET /api/admin/api-keys', {}, e as Error);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient(cookies());

  if (!(await checkAdminRole(supabase))) {
    return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      serverLogger.error("API Validation Error", {}, validation.error);
      return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
    }

    const { api_key, name } = validation.data;

    const { data, error } = await supabase
      .from('admin_api_keys')
      .insert([{ api_key, name: name }]) // name can be null from Zod validation if not provided or explicitly null
      .select()
      .single(); // Assuming you want to return the created key

    if (error) {
      serverLogger.error('Error creating admin API key', {}, error);
      if (error.code === '23505') { // Unique constraint violation for api_key
        return NextResponse.json({ error: 'This API key already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Failed to create API key' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    serverLogger.error('Unexpected error in POST /api/admin/api-keys', {}, e as Error);
    // Check if it's a JSON parsing error
    if (e instanceof SyntaxError) { // SyntaxError is a specific type of Error
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred' }, { status: 500 });
  }
}
