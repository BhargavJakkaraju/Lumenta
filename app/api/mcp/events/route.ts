/**
 * MCP Events Stream API
 * Server-Sent Events (SSE) endpoint for real-time event streaming
 */

import { NextRequest } from "next/server"
import { stateStore } from "@/lib/mcp/server"

export async function GET(request: NextRequest) {
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      send(
        JSON.stringify({
          type: "connected",
          message: "Connected to Lumenta MCP event stream",
          timestamp: new Date().toISOString(),
        })
      )

      // Subscribe to state store events
      const unsubscribe = stateStore.subscribe((event) => {
        try {
          send(
            JSON.stringify({
              type: event.type,
              data: event.data,
              timestamp: new Date().toISOString(),
            })
          )
        } catch (error) {
          console.error("Error sending event:", error)
        }
      })

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          send(
            JSON.stringify({
              type: "heartbeat",
              timestamp: new Date().toISOString(),
            })
          )
        } catch (error) {
          clearInterval(heartbeat)
          unsubscribe()
          controller.close()
        }
      }, 30000) // Every 30 seconds

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribe()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in nginx
    },
  })
}
