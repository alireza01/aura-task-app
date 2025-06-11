// app/api/admin/api-keys/[key_id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'lib/supabase/server';
import { checkAdminRole } from 'lib/auth/utils';
import { serverLogger } from 'lib/logger';
import { z } from 'zod';

const updateApiKeySchema = z.object({
  name: z.string().max(255).optional().nullable(),
  is_active: z.boolean().optional(),
});

// UPDATE an API Key's name or active status
export async function PUT(
  request: Request,
  { params }: { params: { key_id: string } }
) {
  const supabase = createClient();
  if (!(await checkAdminRole(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const key_id = params.key_id;
  try {
    const body = await request.json();
    const validation = updateApiKeySchema.safeParse(body);

    if (!validation.success) {
      serverLogger.error("API Validation Error", { key_id }, validation.error);
      return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
    }
    
    const { name, is_active } = validation.data;
    
    if (name === undefined && is_active === undefined) {
        return NextResponse.json({ error: "No update fields provided." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('admin_api_keys')
      .update({ name, is_active, updated_at: new Date().toISOString() })
      .eq('id', key_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    serverLogger.error(`Error updating admin API key ${key_id}`, {}, e as Error);
    if (e instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE an API Key
export async function DELETE(
  request: Request,
  { params }: { params: { key_id: string } }
) {
  const supabase = createClient();
  if (!(await checkAdminRole(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const key_id = params.key_id;
  try {
    const { error } = await supabase
      .from('admin_api_keys')
      .delete()
      .eq('id', key_id);

    if (error) throw error;
    return NextResponse.json({ message: 'API key deleted successfully' }, { status: 200 });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    serverLogger.error(`Error deleting admin API key ${key_id}`, {}, e as Error);
    return NextResponse.json({ error: errorMessage || 'An unexpected error occurred' }, { status: 500 });
  }
}
