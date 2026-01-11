/**
 * MCP Integrations API
 * Sync integrations from client to server so they can be used by tools
 */

import { NextRequest, NextResponse } from "next/server"
import type { Integration } from "@/types/integrations"
import {
  syncIntegrations,
  getAllIntegrations,
} from "@/lib/integrations/store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, integrations } = body

    if (action === "sync") {
      // Sync all integrations from client
      if (Array.isArray(integrations)) {
        syncIntegrations(integrations)
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${integrations?.length || 0} integrations`,
      })
    } else if (action === "get") {
      // Get all integrations
      return NextResponse.json({
        success: true,
        integrations: getAllIntegrations(),
      })
    } else {
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
    success: true,
    integrations: getAllIntegrations(),
  })
}
