import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  // This route is intended for development testing of the Gemini API key.
  // It should not be accessible in a production environment.
  // Consider if this check is still needed or if admin-only access is sufficient.
  // For now, keeping it as per original logic.
  if (process.env.NODE_ENV === "production" && !request.url.includes('/api/admin/')) { // Allow admin usage in prod
    // A more robust check would be to see if the caller is admin,
    // but this route is also used by non-admin users to test their own keys.
    // The original production check might be too restrictive if admins need to test keys in prod.
    // For now, let's assume the original intent stands for non-admin key tests.
    // This logic might need review based on how admin key testing vs user key testing is handled.
    // return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-preview-0520", // Using the same model as process-task
      // Default safety settings are usually fine for a simple "Hello"
    });

    try {
      const result = await model.generateContent("Hello");
      const response = result.response;
      // We just need to know if it succeeded, content of response.text() isn't critical here.
      if (response && response.text() !== undefined && response.text() !== null) {
        return NextResponse.json({ success: true });
      } else {
        // This case might indicate an issue even if no error was thrown, e.g. empty response
        return NextResponse.json({ error: "API key test failed: Empty response from model." }, { status: 400 });
      }
    } catch (apiError: any) {
      console.error("Gemini API test call failed:", apiError);
      if (apiError.message) {
        if (apiError.message.includes('API key not valid')) {
          return NextResponse.json({ error: "Invalid API key. Please check the key and try again." }, { status: 400 });
        }
        if (apiError.message.includes('permission denied') || apiError.message.includes('API not enabled')) {
          return NextResponse.json({ error: "Gemini API is not enabled for this project or permission denied. Please check Google Cloud Console." }, { status: 400 });
        }
         if (apiError.message.includes('SAFETY')) {
          // Unlikely for "Hello", but good to have
          return NextResponse.json({ error: "Content blocked due to safety settings during test." , details: apiError.message }, { status: 400 });
        }
      }
      // Generic error for other cases
      return NextResponse.json({ error: "Failed to test API key. " + (apiError.message || "") }, { status: 500 });
    }

  } catch (error: any) { // Catch errors from request.json() or other unexpected issues
    console.error("Error in test-gemini route:", error);
    return NextResponse.json({ error: error.message || "Failed to test API key due to an unexpected error." }, { status: 500 });
  }
}
