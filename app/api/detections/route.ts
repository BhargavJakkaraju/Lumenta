import { NextRequest, NextResponse } from "next/server"
import { getMongoClient } from "@/lib/db/mongodb"
import type { Incident } from "@/types/lumenta"

export const dynamic = "force-dynamic"

const DATABASE_NAME = process.env.MONGODB_DB || "lumenta"
const COLLECTION_NAME = "detections"

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value || "", 10)
  if (Number.isNaN(parsed)) return 200
  return Math.min(Math.max(parsed, 1), 1000)
}

const toSerializableIncident = (incident: Incident) => ({
  ...incident,
  timestamp:
    incident.timestamp instanceof Date
      ? incident.timestamp.toISOString()
      : new Date(incident.timestamp).toISOString(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get("limit"))
    const feedId = searchParams.get("feedId")

    const client = await getMongoClient()
    const collection = client.db(DATABASE_NAME).collection<Incident>(COLLECTION_NAME)

    const query = feedId ? { feedId } : {}
    const items = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      items: items.map((incident) => toSerializableIncident(incident)),
    })
  } catch (error: any) {
    console.error("Failed to fetch detections:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch detections" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Partial<Incident>

    if (!payload?.feedId || !payload?.feedName || !payload?.description) {
      return NextResponse.json(
        { error: "Missing required detection fields." },
        { status: 400 }
      )
    }

    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date()
    if (Number.isNaN(timestamp.getTime())) {
      return NextResponse.json(
        { error: "Invalid timestamp." },
        { status: 400 }
      )
    }

    const incident: Incident = {
      id: payload.id || crypto.randomUUID(),
      feedId: payload.feedId,
      feedName: payload.feedName,
      type: payload.type,
      severity: payload.severity || "low",
      timestamp,
      confidence: payload.confidence ?? 0,
      description: payload.description,
      status: payload.status || "open",
      notes: payload.notes,
    }

    const client = await getMongoClient()
    const collection = client.db(DATABASE_NAME).collection<Incident>(COLLECTION_NAME)
    await collection.insertOne(incident)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to save detection:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save detection" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedId = searchParams.get("feedId")

    const client = await getMongoClient()
    const collection = client.db(DATABASE_NAME).collection<Incident>(COLLECTION_NAME)

    const query = feedId ? { feedId } : {}
    const result = await collection.deleteMany(query)

    return NextResponse.json({ deletedCount: result.deletedCount })
  } catch (error: any) {
    console.error("Failed to clear detections:", error)
    return NextResponse.json(
      { error: error.message || "Failed to clear detections" },
      { status: 500 }
    )
  }
}
