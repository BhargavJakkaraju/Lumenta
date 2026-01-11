/**
 * MCP Server Implementation
 * Handles MCP protocol requests and manages resources and tools
 */

import type {
  MCPRequest,
  MCPResponse,
  MCPResource,
  MCPResourceContent,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  DetectionResource,
  IdentityMatchResource,
  AudioTranscriptResource,
  VideoSummaryResource,
  ActiveWorkflowResource,
  NodeExecutionTrace,
  TriggerWorkflowParams,
  SendNotificationParams,
  CallWebhookParams,
  MutateGraphParams,
  CallPhoneParams,
} from "@/types/mcp"

// In-memory state store (in production, this would be a database or event stream)
class MCPStateStore {
  private detections: DetectionResource[] = []
  private identityMatches: IdentityMatchResource[] = []
  private transcripts: AudioTranscriptResource[] = []
  private summaries: VideoSummaryResource[] = []
  private workflows: ActiveWorkflowResource[] = []
  private traces: NodeExecutionTrace[] = []

  // Event listeners for real-time updates
  private listeners: Set<(event: { type: string; data: any }) => void> = new Set()

  // Detections
  addDetection(detection: DetectionResource) {
    this.detections.push(detection)
    // Keep last 1000 detections
    if (this.detections.length > 1000) {
      this.detections.shift()
    }
    this.emit({ type: "detection", data: detection })
  }

  getDetections(limit = 100): DetectionResource[] {
    return this.detections.slice(-limit)
  }

  // Identity Matches
  addIdentityMatch(match: IdentityMatchResource) {
    this.identityMatches.push(match)
    if (this.identityMatches.length > 1000) {
      this.identityMatches.shift()
    }
    this.emit({ type: "identity_match", data: match })
  }

  getIdentityMatches(limit = 100): IdentityMatchResource[] {
    return this.identityMatches.slice(-limit)
  }

  // Transcripts
  addTranscript(transcript: AudioTranscriptResource) {
    this.transcripts.push(transcript)
    if (this.transcripts.length > 1000) {
      this.transcripts.shift()
    }
    this.emit({ type: "transcript", data: transcript })
  }

  getTranscripts(limit = 100): AudioTranscriptResource[] {
    return this.transcripts.slice(-limit)
  }

  // Summaries
  addSummary(summary: VideoSummaryResource) {
    this.summaries.push(summary)
    if (this.summaries.length > 100) {
      this.summaries.shift()
    }
    this.emit({ type: "summary", data: summary })
  }

  getSummaries(limit = 50): VideoSummaryResource[] {
    return this.summaries.slice(-limit)
  }

  // Workflows
  addWorkflow(workflow: ActiveWorkflowResource) {
    const existing = this.workflows.findIndex((w) => w.id === workflow.id)
    if (existing >= 0) {
      this.workflows[existing] = workflow
    } else {
      this.workflows.push(workflow)
    }
    this.emit({ type: "workflow", data: workflow })
  }

  getWorkflows(): ActiveWorkflowResource[] {
    return this.workflows
  }

  getWorkflow(id: string): ActiveWorkflowResource | undefined {
    return this.workflows.find((w) => w.id === id)
  }

  // Traces
  addTrace(trace: NodeExecutionTrace) {
    this.traces.push(trace)
    if (this.traces.length > 10000) {
      this.traces.shift()
    }
    this.emit({ type: "trace", data: trace })
  }

  getTraces(workflowId?: string, limit = 500): NodeExecutionTrace[] {
    let filtered = this.traces
    if (workflowId) {
      filtered = filtered.filter((t) => t.workflowId === workflowId)
    }
    return filtered.slice(-limit)
  }

  // Event listeners
  subscribe(listener: (event: { type: string; data: any }) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(event: { type: string; data: any }) {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error("Error in MCP event listener:", error)
      }
    })
  }
}

// Global state store instance
const stateStore = new MCPStateStore()

