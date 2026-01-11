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
                text: `You are analyzing a security camera feed frame at timestamp ${body.timestamp || 0} seconds. ${body.previousSummary ? `Previous scene: "${body.previousSummary}"` : "This is the first analysis."}

Your task: Analyze this video frame and create timeline events describing what's happening.

IMPORTANT: Always return at least ONE event, even if the scene is empty or static. Describe what you see.

Focus on:
- People: Who is visible, what are they doing, where are they going
- Vehicles: Cars, trucks, motorcycles - entering, leaving, parked
- Objects: Packages, bags, suspicious items left behind
- Activities: Walking, running, loitering, interactions
- Security concerns: Unauthorized access, suspicious behavior, incidents
- Scene state: Empty hallway, busy area, quiet period

Respond ONLY with valid JSON:
{
  "description": "Overall scene description",
  "events": [
    {
      "description": "Specific event description (e.g., 'Person in blue shirt walking left to right', 'Empty hallway', 'Vehicle parked near entrance')",
      "type": "person" | "vehicle" | "object" | "alert" | "motion",
      "severity": "low" | "medium" | "high"
    }
  ],
  "confidence": 0.0-1.0
}

Rules:
- ALWAYS return at least 1 event in the events array
- If scene is empty/static: {"description": "Empty hallway", "events": [{"description": "No activity detected", "type": "motion", "severity": "low"}], "confidence": 0.8}
- If people visible: type="person", severity based on activity level
- If vehicles visible: type="vehicle"
- If security concern: type="alert", severity="high"
- Be specific in descriptions (colors, directions, actions)`,
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
          maxOutputTokens: 1024, // Increased for detailed event descriptions
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
