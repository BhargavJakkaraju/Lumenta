/**
 * Model Context Protocol (MCP) Types
 * Based on the MCP specification for exposing resources and tools to AI agents
 */

// MCP Protocol Messages
export interface MCPRequest {
  jsonrpc: "2.0"
  id: string | number | null
  method: string
  params?: Record<string, any>
}

export interface MCPResponse {
  jsonrpc: "2.0"
  id: string | number | null
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

// MCP Resources - Read-only state that Gemini can inspect
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string // base64 encoded
}

// MCP Tools - Callable capabilities that Gemini can invoke
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPToolCall {
  name: string
  arguments?: Record<string, any>
}

export interface MCPToolResult {
  content: Array<{
    type: "text" | "resource"
    text?: string
    resource?: string
  }>
  isError?: boolean
}

// Lumenta-specific Resource Types
export interface DetectionResource {
  id: string
  timestamp: string
  feedId: string
  feedName: string
  type: "person" | "vehicle" | "motion" | "object" | "alert"
  boxes: Array<{
    x: number
    y: number
    width: number
    height: number
  }>
  labels: string[]
  confidences: number[]
  description: string
  severity: "low" | "medium" | "high"
}

export interface IdentityMatchResource {
  id: string
  timestamp: string
  feedId: string
  detectedPersonId: string
  matchedIdentityId?: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface AudioTranscriptResource {
  id: string
  timestamp: string
  feedId: string
  startTime: number
  endTime: number
  transcript: string
  confidence: number
  language?: string
}

export interface VideoSummaryResource {
  id: string
  timestamp: string
  feedId: string
  summaryPeriod: {
    start: string
    end: string
  }
  summary: string
  keyMoments: Array<{
    timestamp: number
    description: string
    confidence: number
  }>
}

export interface ActiveWorkflowResource {
  id: string
  name: string
  status: "running" | "paused" | "stopped"
  startedAt: string
  lastEventAt?: string
  nodeCount: number
  config: Record<string, any>
}

export interface NodeExecutionTrace {
  id: string
  workflowId: string
  nodeId: string
  nodeType: string
  timestamp: string
  status: "started" | "finished" | "error"
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  duration?: number
}

// Lumenta-specific Tool Parameters
export interface TriggerWorkflowParams {
  workflowId: string
  input?: Record<string, any>
}

export interface SendNotificationParams {
  title: string
  message: string
  severity?: "low" | "medium" | "high"
  channels?: ("email" | "sms" | "push" | "webhook")[]
  metadata?: Record<string, any>
}

export interface CallWebhookParams {
  url: string
  method?: "GET" | "POST" | "PUT" | "DELETE"
  headers?: Record<string, string>
  body?: Record<string, any>
}

export interface MutateGraphParams {
  workflowId: string
  operation: "add_node" | "remove_node" | "update_node" | "add_edge" | "remove_edge" | "update_edge"
  nodeId?: string
  edgeId?: string
  nodeType?: string
  nodeConfig?: Record<string, any>
  sourceId?: string
  targetId?: string
  edgeConfig?: Record<string, any>
}

export interface CallPhoneParams {
  to: string
  message?: string
  assistantId?: string
  provider?: "vapi" // Only Vapi is supported for phone calls
  [key: string]: any // Additional provider-specific params
}
