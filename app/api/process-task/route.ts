import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { z } from "zod";
import { serverLogger } from "@/lib/logger";

const processTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  autoRanking: z.boolean().optional(),
  autoSubtasks: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); // This is createRouteHandlerClient equivalent

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id; // Use userId from authenticated session

  try {
    const body = await request.json();
    const validation = processTaskSchema.safeParse(body);

    if (!validation.success) {
      serverLogger.error("API Validation Error", { body }, validation.error);
      return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
    }

    // userId is now obtained from session, not from body
    const { title, description, autoRanking, autoSubtasks } = validation.data;

    // 1. Fetch User Settings (includes API key, weights, and auto_tagging)
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("gemini_api_key, speed_weight, importance_weight, auto_tagging") // Added auto_tagging
      .eq("user_id", userId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116: zero rows returned
      serverLogger.error(`Error fetching user settings for user ${userId}`, { userId }, settingsError);
      // Depending on policy, might return error if settings are crucial
    }

    const userApiKey = settings?.gemini_api_key;
    const modelName = "gemini-2.5-flash-preview-05-20"; // Model name

    let result: any = {};
    const defaultResult = {
      speedScore: settings?.speed_weight ? Math.round(settings.speed_weight / 5) : 10,
      importanceScore: settings?.importance_weight ? Math.round(settings.importance_weight / 5) : 10,
      emoji: "📝",
      subtasks: [],
      tags: [], // Added tags to defaultResult
    };

    // Check if any AI feature is enabled (autoRanking, autoSubtasks from body, auto_tagging from settings)
    const autoTaggingEnabled = settings?.auto_tagging ?? false;
    if (!autoRanking && !autoSubtasks && !autoTaggingEnabled) {
      return NextResponse.json(defaultResult);
    }

    // Prepare AI prompt (remains the same)
    let prompt = `وظیفه: "${title}"`;
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
    if (autoTaggingEnabled) { // Use autoTaggingEnabled from settings
      prompt += ',\n  "tags": ["فهرست رشته‌ای از برچسب‌های مرتبط و مفید برای این وظیفه - حداکثر 3 برچسب مرتبط با موضوع وظیفه"]'
    }

    prompt += "\n}"

    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 1000,
      // responseMimeType: "application/json", // Ideal if model/SDK supports reliable JSON output for the prompt
    };

    let success = false;
    let usedKeyType: 'user' | 'admin' | null = null;
    let attemptUserKey = true;

    async function attemptApiCall(apiKey: string, keyType: 'user' | 'admin', adminKeyId?: string): Promise<boolean> {
      try {
        serverLogger.info(`Attempting AI call with ${keyType} key...`, { keyType, adminKeyId, userId, title });
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({ generationConfig, history: [{ role: "user", parts: [{ text: prompt }] }] });
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
              tags: autoTaggingEnabled ? (aiResult.tags || []) : [], // Process tags if autoTaggingEnabled
            };
            if (result.speedScore < 1) result.speedScore = 1; if (result.speedScore > 20) result.speedScore = 20;
            if (result.importanceScore < 1) result.importanceScore = 1; if (result.importanceScore > 20) result.importanceScore = 20;

            usedKeyType = keyType;
            serverLogger.info(`Successfully processed task with ${keyType} key.`, { keyType, adminKeyId, userId, title });
            if (keyType === 'admin' && adminKeyId) {
              supabase.from('admin_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', adminKeyId)
                .then(({ error }) => { if (error) serverLogger.warn(`Failed to update last_used_at for admin key ${adminKeyId}`, { adminKeyId }, error); });
            }
            return true;
          } else {
            serverLogger.warn(`No JSON object found in AI response using ${keyType} key. Raw text: ${aiText.substring(0, 100)}...`, { keyType, adminKeyId, userId, title });
            throw new Error("No JSON object found in AI response."); // Treat as failure for this key
          }
        } else {
          serverLogger.warn(`AI response text was empty using ${keyType} key.`, { keyType, adminKeyId, userId, title });
          throw new Error("AI response text was empty."); // Treat as failure for this key
        }
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        serverLogger.warn(`Gemini API call failed for ${keyType} key (ID: ${adminKeyId || 'N/A'})`, { keyType, adminKeyId, userId, title, errorMessage }, apiError as Error);
        if (errorMessage && (errorMessage.includes('API key not valid') || errorMessage.includes('API key is invalid') || errorMessage.includes('quota'))) {
          if (keyType === 'user') {
            serverLogger.info("User API key failed with auth/quota error. Will attempt admin keys.", { userId, title });
            attemptUserKey = false; // Mark that user key failed due to auth, so we don't use it again (for this request)
            return false; // Indicate failure, allowing fallback
          }
          // If admin key fails with auth/quota, just try next admin key
          return false;
        }
        // For other errors (safety, model, network), throw to stop further attempts with other keys.
        // Unless it's a specific non-auth related error that should allow fallback (e.g. temporary server error on Google's side)
        // For now, any non-auth error with user key will stop the process.
        // And any non-auth error with an admin key will also stop (as it's likely not key-specific)
        throw apiError; // Rethrow to be caught by the outer try/catch or stop iteration
      }
    }

    if (userApiKey && attemptUserKey) {
      try {
        success = await attemptApiCall(userApiKey, 'user');
      } catch (error: unknown) { // Catch errors re-thrown by attemptApiCall if they are non-auth related
        const errorMessage = error instanceof Error ? error.message : String(error);
        serverLogger.error(`AI processing failed with user key due to non-auth error: ${errorMessage}`, { userId, title }, error as Error);
        // If error is safety related or other non-key specific issue
        if (errorMessage && errorMessage.includes('SAFETY')) {
          return NextResponse.json({ error: "Content blocked due to safety settings.", details: errorMessage }, { status: 400 });
        }
        // For other non-auth errors with user key, we might not want to try admin keys.
        // For now, we will stop if user key fails with a non-auth error.
        return NextResponse.json({ error: "AI processing failed with user API key.", details: errorMessage }, { status: 500 });
      }
    }

    if (!success) { // If user key was not available, or failed with auth error, or user key attempt was skipped
      serverLogger.info("User key not used or failed with auth error, attempting admin keys.", { userId, title });
      const { data: adminKeysData, error: adminKeysError } = await supabase
        .from("admin_api_keys")
        .select("id, api_key")
        .eq("is_active", true);

      if (adminKeysError) {
        serverLogger.error("Error fetching admin API keys", { userId, title }, adminKeysError);
      }

      if (adminKeysData && adminKeysData.length > 0) {
        for (let i = adminKeysData.length - 1; i > 0; i--) { // Shuffle
          const j = Math.floor(Math.random() * (i + 1));
          [adminKeysData[i], adminKeysData[j]] = [adminKeysData[j], adminKeysData[i]];
        }

        for (const adminKey of adminKeysData) {
          try {
            success = await attemptApiCall(adminKey.api_key, 'admin', adminKey.id);
            if (success) break;
          } catch (error: unknown) { // Catch errors re-thrown by attemptApiCall if they are non-auth related for an admin key
             const errorMessage = error instanceof Error ? error.message : String(error);
             serverLogger.error(`AI processing failed with admin key ${adminKey.id} due to non-auth error: ${errorMessage}`, { adminKeyId: adminKey.id, userId, title }, error as Error);
             if (errorMessage && errorMessage.includes('SAFETY')) {
               return NextResponse.json({ error: "Content blocked due to safety settings.", details: errorMessage }, { status: 400 });
             }
             // If one admin key fails with a non-auth error, it's likely others will too. Stop.
             return NextResponse.json({ error: "AI processing failed with an admin API key.", details: errorMessage }, { status: 500 });
          }
        }
      }
    }

    if (!success && (autoRanking || autoSubtasks || autoTaggingEnabled)) { // Check autoTaggingEnabled here too
      serverLogger.error("All API key attempts (user and admin) failed or no keys available for enabled AI features.", { userId, title });
      return NextResponse.json({ error: "Unable to process the request using AI at the moment. No working API key found or all attempts failed for enabled AI features." }, { status: 503 });
    } else if (!success) {
      // AI features were not critical, or no AI features requested, and no success (though this path should be covered by early exit)
      result = defaultResult; // Fallback to default if AI processing was desired but failed, and it's not critical enough to error out
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    serverLogger.error("Error processing task", { userId, title }, error as Error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage || "Failed to process task" }, { status: 500 });
  }
}