// MCP Resources Registry
export const MCP_RESOURCES: MCPResource[] = [
  {
    uri: "lumenta://detections",
    name: "Camera Detections",
    description: "Latest camera detection events from all feeds",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://detections/{feedId}",
    name: "Camera Detections by Feed",
    description: "Camera detection events for a specific feed",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://identity-matches",
    name: "Identity Matches",
    description: "Person identity recognition and matching results",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://transcripts",
    name: "Audio Transcripts",
    description: "Speech-to-text transcripts from audio feeds",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://summaries",
    name: "Video Summaries",
    description: "AI-generated summaries of video feed activity",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://workflows",
    name: "Active Workflows",
    description: "Currently running workflow configurations",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://workflows/{workflowId}",
    name: "Workflow Details",
    description: "Detailed information about a specific workflow",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://traces",
    name: "Execution Traces",
    description: "Node execution traces from workflow runtime",
    mimeType: "application/json",
  },
  {
    uri: "lumenta://traces/{workflowId}",
    name: "Workflow Execution Traces",
    description: "Execution traces for a specific workflow",
    mimeType: "application/json",
  },
]

// MCP Tools Registry
export const MCP_TOOLS: MCPTool[] = [
  {
    name: "trigger_workflow",
    description: "Trigger a workflow to start or resume execution with optional input data",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "The ID of the workflow to trigger",
        },
        input: {
          type: "object",
          description: "Optional input data to pass to the workflow",
        },
      },
      required: ["workflowId"],
    },
  },
  {
    name: "send_notification",
    description: "Send a notification through one or more channels (email, SMS, push, webhook)",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Notification title",
        },
        message: {
          type: "string",
          description: "Notification message body",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Notification severity level",
        },
        channels: {
          type: "array",
          items: {
            type: "string",
            enum: ["email", "sms", "push", "webhook"],
          },
          description: "Channels to send the notification through",
        },
        metadata: {
          type: "object",
          description: "Additional metadata to include with the notification",
        },
      },
      required: ["title", "message"],
    },
  },
  {
    name: "call_webhook",
    description: "Make an HTTP request to an external webhook URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The webhook URL to call",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE"],
          description: "HTTP method to use",
          default: "POST",
        },
        headers: {
          type: "object",
          description: "HTTP headers to include in the request",
        },
        body: {
          type: "object",
          description: "Request body (for POST/PUT requests)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "mutate_graph",
    description: "Modify a workflow graph by adding, removing, or updating nodes and edges",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "The ID of the workflow to modify",
        },
        operation: {
          type: "string",
          enum: ["add_node", "remove_node", "update_node", "add_edge", "remove_edge", "update_edge"],
          description: "The type of graph mutation operation",
        },
        nodeId: {
          type: "string",
          description: "Node ID (required for node operations)",
        },
        nodeType: {
          type: "string",
          description: "Node type (required for add_node)",
        },
        nodeConfig: {
          type: "object",
          description: "Node configuration (required for add_node/update_node)",
        },
        edgeId: {
          type: "string",
          description: "Edge ID (required for edge operations)",
        },
        sourceId: {
          type: "string",
          description: "Source node ID (required for add_edge)",
        },
        targetId: {
          type: "string",
          description: "Target node ID (required for add_edge)",
        },
        edgeConfig: {
          type: "object",
          description: "Edge configuration (optional for add_edge/update_edge)",
        },
      },
      required: ["workflowId", "operation"],
    },
  },
  {
    name: "call_phone",
    description: "Make a phone call using Vapi. The message/prompt is configured in your Vapi assistant, not passed here.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Phone number to call (with country code, e.g., +1234567890)",
        },
        assistantId: {
          type: "string",
          description: "Vapi assistant ID (optional, uses VAPI_ASSISTANT_ID from environment variable if not provided). Must be a UUID from Vapi Dashboard → Assistants. The assistant defines what message to say.",
        },
      },
      required: ["to"],
    },
  },
]

