// app/api/assign-group-emoji/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/encryption"; // Import decrypt

export async function POST(request: NextRequest) {
  try {
    const { groupName } = await request.json();

    if (!groupName) {
      return NextResponse.json({ error: "نام گروه الزامی است" }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("encrypted_gemini_api_key")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings) {
        console.error("Error fetching user settings for emoji assignment:", settingsError);
        return NextResponse.json({ emoji: "📁" }); // Fallback emoji
    }

    if (!settings.encrypted_gemini_api_key) {
      // User hasn't set API key, return fallback
      return NextResponse.json({ emoji: "📁" });
    }

    let apiKey: string;
    try {
      apiKey = await decrypt(settings.encrypted_gemini_api_key);
    } catch (decryptionError) {
      console.error("Failed to decrypt API key for emoji assignment:", decryptionError);
      return NextResponse.json({ emoji: "📁" }); // Fallback emoji
    }

    const genAI = new GoogleGenerativeAI(apiKey); // Use decrypted key
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an emoji assignment expert. Given a task group name in Persian/Farsi, suggest the most appropriate single emoji that represents the category or theme of that group.
      Group name: "${groupName}"
      Rules:
      1. Return ONLY the emoji character, nothing else.
      2. Choose an emoji that best represents the category/theme.
      3. Prefer commonly used, recognizable emojis.
      4. Consider Persian/Iranian context when relevant.
      Examples:
      - کار/شغل → 💼
      - خانه → 🏠
      - مطالعه → 📚
      - ورزش → ⚽
      - خرید → 🛒
      - سفر → ✈️
      - پروژه → 🎯
      Respond with only the emoji:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let emoji = response.text().trim();

    // Basic validation for emoji (unicode characters can be longer than 1 js char)
    // This regex aims to match common emojis, including those with skin tone modifiers
    const emojiRegex = /^(?:[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|[\u0023-\u0039]\uFE0F?\u20E3|[\u2190-\u21FF])$/;
    if (!emoji || !emojiRegex.test(emoji)) {
      console.warn(`Generated content "${emoji}" is not a valid single emoji for group "${groupName}". Falling back.`);
      emoji = "📁";
    }


    return NextResponse.json({ emoji });
  } catch (error) {
    console.error("خطا در تخصیص ایموجی:", error);
    // Check if the error is related to API key issues specifically
    if (error instanceof Error && (error.message.includes('[GoogleGenerativeAI Error]: Error fetching from GoogleGenerativeAI') || error.message.includes('API key not valid'))) {
        return NextResponse.json({ error: "Google API Key is invalid or missing. Please check your settings." , emoji: "⚠️"});
    }
    return NextResponse.json({ emoji: "📁" }); // Generic fallback for other errors
  }
}
