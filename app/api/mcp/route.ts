/**
 * MCP API Route Handler
 * Handles HTTP requests for MCP protocol operations
 */

import { NextRequest, NextResponse } from "next/server"
import { handleMCPRequest } from "@/lib/mcp/server"
import type { MCPRequest } from "@/types/mcp"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate JSON-RPC request format
    if (body.jsonrpc !== "2.0" || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: body.id || null,
          error: {
            code: -32600,
            message: "Invalid Request",
          },
        },
        { status: 400 }
      )
    }

    const mcpRequest: MCPRequest = body

    // Handle the MCP request
    const response = await handleMCPRequest(mcpRequest)

    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
          data: error.message,
        },
      },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Lumenta MCP Server",
    version: "1.0.0",
    protocol: "MCP",
    capabilities: {
      resources: true,
      tools: true,
    },
  })
}