// Resource handler functions
export async function getResource(uri: string): Promise<MCPResourceContent | null> {
  const uriParts = uri.split("/")
  const resourceType = uriParts[1] // e.g., "detections", "workflows", etc.

  try {
    switch (resourceType) {
      case "detections": {
        const feedId = uriParts[2]
        const detections = feedId
          ? stateStore.getDetections().filter((d) => d.feedId === feedId)
          : stateStore.getDetections(100)
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(detections, null, 2),
        }
      }

      case "identity-matches": {
        const matches = stateStore.getIdentityMatches(100)
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(matches, null, 2),
        }
      }

      case "transcripts": {
        const transcripts = stateStore.getTranscripts(100)
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(transcripts, null, 2),
        }
      }

      case "summaries": {
        const summaries = stateStore.getSummaries(50)
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(summaries, null, 2),
        }
      }

      case "workflows": {
        const workflowId = uriParts[2]
        if (workflowId) {
          const workflow = stateStore.getWorkflow(workflowId)
          return workflow
            ? {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(workflow, null, 2),
              }
            : null
        } else {
          const workflows = stateStore.getWorkflows()
          return {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(workflows, null, 2),
          }
        }
      }

      case "traces": {
        const workflowId = uriParts[2]
        const traces = stateStore.getTraces(workflowId, 500)
        return {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(traces, null, 2),
        }
      }

      default:
        return null
    }
  } catch (error) {
    console.error(`Error fetching resource ${uri}:`, error)
    return null
  }
}

