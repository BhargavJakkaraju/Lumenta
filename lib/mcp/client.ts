/**
 * MCP Client Utilities
 * Helper functions for frontend to interact with MCP server
 */

import type {
  DetectionResource,
  IdentityMatchResource,
  AudioTranscriptResource,
  VideoSummaryResource,
  ActiveWorkflowResource,
  NodeExecutionTrace,
} from "@/types/mcp"

/**
 * Stream an event to the MCP server
 */
export async function streamEventToMCP(
  type: "detection" | "identity_match" | "transcript" | "summary" | "workflow" | "trace",
  data:
    | DetectionResource
    | IdentityMatchResource
    | AudioTranscriptResource
    | VideoSummaryResource
    | ActiveWorkflowResource
    | NodeExecutionTrace
): Promise<void> {
  try {
    await fetch("/api/mcp/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        data,
      }),
    })
  } catch (error) {
    console.error(`Failed to stream ${type} event to MCP:`, error)
  }
}

/**
 * Stream a detection event
 */
export async function streamDetection(detection: DetectionResource): Promise<void> {
  return streamEventToMCP("detection", detection)
}

/**
 * Stream an identity match event
 */
export async function streamIdentityMatch(match: IdentityMatchResource): Promise<void> {
  return streamEventToMCP("identity_match", match)
}

/**
 * Stream an audio transcript event
 */
export async function streamTranscript(transcript: AudioTranscriptResource): Promise<void> {
  return streamEventToMCP("transcript", transcript)
}

/**
 * Stream a video summary event
 */
export async function streamSummary(summary: VideoSummaryResource): Promise<void> {
  return streamEventToMCP("summary", summary)
}

/**
 * Stream a workflow update event
 */
export async function streamWorkflow(workflow: ActiveWorkflowResource): Promise<void> {
  return streamEventToMCP("workflow", workflow)
}

/**
 * Stream a node execution trace event
 */
export async function streamTrace(trace: NodeExecutionTrace): Promise<void> {
  return streamEventToMCP("trace", trace)
}

/**
 * Read a resource from the MCP server
 */
export async function readResource(uri: string): Promise<any> {
  try {
    const response = await fetch("/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "resources/read",
        params: {
          uri,
        },
      }),
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.result?.contents?.[0]?.text ? JSON.parse(data.result.contents[0].text) : null
  } catch (error) {
    console.error(`Failed to read resource ${uri}:`, error)
    throw error
  }
}

/**
 * Call a tool through the MCP server
 */
export async function callTool(
  toolName: string,
  arguments_: Record<string, any> = {}
): Promise<any> {
  try {
    const response = await fetch("/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: arguments_,
        },
      }),
    })

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.result
  } catch (error) {
    console.error(`Failed to call tool ${toolName}:`, error)
    throw error
  }
}

/**
 * Create an EventSource connection to the MCP event stream
 */
export function createMCPEventSource(
  onEvent: (event: { type: string; data: any; timestamp: string }) => void,
  onError?: (error: Event) => void
): EventSource {
  const eventSource = new EventSource("/api/mcp/events")

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type !== "heartbeat") {
        onEvent(data)
      }
    } catch (error) {
      console.error("Failed to parse MCP event:", error)
    }
  }

  if (onError) {
    eventSource.onerror = onError
  }

  return eventSource
}
