/**
 * Gemini Orchestrator Control API
 * Start/stop and control the Gemini orchestrator
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrchestrator } from "@/lib/mcp/gemini-orchestrator"

let orchestrator: ReturnType<typeof getOrchestrator> = null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, apiKey } = body

    switch (action) {
      case "start": {
        if (!apiKey && !process.env.GEMINI_API_KEY) {
          return NextResponse.json(
            { error: "Gemini API key required. Provide apiKey in request body or set GEMINI_API_KEY environment variable." },
            { status: 400 }
          )
        }

        orchestrator = getOrchestrator(apiKey || process.env.GEMINI_API_KEY)

        if (!orchestrator) {
          return NextResponse.json(
            { error: "Failed to initialize orchestrator" },
            { status: 500 }
          )
        }

        const interval = body.interval || 10000
        await orchestrator.start(interval)

        return NextResponse.json({
          success: true,
          message: "Orchestrator started",
          interval,
        })
      }

      case "stop": {
        if (orchestrator) {
          orchestrator.stop()
          orchestrator = null
        }

        return NextResponse.json({
          success: true,
          message: "Orchestrator stopped",
        })
      }

      case "trigger": {
        if (!orchestrator) {
          return NextResponse.json(
            { error: "Orchestrator not running. Start it first." },
            { status: 400 }
          )
        }

        await orchestrator.trigger()

        return NextResponse.json({
          success: true,
          message: "Orchestration triggered",
        })
      }

      case "status": {
        return NextResponse.json({
          running: orchestrator !== null,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    running: orchestrator !== null,
  })
}
