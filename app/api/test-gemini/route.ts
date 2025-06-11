import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"; // HarmCategory, HarmBlockThreshold removed as not used
import { z } from "zod";
import { createClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/logger';

const testGeminiSchema = z.object({
  apiKey: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // const cookieStore = cookies(); // Not needed if createClient() handles it
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional: Add specific role checks here if needed, e.g., only admins or paying users.
  // For now, any authenticated user can test an API key.

  // The original production environment check might still be relevant or could be
  // replaced/augmented by role-based access.
  // if (process.env.NODE_ENV === "production" && !request.url.includes('/api/admin/')) {
  //   return NextResponse.json({ error: "Not found" }, { status: 404 })
  // }

  try {
    const body = await request.json();
    const validation = testGeminiSchema.safeParse(body);

    if (!validation.success) {
      serverLogger.error("API Validation Error", { body }, validation.error);
      return NextResponse.json({ error: "Invalid input.", issues: validation.error.format() }, { status: 400 });
    }

    const { apiKey } = validation.data;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20", // Using the same model as process-task
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
      serverLogger.error("Gemini API test call failed", { apiKey }, apiError);
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
    serverLogger.error("Error in test-gemini route", {}, error);
    return NextResponse.json({ error: error.message || "Failed to test API key due to an unexpected error." }, { status: 500 });
  }
}
