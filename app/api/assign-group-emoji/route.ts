import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    const { groupName, apiKey } = await request.json()

    if (!groupName || !apiKey) {
      return NextResponse.json({ error: "نام گروه و کلید API الزامی است" }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      You are an emoji assignment expert. Given a task group name in Persian/Farsi, suggest the most appropriate single emoji that represents the category or theme of that group.

      Group name: "${groupName}"

      Rules:
      1. Return ONLY the emoji character, nothing else
      2. Choose an emoji that best represents the category/theme
      3. Prefer commonly used, recognizable emojis
      4. Consider Persian/Iranian context when relevant

      Examples:
      - کار/شغل → 💼
      - خانه → 🏠
      - مطالعه → 📚
      - ورزش → ⚽
      - خرید → 🛒
      - سفر → ✈️
      - پروژه → 🎯

      Respond with only the emoji:
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    let emoji = response.text().trim()

    // Validate that we got an emoji (basic check)
    if (!emoji || emoji.length > 4) {
      emoji = "📁" // Fallback emoji
    }

    return NextResponse.json({ emoji })
  } catch (error) {
    console.error("خطا در تخصیص ایموجی:", error)
    return NextResponse.json({ emoji: "📁" }) // Return fallback emoji instead of error
  }
}
