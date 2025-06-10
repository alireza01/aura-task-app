// app/api/process-task/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/encryption"; // Import decrypt

export async function POST(request: NextRequest) {
  try {
    const { title, description, autoRanking, autoSubtasks, userId } = await request.json();

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Ensure the user making the request is the one whose key is being used,
    // or if this is a system call, ensure proper authorization.
    // For this example, we assume userId in the request is validated elsewhere or is the authenticated user.
     const { data: { user: authUser } } = await supabase.auth.getUser();
     if (!authUser || authUser.id !== userId) {
       return NextResponse.json({ error: "Unauthorized or user ID mismatch" }, { status: 403 });
     }

    // Get user's encrypted API key
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("encrypted_gemini_api_key, speed_weight, importance_weight") // Select encrypted key
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings) {
      console.error("Error fetching user settings:", settingsError);
      return NextResponse.json({ error: "User settings not found or error fetching them." }, { status: 400 });
    }

    if (!settings.encrypted_gemini_api_key) {
      return NextResponse.json({ error: "API key not found for the user. Please set it up in settings." }, { status: 400 });
    }

    let apiKey: string;
    try {
      apiKey = await decrypt(settings.encrypted_gemini_api_key);
    } catch (decryptionError) {
      console.error("Failed to decrypt API key:", decryptionError);
      return NextResponse.json({ error: "Failed to process API key. It might be corrupted." }, { status: 500 });
    }

    let result: any = {};
    let prompt = `وظیفه: "${title}"`;
    if (description) {
      prompt += `\nتوضیحات: "${description}"`;
    }
    prompt += "\n\nلطفاً پاسخ را به صورت JSON با فرمت زیر ارائه دهید:\n{";

    if (autoRanking) {
      const speedWeight = settings?.speed_weight ?? 50;
      const importanceWeight = settings?.importance_weight ?? 50;
      prompt += `\n  "speedScore": "عدد بین 1 تا 20 (سرعت انجام - 20 = خیلی سریع، 1 = خیلی کند، با وزن ${speedWeight}%)",`;
      prompt += `\n  "importanceScore": "عدد بین 1 تا 20 (اهمیت - 20 = بحرانی، 1 = کم اهمیت، با وزن ${importanceWeight}%)",`;
    }
    prompt += '\n  "emoji": "یک ایموجی مناسب برای این وظیفه"';
    if (autoSubtasks) {
      prompt += ',\n  "subtasks": ["فهرست زیروظایف قابل اجرا - حداکثر 5 مورد"]';
    }
    prompt += "\n}";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, // Use decrypted key
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000, response_mime_type: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Gemini API call failed:", response.status, errorBody);
      return NextResponse.json({ error: `Failed to call Gemini API: ${errorBody?.error?.message || response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (aiText) {
      try {
        // The API is now configured to return JSON, so direct parsing should work.
        const aiResult = JSON.parse(aiText);
        result = {
          speedScore: parseInt(aiResult.speedScore) || 10,
          importanceScore: parseInt(aiResult.importanceScore) || 10,
          emoji: aiResult.emoji || "📝",
          subtasks: aiResult.subtasks || [],
        };
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError, "Raw AI text:", aiText);
        // Fallback if parsing fails despite mime type (e.g. if model doesn't strictly adhere)
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const aiResult = JSON.parse(jsonMatch[0]);
                 result = {
                    speedScore: parseInt(aiResult.speedScore) || 10,
                    importanceScore: parseInt(aiResult.importanceScore) || 10,
                    emoji: aiResult.emoji || "📝",
                    subtasks: aiResult.subtasks || [],
                };
            } catch (innerParseError) {
                 console.error("Failed to parse extracted JSON:", innerParseError);
                 result = { speedScore: 10, importanceScore: 10, emoji: "📝", subtasks: [] };
            }
        } else {
            result = { speedScore: 10, importanceScore: 10, emoji: "📝", subtasks: [] };
        }
      }
    } else {
        result = { speedScore: 10, importanceScore: 10, emoji: "📝", subtasks: [] };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing task:", error);
    // Check if the error is a known type and customize response
    if (error instanceof Error && error.message.includes('key')) { // Example check
        return NextResponse.json({ error: "API key issue: " + error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process task due to an unexpected error." }, { status: 500 });
  }
}
