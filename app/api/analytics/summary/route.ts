import { NextRequest, NextResponse } from "next/server"
import { getMongoClient } from "@/lib/db/mongodb"
import type { Incident } from "@/types/lumenta"

export const dynamic = "force-dynamic"

const DATABASE_NAME = process.env.MONGODB_DB || "lumenta"
const COLLECTION_NAME = "detections"

const deriveIncidentType = (incident: Incident) => {
  if (incident.type) return incident.type
  const description = incident.description?.toLowerCase?.() || ""
  if (description.includes("person")) return "person"
  if (description.includes("vehicle") || description.includes("car") || description.includes("truck") || description.includes("bus")) {
    return "vehicle"
  }
  if (description.includes("object") || description.includes("package")) return "object"
  if (description.includes("alert") || description.includes("incident") || description.includes("suspicious")) {
    return "alert"
  }
  return "motion"
}

export async function GET(_request: NextRequest) {
  try {
    const client = await getMongoClient()
    const incidentsCollection = client.db(DATABASE_NAME).collection<Incident>(COLLECTION_NAME)
    const logsCollection = client.db(DATABASE_NAME).collection("detection_logs")

    const now = Date.now()
    const lastHour = new Date(now - 60 * 60 * 1000)
    const lastDay = new Date(now - 24 * 60 * 60 * 1000)

    const [total, open, resolved, hourCount, dayCount, feedIds, recentLogs] = await Promise.all([
      incidentsCollection.countDocuments(),
      incidentsCollection.countDocuments({ status: "open" }),
      incidentsCollection.countDocuments({ status: "resolved" }),
      incidentsCollection.countDocuments({ timestamp: { $gte: lastHour } }),
      incidentsCollection.countDocuments({ timestamp: { $gte: lastDay } }),
      incidentsCollection.distinct("feedId"),
      logsCollection
        .find({ sessionEndTime: { $gte: lastDay } })
        .sort({ sessionEndTime: -1 })
        .limit(100)
        .toArray(),
    ])

    const recent = await incidentsCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray()

    const typeMap = new Map<string, number>()
    recent.forEach((incident) => {
      const type = deriveIncidentType(incident)
      typeMap.set(type, (typeMap.get(type) || 0) + 1)
    })

    const topTypes = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))

    // Calculate detection log statistics
    const totalSessions = recentLogs.length
    const totalDetectionsFromLogs = recentLogs.reduce(
      (sum, log: any) => sum + (log.summary?.totalDetections || 0),
      0
    )
    const totalIncidentsFromLogs = recentLogs.reduce(
      (sum, log: any) => sum + (log.summary?.incidents || 0),
      0
    )
    const totalAlertsFromLogs = recentLogs.reduce(
      (sum, log: any) => sum + (log.summary?.alerts || 0),
      0
    )

    return NextResponse.json({
      total,
      open,
      resolved,
      lastHour: hourCount,
      lastDay: dayCount,
      activeFeeds: feedIds.length,
      topTypes,
      // Detection log statistics
      totalSessions,
      totalDetectionsFromLogs,
      totalIncidentsFromLogs,
      totalAlertsFromLogs,
    })
  } catch (error: any) {
    console.error("Failed to load analytics summary:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load analytics summary" },
      { status: 500 }
    )
  }
}
