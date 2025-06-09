import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { z } from "zod"

// Define the schema for the request body
const ProcessTaskSchema = z.object({
  taskId: z.string().min(1, { message: "Task ID is required" }),
  action: z.string().min(1, { message: "Action is required" }),
  // Keeping userId for API key fetching, assuming it might still be needed
  // or passed alongside taskId and action.
  // If not, this should also be revisited.
  userId: z.string().min(1, { message: "User ID is required" }),
  // The following fields were part of the original logic but not the new schema.
  // Including them here if they are still passed, otherwise they should be removed
  // or the AI processing logic needs to be re-evaluated.
  title: z.string().optional(),
  description: z.string().optional(),
  autoRanking: z.boolean().optional(),
  autoSubtasks: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const validation = ProcessTaskSchema.safeParse(rawBody)

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request body", details: validation.error.flatten() }, { status: 400 })
    }

    const { taskId, action, userId, title, description, autoRanking, autoSubtasks } = validation.data

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get user's API key (assuming userId is still relevant)
    const { data: settings } = await supabase
      .from("user_settings")
      .select("gemini_api_key, speed_weight, importance_weight")
      .eq("user_id", userId)
      .single()

    if (!settings?.gemini_api_key) {
      return NextResponse.json({ error: "API key not found for the user" }, { status: 400 })
    }

    let result: any = { message: `Action '${action}' received for task '${taskId}'.` }

    // Commenting out the original AI processing logic as the new schema
    // {taskId, action} does not directly support it without title/description.
    // This part needs to be re-evaluated based on the intended functionality of 'action'.

    /*
    // Prepare AI prompt
    let prompt = `وظیفه: "${title}"` // title is now optional and might be empty
    if (description) {
      prompt += `\nتوضیحات: "${description}"` // description is now optional
    }

    prompt += "\n\nلطفاً پاسخ را به صورت JSON با فرمت زیر ارائه دهید:\n{"

    if (autoRanking) { // autoRanking is now optional
      const speedWeight = settings?.speed_weight ?? 50
      const importanceWeight = settings?.importance_weight ?? 50
      prompt += `\n  "speedScore": عدد بین 1 تا 20 (سرعت انجام - 20 = خیلی سریع، 1 = خیلی کند، با وزن ${speedWeight}%),`
      prompt += `\n  "importanceScore": عدد بین 1 تا 20 (اهمیت - 20 = بحرانی، 1 = کم اهمیت، با وزن ${importanceWeight}%),`
    }

    prompt += '\n  "emoji": "یک ایموجی مناسب برای این وظیفه"'

    if (autoSubtasks) { // autoSubtasks is now optional
      prompt += ',\n  "subtasks": ["فهرست زیروظایف قابل اجرا - حداکثر 5 مورد"]'
    }

    prompt += "\n}"

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.gemini_api_key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      },
    )

    if (!response.ok) {
      // Consider more specific error handling for API call failure
      console.error("Failed to call Gemini API:", response.status, await response.text());
      return NextResponse.json({ error: "Failed to call Gemini API" }, { status: response.status })
    }

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (aiText) {
      try {
        // Extract JSON from AI response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0])
          result = { // Overwriting the initial result message
            speedScore: aiResult.speedScore || 10,
            importanceScore: aiResult.importanceScore || 10,
            emoji: aiResult.emoji || "📝",
            subtasks: aiResult.subtasks || [],
            message: `AI processing complete for action '${action}' on task '${taskId}'.`
          }
        } else {
           result.message += " AI response was not in expected JSON format.";
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError)
        // Fallback values if parsing fails but API call was successful
        result = { // Overwriting the initial result message
          speedScore: 10,
          importanceScore: 10,
          emoji: "📝",
          subtasks: [],
          message: `Action '${action}' received. AI response parsing failed for task '${taskId}'.`,
          aiError: "Failed to parse AI response"
        }
      }
    } else {
        result.message += " No text returned from AI.";
    }
    */

    // Depending on the 'action', different logic would be applied here.
    // For example, if action === 'updateStatus', you might update the task in Supabase.
    // If action === 'generateSummary', you might use the AI to summarize task details (if provided).

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in /api/process-task:", error)
    // Distinguish between ZodError and other errors if needed, though Zod errors are caught above.
    if (error instanceof z.ZodError) {
        // This case should ideally be caught by validation.success check,
        // but as a fallback.
        return NextResponse.json({ error: "Invalid request body due to Zod validation", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "An unexpected error occurred on the server." }, { status: 500 })
  }
}
