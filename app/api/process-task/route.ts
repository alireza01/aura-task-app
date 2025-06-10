import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const { title, description, autoRanking, autoSubtasks, userId } = await request.json()

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // 1. API Key List Management
    const potentialApiKeys: { key: string; type: 'user' | 'admin'; id?: string }[] = [];

    // Get user's API key
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("gemini_api_key, speed_weight, importance_weight")
      .eq("user_id", userId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116: zero rows returned
      console.error("Error fetching user settings:", settingsError);
      // Potentially return error if this is unexpected
    }

    if (settings?.gemini_api_key) {
      potentialApiKeys.push({ key: settings.gemini_api_key, type: 'user' });
    }

    // Fetch active admin API keys
    const { data: adminKeysData, error: adminKeysError } = await supabase
      .from("admin_api_keys")
      .select("id, api_key")
      .eq("is_active", true);

    if (adminKeysError) {
      console.error("Error fetching admin API keys:", adminKeysError);
      // Don't necessarily fail the request, user key might still work or no keys needed if all auto features off
    }

    if (adminKeysData && adminKeysData.length > 0) {
      // Shuffle admin keys
      for (let i = adminKeysData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [adminKeysData[i], adminKeysData[j]] = [adminKeysData[j], adminKeysData[i]];
      }
      adminKeysData.forEach(ak => potentialApiKeys.push({ key: ak.api_key, type: 'admin', id: ak.id }));
    }

    // If no processing that requires AI is enabled, can return early or with default values.
    // For this refactor, we assume AI processing is intended if the route is hit.
    if (potentialApiKeys.length === 0 && (autoRanking || autoSubtasks)) {
        return NextResponse.json({ error: "No API keys available (user or admin) to process this request." }, { status: 503 });
    }


    // Model Name Verification: Using gemini-2.5-flash-preview-05-20 as per subtask instruction
    const modelName = "gemini-2.5-flash-preview-05-20";
    // const genAI = new GoogleGenerativeAI(apiKey); // Will be initialized in the loop
    // const model = genAI.getGenerativeModel({ model: modelName }); // Will be initialized in the loop
    // Ensure safety settings if not default
    // safetySettings: [
    //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      //   { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      //   { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      //   { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      // ],
    // });

    let result: any = {}
    // Default result structure if AI processing is skipped or fails entirely
    const defaultResult = {
      speedScore: settings?.speed_weight ? Math.round(settings.speed_weight / 5) : 10, // Default based on weight or 10
      importanceScore: settings?.importance_weight ? Math.round(settings.importance_weight / 5) : 10, // Default based on weight or 10
      emoji: "📝",
      subtasks: [],
    };

    if (!autoRanking && !autoSubtasks) {
      // If no AI features are requested, return defaults immediately.
      return NextResponse.json(defaultResult);
    }

    // Prepare AI prompt
    let prompt = `وظیفه: "${title}"`
    if (description) {
      prompt += `\nتوضیحات: "${description}"`
    }

    prompt += "\n\nلطفاً پاسخ را به صورت JSON با فرمت زیر ارائه دهید:\n{"

    if (autoRanking) {
      const speedWeight = settings?.speed_weight ?? 50
      const importanceWeight = settings?.importance_weight ?? 50
      prompt += `\n  "speedScore": عدد بین 1 تا 20 (سرعت انجام - 20 = خیلی سریع، 1 = خیلی کند، با وزن ${speedWeight}%),`
      prompt += `\n  "importanceScore": عدد بین 1 تا 20 (اهمیت - 20 = بحرانی، 1 = کم اهمیت، با وزن ${importanceWeight}%),`
    }

    prompt += '\n  "emoji": "یک ایموجی مناسب برای این وظیفه"'

    if (autoSubtasks) {
      prompt += ',\n  "subtasks": ["فهرست زیروظایف قابل اجرا - حداکثر 5 مورد"]'
    }

    prompt += "\n}"

    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 1000,
      // responseMimeType: "application/json", // Ideal if model/SDK supports reliable JSON output for the prompt
    };

    let success = false;
    let lastError: any = null;

    for (const apiKeyAttempt of potentialApiKeys) {
      try {
        console.log(`Attempting API call with ${apiKeyAttempt.type} key...`);
        const genAI = new GoogleGenerativeAI(apiKeyAttempt.key);
        const model = genAI.getGenerativeModel({
          model: modelName,
          // safetySettings: [...] // Consider if consistent safety settings are needed here
        });

        // Using startChat as in previous version, can be switched to generateContent if preferred
        const chat = model.startChat({
          generationConfig,
          history: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const genResult = await chat.sendMessage("generate");
        const aiResponse = genResult.response;
        const aiText = aiResponse.text();

        if (aiText) {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiResult = JSON.parse(jsonMatch[0]);
            result = {
              speedScore: aiResult.speedScore === undefined && !autoRanking ? defaultResult.speedScore : (aiResult.speedScore ?? defaultResult.speedScore),
              importanceScore: aiResult.importanceScore === undefined && !autoRanking ? defaultResult.importanceScore : (aiResult.importanceScore ?? defaultResult.importanceScore),
              emoji: aiResult.emoji || defaultResult.emoji,
              subtasks: aiResult.subtasks || defaultResult.subtasks,
            };
            // Ensure scores are within 1-20 range if provided
            if (result.speedScore < 1) result.speedScore = 1; if (result.speedScore > 20) result.speedScore = 20;
            if (result.importanceScore < 1) result.importanceScore = 1; if (result.importanceScore > 20) result.importanceScore = 20;

            success = true;
            console.log(`Successfully processed task with ${apiKeyAttempt.type} key.`);

            if (apiKeyAttempt.type === 'admin' && apiKeyAttempt.id) {
              // Optional: Update last_used_at for admin key (fire and forget)
              supabase.from('admin_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKeyAttempt.id)
                .then(({ error }) => {
                  if (error) console.warn(`Failed to update last_used_at for admin key ${apiKeyAttempt.id}:`, error.message);
                });
            }
            break; // Exit loop on success
          } else {
            lastError = new Error("No JSON object found in AI response.");
            console.warn(`No JSON object found in AI response using ${apiKeyAttempt.type} key. Raw text: ${aiText.substring(0, 100)}...`);
          }
        } else {
          lastError = new Error("AI response text was empty.");
          console.warn(`AI response text was empty using ${apiKeyAttempt.type} key.`);
        }
      } catch (apiError: any) {
        lastError = apiError;
        console.warn(`Gemini API call failed for ${apiKeyAttempt.type} key (ID: ${apiKeyAttempt.id || 'N/A'}):`, apiError.message);

        // Specific errors that might warrant stopping immediately vs. trying next key
        if (apiError.message && apiError.message.includes('SAFETY')) {
          // If a safety error occurs, it's prompt-related, not key-related. Stop.
          return NextResponse.json({ error: "Content blocked due to safety settings.", details: apiError.message }, { status: 400 });
        }
        // Add other conditions here if certain errors are non-retryable with other keys
        // e.g., invalid prompt structure, though the current prompt is static.
      }
    }

    if (!success) {
      console.error("All API key attempts failed. Last error:", lastError?.message || "Unknown error");
      // Return default result or an error message if AI processing was critical
      if (autoRanking || autoSubtasks) { // If AI features were expected
         return NextResponse.json({ error: "Unable to process the request using AI at the moment. Please try again later.", details: lastError?.message }, { status: 503 });
      }
      // If AI features were not strictly critical, could return defaultResult here.
      // However, the earlier check for no keys + (autoRanking || autoSubtasks) implies AI is desired.
      result = defaultResult; // Fallback to default if no AI processing succeeded but was not critical
    }

    // Merge with default results for any parts that AI didn't provide or if AI failed but defaults are acceptable
    // This logic is now more integrated into the success block and fallback for `result`.
    // If AI was successful, `result` is populated. If not, and AI was critical, an error is returned.
    // If AI was not critical and failed, `result` would be `defaultResult`.

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error processing task:", error)
    return NextResponse.json({ error: error.message || "Failed to process task" }, { status: 500 })
  }
}
