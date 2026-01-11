/**
 * Gemini Orchestrator
 * Uses Gemini API to reason about the environment and decide on actions
 */

import { handleMCPRequest, MCP_RESOURCES, MCP_TOOLS, stateStore } from "./server"
import type { MCPToolCall, MCPResourceContent } from "@/types/mcp"

export interface GeminiOrchestratorConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class GeminiOrchestrator {
  private config: Required<GeminiOrchestratorConfig>
  private isRunning = false
  private orchestrationInterval?: NodeJS.Timeout

  constructor(config: GeminiOrchestratorConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || "gemini-2.0-flash-exp",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 8192,
    }
  }

  /**
   * Start the orchestration loop
   * Periodically reads resources, reasons about state, and invokes tools
   */
  async start(intervalMs = 10000) {
    if (this.isRunning) {
      console.warn("Orchestrator is already running")
      return
    }

    this.isRunning = true
    console.log("Starting Gemini orchestrator...")

    // Initial orchestration
    await this.orchestrate()

    // Set up periodic orchestration
    this.orchestrationInterval = setInterval(() => {
      this.orchestrate().catch((error) => {
        console.error("Orchestration error:", error)
      })
    }, intervalMs)
  }

  /**
   * Stop the orchestration loop
   */
  stop() {
    this.isRunning = false
    if (this.orchestrationInterval) {
      clearInterval(this.orchestrationInterval)
      this.orchestrationInterval = undefined
    }
    console.log("Gemini orchestrator stopped")
  }

  /**
   * Main orchestration logic:
   * 1. Read current resources (detections, workflows, traces)
   * 2. Send context to Gemini with available tools
   * 3. Get Gemini's reasoning and tool calls
   * 4. Execute tool calls through MCP
   */
  private async orchestrate() {
    try {
      // 1. Gather current state (resources)
      const resources = await this.gatherResources()

      // 2. Build context prompt for Gemini
      const prompt = this.buildOrchestrationPrompt(resources)

      // 3. Call Gemini API
      const response = await this.callGemini(prompt)

      // 4. Parse response and execute tool calls
      await this.executeToolCalls(response)
    } catch (error) {
      console.error("Orchestration failed:", error)
    }
  }

  /**
   * Gather current resources from MCP state store
   */
  private async gatherResources(): Promise<Record<string, any>> {
    const detections = stateStore.getDetections(50) // Last 50 detections
    const workflows = stateStore.getWorkflows()
    const recentTraces = stateStore.getTraces(undefined, 100) // Last 100 traces

    return {
      detections: detections.slice(-10), // Most recent 10
      workflows,
      recentTraces: recentTraces.slice(-20), // Most recent 20
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Build prompt that gives Gemini context about the environment and available tools
   */
  private buildOrchestrationPrompt(resources: Record<string, any>): string {
    const availableTools = MCP_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema.properties,
      required: tool.inputSchema.required || [],
    }))

    return `You are an autonomous orchestration agent for Lumenta, a smart environment orchestration platform. Your role is to observe the physical world through camera detections, audio transcripts, and video summaries, understand what is happening, and take actions by calling available tools.

Current System State:
${JSON.stringify(resources, null, 2)}

Available Tools:
${JSON.stringify(availableTools, null, 2)}

Your Responsibilities:
1. Analyze recent detections, workflows, and execution traces
2. Identify situations that require action based on workflow intents
3. Decide which tools to call and with what parameters
4. Act autonomously to enforce the configured intents

Important Guidelines:
- Only call tools when there's a clear reason based on the current state
- Consider workflow configurations and their intended behaviors
- For detections with high severity, consider triggering workflows or sending notifications
- When workflows are paused or stopped but should be running, trigger them
- Use send_notification for important alerts or incidents
- Use mutate_graph sparingly and only when workflows need to adapt to new patterns

Respond with a JSON object in this format:
{
  "reasoning": "Your analysis of the current state and what actions are needed",
  "toolCalls": [
    {
      "name": "tool_name",
      "arguments": { ... }
    }
  ]
}

If no actions are needed, return an empty toolCalls array.`
  }

  /**
   * Call Gemini API with the orchestration prompt
   */
  private async callGemini(prompt: string): Promise<string> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error("No response text from Gemini API")
      }

      return text
    } catch (error: any) {
      console.error("Gemini API call failed:", error)
      throw error
    }
  }

  /**
   * Parse Gemini response and execute tool calls
   */
  private async executeToolCalls(responseText: string) {
    try {
      // Try to extract JSON from the response (Gemini might add markdown formatting)
      let jsonText = responseText.trim()
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith("```")) {
        const lines = jsonText.split("\n")
        jsonText = lines.slice(1, -1).join("\n")
      }
      
      // Remove markdown language identifier
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "")

      const parsed = JSON.parse(jsonText)

      if (!parsed.toolCalls || !Array.isArray(parsed.toolCalls)) {
        console.log("No tool calls in Gemini response:", parsed.reasoning || "No reasoning provided")
        return
      }

      console.log("Gemini reasoning:", parsed.reasoning)

      // Execute each tool call through MCP
      for (const toolCallData of parsed.toolCalls) {
        try {
          const toolCall: MCPToolCall = {
            name: toolCallData.name,
            arguments: toolCallData.arguments || {},
          }

          // Call tool through MCP handler
          const mcpRequest = {
            jsonrpc: "2.0" as const,
            id: Date.now().toString(),
            method: "tools/call",
            params: toolCall,
          }

          const result = await handleMCPRequest(mcpRequest)

          if (result.error) {
            console.error(`Tool call ${toolCall.name} failed:`, result.error)
          } else {
            console.log(`Tool call ${toolCall.name} succeeded:`, result.result)
          }
        } catch (error: any) {
          console.error(`Error executing tool call ${toolCallData.name}:`, error.message)
        }
      }
    } catch (error: any) {
      console.error("Failed to parse Gemini response:", error.message)
      console.log("Raw response:", responseText)
    }
  }

  /**
   * Manual orchestration trigger (useful for testing or on-demand execution)
   */
  async trigger() {
    if (!this.isRunning) {
      await this.orchestrate()
    }
  }
}

// Singleton instance (initialized with API key from environment)
let orchestratorInstance: GeminiOrchestrator | null = null

export function getOrchestrator(apiKey?: string): GeminiOrchestrator | null {
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY
  }

  if (!apiKey) {
    console.warn("Gemini API key not configured. Orchestrator will not function.")
    return null
  }

  if (!orchestratorInstance) {
    orchestratorInstance = new GeminiOrchestrator({
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || "0.7"),
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "8192"),
    })
  }

  return orchestratorInstance
}
