/**
 * Action Node Execution API
 * Executes action nodes by parsing natural language descriptions with Gemini
 * and routing to the appropriate MCP service
 */

import { NextRequest, NextResponse } from "next/server"
import { executeActionNode } from "@/lib/mcp/action-node-executor"
import type { ActionNodeConfig } from "@/components/nodeGraph/NodeCanvas"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config, geminiApiKey } = body

    if (!config) {
      return NextResponse.json(
        { error: "Action node config is required" },
        { status: 400 }
      )
    }

    if (!config.option || !["call", "email", "text"].includes(config.option)) {
      return NextResponse.json(
        { error: "Invalid action option. Must be 'call', 'email', or 'text'" },
        { status: 400 }
      )
    }

    const actionConfig: ActionNodeConfig = {
      option: config.option,
      description: config.description || "",
    }

    const result = await executeActionNode(actionConfig, geminiApiKey)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to execute action",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