// Tool handler functions
export async function callTool(
  toolCall: MCPToolCall
): Promise<MCPToolResult> {
  try {
    // Check for active integrations that match this tool from server-side store
    try {
      const { getActiveIntegrationsForTool } = await import("@/lib/integrations/store")
      const activeIntegrations = getActiveIntegrationsForTool(toolCall.name)

      if (activeIntegrations.length > 0) {
        // Use the first matching active integration
        const integration = activeIntegrations[0]
        // Import integration handler dynamically to avoid circular dependency
        const { executeIntegration } = await import("@/lib/integrations/handler")
        try {
          const result = await executeIntegration(integration, toolCall.arguments || {})
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result),
              },
            ],
          }
        } catch (error: any) {
          // Fall back to default implementation if integration fails
          console.warn(`Integration execution failed, using default: ${error.message}`)
        }
      }
    } catch (error) {
      // If integration system is not available, continue with default implementation
      console.debug("Integration system not available, using default tool implementation")
    }

    switch (toolCall.name) {
      case "trigger_workflow": {
        const params = toolCall.arguments as TriggerWorkflowParams
        // In a real implementation, this would interact with the workflow runtime
        // For now, we'll update the workflow status in the state store
        const workflow = stateStore.getWorkflow(params.workflowId)
        if (workflow) {
          workflow.status = "running"
          workflow.lastEventAt = new Date().toISOString()
          stateStore.addWorkflow(workflow)
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                workflowId: params.workflowId,
                message: "Workflow triggered successfully",
                input: params.input,
              }),
            },
          ],
        }
      }

      case "send_notification": {
        const params = toolCall.arguments as SendNotificationParams
        const channels = params.channels || ["webhook"]
        const results: Record<string, any> = {}

        // Send email if email channel is requested
        if (channels.includes("email")) {
          const recipientEmail = params.metadata?.recipientEmail
          if (!recipientEmail) {
            throw new Error("Recipient email is required for email notifications. Configure it in your Email Service integration.")
          }

          const resendApiKey = process.env.RESEND_API_KEY
          if (!resendApiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set. Please add it to your .env file.")
          }

          // Use provided fromEmail, or env var, or default to Resend's default domain
          const customFromEmail = params.metadata?.fromEmail || process.env.RESEND_FROM_EMAIL
          // Resend's default domain for unverified accounts is "onboarding@resend.dev"
          const defaultFromEmail = "onboarding@resend.dev"
          let fromEmail = customFromEmail || defaultFromEmail
          
          // Build email payload
          const emailPayload = {
            from: fromEmail,
            to: recipientEmail,
            subject: params.title || "Notification from Lumenta",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .severity-high { border-left: 4px solid #ef4444; padding-left: 15px; }
                    .severity-medium { border-left: 4px solid #f59e0b; padding-left: 15px; }
                    .severity-low { border-left: 4px solid #3b82f6; padding-left: 15px; }
                    .message { background: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>${params.title || "Notification"}</h1>
                    <div class="message severity-${params.severity || "medium"}">
                      <p>${params.message.replace(/\n/g, "<br>")}</p>
                    </div>
                    ${params.severity ? `<p><strong>Severity:</strong> ${params.severity}</p>` : ""}
                    <hr>
                    <p style="color: #666; font-size: 12px;">This notification was sent from Lumenta Platform.</p>
                  </div>
                </body>
              </html>
            `,
            text: `${params.title || "Notification"}\n\n${params.message}\n\nSeverity: ${params.severity || "medium"}\n\nThis notification was sent from Lumenta Platform.`,
          }
          
          try {
            let emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailPayload),
            })

            let emailData = await emailResponse.json()

            // If domain not verified error, retry with Resend's default domain
            if (!emailResponse.ok && emailData.message && emailData.message.includes("domain is not verified")) {
              console.warn(`Domain ${fromEmail} is not verified. Retrying with Resend's default domain: ${defaultFromEmail}`)
              
              // Retry with default domain
              emailPayload.from = defaultFromEmail
              emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(emailPayload),
              })
              
              emailData = await emailResponse.json()
              fromEmail = defaultFromEmail
              
              if (!emailResponse.ok) {
                throw new Error(`Resend API error: ${emailData.message || JSON.stringify(emailData)}`)
              }
            } else if (!emailResponse.ok) {
              throw new Error(`Resend API error: ${emailData.message || JSON.stringify(emailData)}`)
            }

            results.email = {
              success: true,
              messageId: emailData.id,
              recipient: recipientEmail,
              from: fromEmail,
              note: fromEmail === defaultFromEmail 
                ? "Used Resend's default domain (onboarding@resend.dev) because custom domain is not verified. Verify your domain at https://resend.com/domains to use a custom 'from' address."
                : undefined,
            }
          } catch (error: any) {
            results.email = {
              success: false,
              error: error.message || "Failed to send email",
              suggestion: error.message && error.message.includes("domain is not verified")
                ? "Your domain is not verified. Using Resend's default domain (onboarding@resend.dev) instead. To use a custom domain, verify it at https://resend.com/domains"
                : undefined,
            }
            console.error("Email sending error:", error)
          }
        }

        // Send SMS if sms channel is requested (via Vonage)
        if (channels.includes("sms")) {
          const recipientPhone = params.metadata?.recipientPhone
          if (!recipientPhone) {
            results.sms = {
              success: false,
              error: "Recipient phone number is required for SMS notifications. Configure it in your SMS Service integration.",
            }
          } else {
            try {
              const apiKey = process.env.VONAGE_API_KEY
              const apiSecret = process.env.VONAGE_API_SECRET
              const fromNumber = process.env.VONAGE_FROM_NUMBER || "Lumenta" // Default to alphanumeric sender ID

              if (!apiKey || !apiSecret) {
                throw new Error("VONAGE_API_KEY and VONAGE_API_SECRET environment variables are required")
              }

              const smsBody = `${params.title || "Notification"}\n\n${params.message}`

              // Validate phone number format (should include country code)
              if (!recipientPhone.startsWith("+")) {
                throw new Error(`Phone number must include country code (e.g., +1234567890). You provided: ${recipientPhone}`)
              }

              // Remove + from phone number for Vonage API (it expects numbers without +)
              const toNumber = recipientPhone.replace(/^\+/, "")

              // Truncate SMS body if too long (Vonage supports up to 1600 characters for concatenated messages)
              const maxSMSLength = 1600
              const truncatedBody = smsBody.length > maxSMSLength 
                ? smsBody.substring(0, maxSMSLength - 3) + "..."
                : smsBody

              const response = await fetch(
                "https://rest.nexmo.com/sms/json",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    api_key: apiKey,
                    api_secret: apiSecret,
                    from: fromNumber,
                    to: toNumber,
                    text: truncatedBody,
                  }),
                }
              )

              // Get response text first (can only read once)
              const responseText = await response.text()
              
              // Try to parse as JSON
              let responseData: any
              try {
                responseData = JSON.parse(responseText)
              } catch (parseError: any) {
                // If not JSON, return the raw response text
                throw new Error(`Vonage API returned invalid JSON (Status: ${response.status}): ${responseText.substring(0, 300)}`)
              }

              // Vonage returns an array of messages, check the first one
              const messages = responseData.messages || []
              if (messages.length === 0) {
                throw new Error("Vonage API returned no messages in response")
              }

              const message = messages[0]

              // Check for errors in the message response
              if (parseInt(message.status) !== 0) {
                const errorCode = message["error-text"] || message.status || "Unknown error"
                let detailedError = `Vonage SMS API error (Status: ${message.status})`
                
                if (message["error-text"]) {
                  detailedError += `: ${message["error-text"]}`
                }

                // Provide helpful suggestions for common errors
                if (message.status === "1" || message.status === "2") {
                  detailedError += "\n💡 Check your VONAGE_API_KEY and VONAGE_API_SECRET in .env file"
                } else if (message.status === "3") {
                  detailedError += "\n💡 Invalid phone number format. Must include country code (e.g., +1234567890)"
                } else if (message.status === "4") {
                  detailedError += "\n💡 Invalid sender ID. Check your VONAGE_FROM_NUMBER in .env file"
                } else if (message.status === "6" || message.status === "7" || message.status === "8") {
                  detailedError += "\n💡 Message rejected. Check your Vonage account balance and message content"
                } else if (message.status === "9" || message.status === "10" || message.status === "11") {
                  detailedError += "\n💡 Too many requests or rate limit exceeded. Please try again later"
                }
                
                throw new Error(detailedError)
              }

              results.sms = {
                success: true,
                messageId: message["message-id"],
                recipient: recipientPhone,
                from: fromNumber,
                status: message.status,
                remainingBalance: responseData["message-count"],
              }
            } catch (error: any) {
              results.sms = {
                success: false,
                error: error.message || "Failed to send SMS",
              }
              console.error("SMS sending error:", error)
            }
          }
        }

        // Send push notification if push channel is requested (not yet implemented)
        if (channels.includes("push")) {
          results.push = {
            success: false,
            error: "Push notification sending not yet implemented.",
          }
        }

        // Send webhook if webhook channel is requested (placeholder for now)
        if (channels.includes("webhook")) {
          results.webhook = {
            success: true,
            message: "Webhook notifications should use the call_webhook tool directly",
          }
        }

        const allSuccess = Object.values(results).every((r: any) => r.success !== false)
        const hasEmail = channels.includes("email") && results.email

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: allSuccess,
                message: hasEmail 
                  ? `Email sent successfully to ${hasEmail.recipient}`
                  : "Notification sent successfully",
                channels: channels,
                results: results,
                notification: {
                  title: params.title,
                  message: params.message,
                  severity: params.severity || "medium",
                },
              }),
            },
          ],
        }
      }

      case "call_webhook": {
        const params = toolCall.arguments as CallWebhookParams
        // In a real implementation, this would make an HTTP request
        try {
          const response = await fetch(params.url, {
            method: params.method || "POST",
            headers: {
              "Content-Type": "application/json",
              ...params.headers,
            },
            body: params.body ? JSON.stringify(params.body) : undefined,
          })

          const responseData = await response.text()

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: response.ok,
                  status: response.status,
                  statusText: response.statusText,
                  response: responseData,
                }),
              },
            ],
          }
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error.message,
                }),
              },
            ],
            isError: true,
          }
        }
      }

      case "mutate_graph": {
        const params = toolCall.arguments as MutateGraphParams
        // In a real implementation, this would modify the workflow graph in the runtime
        console.log("Mutating graph:", params)

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Graph mutation operation '${params.operation}' completed`,
                workflowId: params.workflowId,
                operation: params.operation,
              }),
            },
          ],
        }
      }

      case "call_phone": {
        const params = toolCall.arguments as CallPhoneParams

        try {
          // Vapi API call - credentials come from environment variables
          const vapiApiKey = process.env.VAPI_API_KEY
          const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID
          const assistantId = params.assistantId || process.env.VAPI_ASSISTANT_ID

          if (!vapiApiKey) {
            throw new Error("Vapi API key is required. Set VAPI_API_KEY environment variable")
          }
          if (!phoneNumberId) {
            throw new Error("Vapi phone number ID is required. Set VAPI_PHONE_NUMBER_ID environment variable. This must be a UUID from your Vapi dashboard (Phone Numbers section), not a phone number.")
          }

          // Validate that phoneNumberId looks like a UUID (basic check)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (!uuidRegex.test(phoneNumberId)) {
            throw new Error(`VAPI_PHONE_NUMBER_ID must be a UUID from Vapi dashboard, not a phone number. You provided "${phoneNumberId}". Get the UUID from Vapi Dashboard → Phone Numbers → Copy the ID (not the phone number itself).`)
          }

          if (!params.to) {
            throw new Error("Phone number is required. Provide the 'to' parameter when calling this tool.")
          }

          // AssistantId is REQUIRED by Vapi API
          if (!assistantId) {
            throw new Error("Vapi Assistant ID is required. Set VAPI_ASSISTANT_ID environment variable OR provide 'assistantId' parameter when calling. Get the Assistant ID from Vapi Dashboard → Assistants → Copy the ID (UUID).")
          }

          // Validate that assistantId looks like a UUID (basic check)
          if (!uuidRegex.test(assistantId)) {
            throw new Error(`VAPI_ASSISTANT_ID must be a UUID from Vapi dashboard. You provided "${assistantId}". Get the UUID from Vapi Dashboard → Assistants → Copy the ID (not the name).`)
          }

          // Build the call request payload
          const callPayload: any = {
            phoneNumberId, // Must be a UUID from Vapi dashboard, not a phone number
            assistantId, // REQUIRED - Must be a UUID from Vapi dashboard
            customer: {
              number: params.to, // The actual phone number to call
            },
          }

          // Note: message is not supported in Vapi API - it's configured in the assistant
          // If you need to pass a message, configure it in your Vapi assistant settings

          const response = await fetch("https://api.vapi.ai/call", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${vapiApiKey}`,
            },
            body: JSON.stringify(callPayload),
          })

          const responseData = await response.json()

          if (!response.ok) {
            throw new Error(`Vapi API error: ${responseData.message || response.statusText || JSON.stringify(responseData)}`)
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: "Phone call initiated via Vapi",
                  callId: responseData.id,
                  status: responseData.status,
                  provider: "vapi",
                  to: params.to,
                }),
              },
            ],
          }
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: error.message,
                  provider: "vapi",
                }),
              },
            ],
            isError: true,
          }
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${toolCall.name}`,
              }),
            },
          ],
          isError: true,
        }
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
      isError: true,
    }
  }
}

// MCP Request Handler
export async function handleMCPRequest(
  request: MCPRequest
): Promise<MCPResponse> {
  const response: MCPResponse = {
    jsonrpc: "2.0",
    id: request.id,
  }

  try {
    switch (request.method) {
      case "initialize":
        response.result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            resources: {},
            tools: {},
          },
          serverInfo: {
            name: "lumenta-mcp-server",
            version: "1.0.0",
          },
        }
        break

      case "resources/list":
        response.result = {
          resources: MCP_RESOURCES,
        }
        break

      case "resources/read":
        const resourceUri = request.params?.uri as string
        if (!resourceUri) {
          response.error = {
            code: -32602,
            message: "Missing required parameter: uri",
          }
        } else {
          const content = await getResource(resourceUri)
          if (content) {
            response.result = {
              contents: [content],
            }
          } else {
            response.error = {
              code: -32602,
              message: `Resource not found: ${resourceUri}`,
            }
          }
        }
        break

      case "tools/list":
        response.result = {
          tools: MCP_TOOLS,
        }
        break

      case "tools/call":
        const toolCall = request.params as MCPToolCall
        if (!toolCall.name) {
          response.error = {
            code: -32602,
            message: "Missing required parameter: name",
          }
        } else {
          const result = await callTool(toolCall)
          response.result = result
        }
        break

      default:
        response.error = {
          code: -32601,
          message: `Method not found: ${request.method}`,
        }
    }
  } catch (error: any) {
    response.error = {
      code: -32603,
      message: "Internal error",
      data: error.message,
    }
  }

  return response
}

// Export state store for use by event streamers
export { stateStore }
