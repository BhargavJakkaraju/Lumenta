/**
 * MCP Event Ingestion API
 * Receives events and traces from the frontend workflow runtime
 */

import { NextRequest, NextResponse } from "next/server"
import { stateStore } from "@/lib/mcp/server"
import type {
  DetectionResource,
  IdentityMatchResource,
  AudioTranscriptResource,
  VideoSummaryResource,
  ActiveWorkflowResource,
  NodeExecutionTrace,
} from "@/types/mcp"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json(
        { error: "Missing required fields: type and data" },
        { status: 400 }
      )
    }

    switch (type) {
      case "detection": {
        const detection = data as DetectionResource
        stateStore.addDetection(detection)
        break
      }

      case "identity_match": {
        const match = data as IdentityMatchResource
        stateStore.addIdentityMatch(match)
        break
      }

      case "transcript": {
        const transcript = data as AudioTranscriptResource
        stateStore.addTranscript(transcript)
        break
      }

      case "summary": {
        const summary = data as VideoSummaryResource
        stateStore.addSummary(summary)
        break
      }

      case "workflow": {
        const workflow = data as ActiveWorkflowResource
        stateStore.addWorkflow(workflow)
        break
      }

      case "trace": {
        const trace = data as NodeExecutionTrace
        stateStore.addTrace(trace)
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Event type '${type}' ingested successfully`,
    })
  } catch (error: any) {
    console.error("Error ingesting event:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
