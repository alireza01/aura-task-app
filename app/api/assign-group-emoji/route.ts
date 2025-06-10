import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { serverLogger } from "@/lib/logger";

const assignGroupEmojiSchema = z.object({
  groupName: z.string().min(1),
  // apiKey: z.string().min(1), // Removed from schema
});

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

  try {
    const body = await request.json();
    const validation = assignGroupEmojiSchema.safeParse(body);

    if (!validation.success) {
      serverLogger.error("API Validation Error", { groupName: body?.groupName }, validation.error);
      return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
    }

    const { groupName } = validation.data;
    const modelName = "gemini-2.5-flash-preview-05-20"; // Or "gemini-2.5-flash-preview-05-20" if preferred
    const fallbackEmoji = "📁";
    let assignedEmoji = fallbackEmoji;
    let success = false;

    // 1. Fetch User's API Key
    const { data: userSettings, error: userSettingsError } = await supabase
      .from("user_settings")
      .select("gemini_api_key")
      .eq("user_id", userId)
      .single();

    if (userSettingsError && userSettingsError.code !== 'PGRST116') {
      serverLogger.error(`Error fetching user settings for user ${userId}`, { userId }, userSettingsError);
    }
    const userApiKey = userSettings?.gemini_api_key;

    const prompt = `
      You are an emoji assignment expert. Given a task group name in Persian/Farsi, suggest the most appropriate single emoji that represents the category or theme of that group.

      Group name: "${groupName}"
      Rules:
      1. Return ONLY the emoji character, nothing else.
      Respond with only the emoji:
    `; // Simplified prompt for brevity, original examples are good for real use.

    async function attemptApiCall(apiKey: string, keyType: 'user' | 'admin', adminKeyId?: string): Promise<boolean> {
      try {
        serverLogger.info(`Assign Group Emoji: Attempting AI call with ${keyType} key...`, { keyType, adminKeyId, groupName });
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const genResult = await model.generateContent(prompt);
        const response = genResult.response;
        const text = response.text().trim();

        if (text && text.length <= 4 && /\p{Emoji}/u.test(text)) { // Basic validation for an emoji
          assignedEmoji = text;
          serverLogger.info(`Assign Group Emoji: Successfully assigned emoji with ${keyType} key.`, { keyType, adminKeyId, groupName, assignedEmoji });
          if (keyType === 'admin' && adminKeyId) {
            supabase.from('admin_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', adminKeyId)
              .then(({ error }) => { if (error) serverLogger.warn(`Failed to update last_used_at for admin key ${adminKeyId}`, { adminKeyId }, error); });
          }
          return true;
        } else {
          serverLogger.warn(`Assign Group Emoji: Invalid emoji response using ${keyType} key. Response: "${text}"`, { keyType, adminKeyId, groupName, responseText: text });
          return false; // Consider invalid response as a failure for this key
        }
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        serverLogger.warn(`Assign Group Emoji: API call failed for ${keyType} key (ID: ${adminKeyId || 'N/A'})`, { keyType, adminKeyId, groupName, errorMessage }, apiError as Error);
        if (errorMessage && (errorMessage.includes('API key not valid') || errorMessage.includes('API key is invalid') || errorMessage.includes('quota'))) {
          if (keyType === 'user') {
            serverLogger.info("Assign Group Emoji: User API key failed with auth/quota error.", { userId, groupName });
          }
          return false; // Allow fallback
        }
        // For other errors (safety, model, network), do not retry with other keys for this specific route, just use fallback.
        // This is different from process-task where errors might be more critical. Here, a fallback emoji is acceptable.
        // throw apiError; // Or simply log and return false to use fallback. For emoji, fallback is fine.
        return false; // Treat as failure, use fallback
      }
    }

    let userKeyAttemptedAndFailedAuth = false;
    if (userApiKey) {
      serverLogger.info("Assign Group Emoji: Attempting with user API key.", { userId, groupName });
      success = await attemptApiCall(userApiKey, 'user');
      if (!success && userApiKey) { // Check if it specifically failed (not just was empty)
         // A more robust check here would be if attemptApiCall threw an auth error for the user key
         // For simplicity now, any failure with user key (if present) will lead to checking if it was auth-like
         // This part needs careful thought: if user key is invalid, we want to try admin. If it's other error, maybe not.
         // The current attemptApiCall returns false for auth errors, allowing fallback.
         userKeyAttemptedAndFailedAuth = !success; // If it failed, it might be an auth error (or other error handled as non-blocking)
      }
    }

    if (!success) {
      serverLogger.info("Assign Group Emoji: User key not used or failed. Attempting admin keys.", { userId, groupName });
      const { data: adminKeysData, error: adminKeysError } = await supabase
        .from("admin_api_keys")
        .select("id, api_key")
        .eq("is_active", true);

      if (adminKeysError) {
        serverLogger.error("Assign Group Emoji: Error fetching admin API keys", { userId, groupName }, adminKeysError);
      }

      if (adminKeysData && adminKeysData.length > 0) {
        for (let i = adminKeysData.length - 1; i > 0; i--) { // Shuffle
          const j = Math.floor(Math.random() * (i + 1));
          [adminKeysData[i], adminKeysData[j]] = [adminKeysData[j], adminKeysData[i]];
        }

        for (const adminKey of adminKeysData) {
          success = await attemptApiCall(adminKey.api_key, 'admin', adminKey.id);
          if (success) break;
        }
      }
    }

    if (!success) {
      serverLogger.info("Assign Group Emoji: All API key attempts failed or no keys available. Using fallback emoji.", { userId, groupName });
      // assignedEmoji is already fallbackEmoji by default
    }

    return NextResponse.json({ emoji: assignedEmoji });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    serverLogger.error("Assign Group Emoji: Main error handler", { userId, groupName, errorMessage }, error as Error);
    return NextResponse.json({ emoji: "📁" }); // Fallback emoji
  }
}
