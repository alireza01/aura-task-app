import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/lib/encryption"; // Adjust path as needed

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: "API key is required and must be a string" }, { status: 400 });
    }

    const encryptedApiKey = await encrypt(apiKey);

    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, encrypted_gemini_api_key: encryptedApiKey, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) {
      console.error("Error saving API key:", error);
      return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
    }

    return NextResponse.json({ message: "API key saved successfully" });
  } catch (error) {
    console.error("POST /api/user/api-key error:", error);
    if (error instanceof Error && error.message.includes('text format')) {
        return NextResponse.json({ error: "Invalid API key format for encryption." }, { status: 400 });
    }
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from("user_settings")
      .update({ encrypted_gemini_api_key: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting API key:", error);
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }

    return NextResponse.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/user/api-key error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("encrypted_gemini_api_key")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: single row not found, which is fine
      console.error("Error fetching API key status:", error);
      return NextResponse.json({ error: "Failed to fetch API key status" }, { status: 500 });
    }

    const hasApiKey = !!(data && data.encrypted_gemini_api_key);
    return NextResponse.json({ hasApiKey });
  } catch (error) {
    console.error("GET /api/user/api-key/status error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
