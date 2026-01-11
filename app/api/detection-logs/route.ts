import { NextRequest, NextResponse } from "next/server"
import { getMongoClient } from "@/lib/db/mongodb"
import type { DetectionLog } from "@/types/lumenta"

export const dynamic = "force-dynamic"

const DATABASE_NAME = process.env.MONGODB_DB || "lumenta"
const COLLECTION_NAME = "detection_logs"

const toSerializableLog = (log: DetectionLog) => ({
  ...log,
  sessionStartTime: log.sessionStartTime instanceof Date
    ? log.sessionStartTime.toISOString()
    : new Date(log.sessionStartTime).toISOString(),
  sessionEndTime: log.sessionEndTime instanceof Date
    ? log.sessionEndTime.toISOString()
    : new Date(log.sessionEndTime).toISOString(),
  createdAt: log.createdAt instanceof Date
    ? log.createdAt.toISOString()
    : new Date(log.createdAt).toISOString(),
  incidents: log.incidents.map((incident) => ({
    ...incident,
    timestamp: incident.timestamp instanceof Date
      ? incident.timestamp.toISOString()
      : new Date(incident.timestamp).toISOString(),
  })),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedId = searchParams.get("feedId")
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      500
    )

    const client = await getMongoClient()
    const collection = client.db(DATABASE_NAME).collection<DetectionLog>(COLLECTION_NAME)

    const query = feedId ? { feedId } : {}
    const items = await collection
      .find(query)
      .sort({ sessionEndTime: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      items: items.map((log) => toSerializableLog(log)),
    })
  } catch (error: any) {
    console.error("Failed to fetch detection logs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch detection logs" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<DetectionLog>

    if (!payload?.feedId || !payload?.feedName || !payload?.sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: feedId, feedName, sessionId" },
        { status: 400 }
      )
    }

    const sessionStartTime = payload.sessionStartTime
      ? new Date(payload.sessionStartTime)
      : new Date()
    const sessionEndTime = payload.sessionEndTime
      ? new Date(payload.sessionEndTime)
      : new Date()

    if (Number.isNaN(sessionStartTime.getTime()) || Number.isNaN(sessionEndTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid session start or end time" },
        { status: 400 }
      )
    }

    const detectionLog: DetectionLog = {
      id: payload.id || crypto.randomUUID(),
      feedId: payload.feedId,
      feedName: payload.feedName,
      sessionId: payload.sessionId,
      sessionStartTime,
      sessionEndTime,
      duration: payload.duration ?? (sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000,
      summary: payload.summary || {
        totalDetections: 0,
        objectDetections: {
          person: 0,
          vehicle: 0,
          object: 0,
          alert: 0,
          motion: 0,
        },
        incidents: 0,
        alerts: 0,
        averageConfidence: 0,
        maxConfidence: 0,
      },
      events: payload.events || [],
      incidents: payload.incidents || [],
      createdAt: new Date(),
    }

    const client = await getMongoClient()
    const collection = client.db(DATABASE_NAME).collection<DetectionLog>(COLLECTION_NAME)
    
    // Check if a log already exists for this sessionId to prevent duplicates
    const existingLog = await collection.findOne({ sessionId: detectionLog.sessionId })
    if (existingLog) {
      return NextResponse.json(
        { success: false, error: "Detection log already exists for this session", id: existingLog.id },
        { status: 409 } // Conflict status
      )
    }

    await collection.insertOne(detectionLog)

    return NextResponse.json({ success: true, id: detectionLog.id })
  } catch (error: any) {
    console.error("Failed to save detection log:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save detection log" },
      { status: 500 }
    )
  }
}

