import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { env } from "@/src/env.mjs"; // Assuming typed env is in use

export async function POST(request: NextRequest) {
  try {
    const { title, description, autoRanking, autoSubtasks, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: settings } = await supabase
      .from("user_settings")
      .select("gemini_api_key, speed_weight, importance_weight")
      .eq("user_id", userId)
      .single();

    if (!settings?.gemini_api_key) {
      return NextResponse.json({ error: "Gemini API key not found for user. Please configure it in settings." }, { status: 400 });
    }

    let prompt = `وظیفه: "${title}"`;
    if (description) {
      prompt += `
توضیحات: "${description}"`;
    }
    prompt += "

لطفاً پاسخ را به صورت JSON با فرمت زیر ارائه دهید:
{";

    if (autoRanking) {
      const speedWeight = settings?.speed_weight ?? 50;
      const importanceWeight = settings?.importance_weight ?? 50;
      prompt += `
  "speedScore": عدد بین 1 تا 20 (سرعت انجام - 20 = خیلی سریع، 1 = خیلی کند، با وزن ${speedWeight}%),`;
      prompt += `
  "importanceScore": عدد بین 1 تا 20 (اهمیت - 20 = بحرانی، 1 = کم اهمیت، با وزن ${importanceWeight}%),`;
    }
    prompt += '
  "emoji": "یک ایموجی مناسب برای این وظیفه"';
    if (autoSubtasks) {
      prompt += ',
  "subtasks": ["فهرست زیروظایف قابل اجرا - حداکثر 5 مورد"]';
    }
    prompt += "
}";

    let geminiResponse;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.gemini_api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          }),
        }
      );
    } catch (fetchError: any) {
      console.error("Error fetching Gemini API:", fetchError);
      return NextResponse.json({ error: "AI service request failed due to a network or fetch error.", details: fetchError.message }, { status: 503 }); // Service Unavailable
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API request failed:", geminiResponse.status, errorBody);
      return NextResponse.json(
        { error: "AI service request failed. Please check your API key and ensure the Gemini API is enabled.", details: errorBody },
        { status: geminiResponse.status } // Use actual status from Gemini if available
      );
    }

    const data = await geminiResponse.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      console.error("AI service returned no content or unexpected response structure:", data);
      return NextResponse.json({ error: "AI service returned no content or unexpected response structure." }, { status: 500 });
    }

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch?.[0]) {
        console.error("No JSON object found in AI response:", aiText);
        return NextResponse.json({ error: "Failed to extract JSON from AI response." }, { status: 500 });
      }

      const aiResult = JSON.parse(jsonMatch[0]);
      const result = {
        speedScore: aiResult.speedScore || 10,
        importanceScore: aiResult.importanceScore || 10,
        emoji: aiResult.emoji || "📝",
        subtasks: aiResult.subtasks || [],
      };
      return NextResponse.json(result);

    } catch (parseError: any) {
      console.error("Failed to parse AI response JSON:", parseError, "Raw AI text:", aiText);
      return NextResponse.json({ error: "Failed to parse AI response content.", details: parseError.message, rawResponse: aiText }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error processing task:", error);
    // General fallback error
    let errorMessage = "Failed to process task.";
    let errorStatus = 500;
    if (error.message) {
        errorMessage += " Details: " + error.message;
    }
    // Check for specific error types if needed, e.g., from Supabase client
    // if (error instanceof SomeSupabaseError) { errorStatus = 4xx or 5xx; }
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}
