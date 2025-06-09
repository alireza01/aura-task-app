import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Define the schema for the request body
const AssignGroupEmojiSchema = z.object({
  groupId: z.string().min(1, { message: "Group ID is required" }),
  emoji: z.string().min(1, { message: "Emoji is required" }).max(4, { message: "Emoji should be a single character" }), // Basic emoji length check
})

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const validation = AssignGroupEmojiSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request body", details: validation.error.flatten() }, { status: 400 })
    }

    const { groupId, emoji } = validation.data

    // Initialize Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // TODO: Authenticate the user and check permissions if necessary

    // Update the emoji for the specified group in the database
    const { data, error } = await supabase
      .from("task_groups") // Assuming your table is named 'task_groups'
      .update({ emoji: emoji })
      .eq("id", groupId)
      .select() // Optionally select the updated record

    if (error) {
      console.error("Error updating group emoji in database:", error)
      return NextResponse.json({ error: "Failed to update group emoji", details: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Group not found or no update occurred" }, { status: 404 })
    }

    return NextResponse.json({ message: "Emoji assigned successfully", updatedGroup: data[0] })

  } catch (error) {
    console.error("Error in /api/assign-group-emoji:", error)
    if (error instanceof z.ZodError) {
      // Should be caught by validation.success, but as a fallback
      return NextResponse.json({ error: "Invalid request body due to Zod validation", details: error.flatten() }, { status: 400 });
    }
    // General server error
    return NextResponse.json({ error: "An unexpected error occurred on the server." }, { status: 500 })
  }
}
