import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // This route is intended for development testing of the Gemini API key.
  // It should not be accessible in a production environment.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { apiKey } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    // Test the API key with a simple request
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
                  text: "Hello",
                },
              ],
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      if (errorData.error && errorData.error.message === "Unsupported provider: provider is not enabled") {
        return NextResponse.json({ error: "Gemini API is not enabled for this project. Please enable it in Google Cloud Console." }, { status: 400 })
      }
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to test API key" }, { status: 500 })
  }
}
