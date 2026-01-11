import { NextResponse } from "next/server"

const MODEL_NAME = process.env.GEMINI_VISION_MODEL || "gemini-1.5-flash"
const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

export async function POST(request: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.imageData) {
    return NextResponse.json({ error: "Missing imageData" }, { status: 400 })
  }

  const imageData: string = body.imageData
  const match = imageData.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    return NextResponse.json({ error: "Invalid imageData format" }, { status: 400 })
  }

  const mimeType = match[1]
  const base64 = match[2]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are monitoring a security camera feed. Summarize what is happening in this frame and list concrete actions.\nRespond ONLY with JSON: {"summary": string, "actions": string[], "confidence": number}\n- actions should be short verb phrases\n- confidence must be 0..1`,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 256,
          response_mime_type: "application/json",
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error }, { status: 500 })
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : text

  try {
    const parsed = JSON.parse(jsonStr)
    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json({ error: "Failed to parse model response" }, { status: 500 })
  }
}
