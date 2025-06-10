import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { env } from "@/src/env.mjs"; // Assuming typed env is in use for API key if passed from client

export async function POST(request: NextRequest) {
  try {
    const { groupName, apiKey } = await request.json();

    if (!groupName) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }
    if (!apiKey) {
      // Prefer API key to be stored server-side if possible, or managed securely by user settings
      return NextResponse.json({ error: "API key is required for emoji generation" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [ // Added safety settings as per Gemini best practices
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ]
    });

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

    let generationResult;
    try {
      generationResult = await model.generateContent(prompt);
    } catch (genError: any) {
      console.error("Gemini API call failed during emoji generation:", genError);
      return NextResponse.json({ error: "Emoji generation service request failed.", details: genError.message }, { status: 502 }); // Bad Gateway
    }

    const response = await generationResult.response;
    const emoji = response.text()?.trim();

    // Validate that we got an emoji (basic check)
    if (!emoji || emoji.length > 4 || emoji.length === 0) { // Check for empty or overly long responses
      console.error("Emoji generation service returned invalid data. Raw response:", response.text());
      return NextResponse.json({ error: "Emoji generation service returned invalid or empty data." }, { status: 500 });
    }

    return NextResponse.json({ emoji });

  } catch (error: any) {
    console.error("Error assigning group emoji:", error);
    let errorMessage = "Failed to assign group emoji.";
    if (error.message) {
        errorMessage += " Details: " + error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
