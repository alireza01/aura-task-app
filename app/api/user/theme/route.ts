import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
    const { theme } = await request.json();
    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ error: "Theme is required and must be a string" }, { status: 400 });
    }

    // Optional: Validate theme value if you have a predefined list of themes
    const allowedThemes = ["default", "alireza", "neda"]; // Example
    if (!allowedThemes.includes(theme)) {
        return NextResponse.json({ error: "Invalid theme value" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_settings")
      .update({ theme: theme, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error saving theme:", error);
      // Check if the error is because the user_settings row doesn't exist
      if (error.code === 'PGRST116' || error.message.includes(" exactement 0 rangées")) { // PGRST116: No rows found, specific message might vary
        // Row doesn't exist, so create it (upsert behavior)
        const { error: insertError } = await supabase
          .from("user_settings")
          .insert({ user_id: user.id, theme: theme, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

        if (insertError) {
            console.error("Error inserting theme after failed update:", insertError);
            return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Failed to save theme" }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Theme saved successfully" });
  } catch (error) {
    console.error("POST /api/user/theme error:", error);
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
    // For unauthenticated users, perhaps return a default or no theme
    return NextResponse.json({ theme: "default" }); // Or { theme: null }
  }

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("theme")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // If settings row doesn't exist, PGRST116 error occurs, which is fine.
      // Return default theme or let client handle no-theme case.
      if (error.code === 'PGRST116') {
        return NextResponse.json({ theme: "default" }); // Default if no settings found
      }
      console.error("Error fetching theme:", error);
      return NextResponse.json({ error: "Failed to fetch theme" }, { status: 500 });
    }

    // If data is null (e.g. row exists but theme column is null), also return default
    const themeToReturn = data && data.theme ? data.theme : "default";
    return NextResponse.json({ theme: themeToReturn });

  } catch (error) {
    console.error("GET /api/user/theme error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
