/**
 * Action Node Executor
 * Executes action nodes by using Gemini to parse natural language descriptions
 * and routes to the appropriate MCP service
 */

import { callTool } from "./server"
import type { ActionNodeConfig } from "@/components/nodeGraph/NodeCanvas"
import type { MCPToolCall } from "@/types/mcp"

export interface ActionExecutionResult {
  success: boolean
  message: string
  result?: any
  error?: string
}

/**
 * Execute an action node using Gemini to parse the description and route to MCP
 */
export async function executeActionNode(
  config: ActionNodeConfig,
  geminiApiKey?: string
): Promise<ActionExecutionResult> {
  try {
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    
    if (!apiKey) {
      throw new Error("Gemini API key is required. Set GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable.")
    }

    // Use Gemini to parse the natural language description
    const parsedParams = await parseActionDescription(config, apiKey)

    // Route to the appropriate MCP tool based on the option
    switch (config.option) {
      case "call":
        return await executeCallAction(parsedParams)
      
      case "email":
        return await executeEmailAction(parsedParams)
      
      case "text":
        return await executeTextAction(parsedParams)
      
      default:
        throw new Error(`Unknown action option: ${config.option}`)
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to execute action",
      error: error.message || "Unknown error",
    }
  }
}

/**
 * Use Gemini to parse the natural language description and extract parameters
 */
async function parseActionDescription(
  config: ActionNodeConfig,
  apiKey: string
): Promise<Record<string, any>> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta"

  const prompt = buildParsingPrompt(config)

  try {
    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
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
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            response_mime_type: "application/json",
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    
    // Parse JSON response
    let jsonText = text.trim()
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n")
      jsonText = lines.slice(1, -1).join("\n")
    }
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "")

    const parsed = JSON.parse(jsonText)
    return parsed.parameters || {}
  } catch (error: any) {
    console.error("Failed to parse action description:", error)
    // Return empty params if parsing fails - the MCP tool will handle validation
    return {}
  }
}

/**
 * Build a prompt for Gemini to parse the action description
 */
function buildParsingPrompt(config: ActionNodeConfig): string {
  const actionType = config.option
  const description = config.description || ""

  let prompt = `You are parsing a natural language action description for a ${actionType} action.

Action Type: ${actionType}
Description: "${description}"

Extract the following parameters based on the action type:

`

  switch (actionType) {
    case "call":
      prompt += `For a phone call action, extract:
- to: Phone number to call (must include country code, e.g., +1234567890). Extract from the description.
- message: Optional message or script for the call. If not mentioned, leave empty.

Examples:
- "Call John at +1-555-123-4567" → {"to": "+15551234567"}
- "Call the security team at 408-306-6734 and tell them about the incident" → {"to": "+14083066734", "message": "Tell them about the incident"}
- "Phone call to +1234567890" → {"to": "+1234567890"}
`
      break

    case "email":
      prompt += `For an email action, extract:
- recipientEmail: Email address of the recipient. Extract from the description.
- title: Subject line for the email. If not mentioned, create a relevant title based on the description.
- message: Email body content. Use the description as the message if it's not just an email address.

Examples:
- "Send email to john@example.com" → {"recipientEmail": "john@example.com", "title": "Notification", "message": "Notification from Lumenta"}
- "Email boss@company.com about the incident" → {"recipientEmail": "boss@company.com", "title": "Incident Report", "message": "about the incident"}
- "Notify admin@gmail.com" → {"recipientEmail": "admin@gmail.com", "title": "Notification", "message": "Notification from Lumenta"}
`
      break

    case "text":
      prompt += `For a text message (SMS) action, extract:
- recipientPhone: Phone number to send SMS to (must include country code, e.g., +1234567890). Extract from the description.
- message: The text message content. Use the description as the message if it's not just a phone number.

Examples:
- "Text +1-555-123-4567" → {"recipientPhone": "+15551234567", "message": "Notification from Lumenta"}
- "Send SMS to 408-306-6734 saying alert triggered" → {"recipientPhone": "+14083066734", "message": "alert triggered"}
- "Text message to +1234567890 about the detection" → {"recipientPhone": "+1234567890", "message": "about the detection"}
`
      break
  }

  prompt += `
Return ONLY a JSON object with this structure:
{
  "parameters": {
    // extracted parameters based on action type
  }
}

If you cannot extract a required parameter, use a reasonable default or leave it empty.`
  
  return prompt
}

/**
 * Execute a phone call action
 */
async function executeCallAction(params: Record<string, any>): Promise<ActionExecutionResult> {
  try {
    const phoneNumber = params.to || params.phoneNumber || params.phone
    
    if (!phoneNumber) {
      return {
        success: false,
        message: "Phone number is required for call action",
        error: "Missing 'to' parameter. Please include a phone number in the description (e.g., 'Call +1234567890').",
      }
    }

    // Normalize phone number format
    let normalizedPhone = phoneNumber.trim()
    // Add + if missing and it looks like a phone number
    if (!normalizedPhone.startsWith("+") && /^[\d\s\-\(\)]+$/.test(normalizedPhone)) {
      // Assume US number if no country code
      if (normalizedPhone.length === 10) {
        normalizedPhone = "+1" + normalizedPhone.replace(/\D/g, "")
      } else {
        normalizedPhone = "+" + normalizedPhone.replace(/\D/g, "")
      }
    }

    const toolCall: MCPToolCall = {
      name: "call_phone",
      arguments: {
        to: normalizedPhone,
        message: params.message, // Message/prompt extracted by Gemini
        assistantId: params.assistantId, // Optional, can be configured
      },
    }

    const result = await callTool(toolCall)

    const resultText = result?.content?.[0]?.text
    const parsed = typeof resultText === 'string' ? JSON.parse(resultText) : resultText

    if (parsed.success) {
      return {
        success: true,
        message: `Phone call initiated to ${normalizedPhone}`,
        result: parsed,
      }
    } else {
      return {
        success: false,
        message: "Failed to initiate phone call",
        error: parsed.error || "Unknown error",
        result: parsed,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to execute call action",
      error: error.message || "Unknown error",
    }
  }
}

/**
 * Execute an email action
 */
async function executeEmailAction(params: Record<string, any>): Promise<ActionExecutionResult> {
  try {
    const recipientEmail = params.recipientEmail || params.email || params.to
    
    if (!recipientEmail) {
      return {
        success: false,
        message: "Email address is required for email action",
        error: "Missing recipient email. Please include an email address in the description (e.g., 'Email john@example.com').",
      }
    }

    const title = params.title || params.subject || "Notification from Lumenta"
    const message = params.message || params.body || "Notification from Lumenta"

    const toolCall: MCPToolCall = {
      name: "send_notification",
      arguments: {
        title,
        message,
        channels: ["email"],
        metadata: {
          recipientEmail,
          fromEmail: params.fromEmail, // Optional
        },
      },
    }

    const result = await callTool(toolCall)

    const resultText = result?.content?.[0]?.text
    const parsed = typeof resultText === 'string' ? JSON.parse(resultText) : resultText

    if (parsed.success) {
      return {
        success: true,
        message: `Email sent to ${recipientEmail}`,
        result: parsed,
      }
    } else {
      return {
        success: false,
        message: "Failed to send email",
        error: parsed.results?.email?.error || parsed.error || "Unknown error",
        result: parsed,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to execute email action",
      error: error.message || "Unknown error",
    }
  }
}

/**
 * Execute a text message (SMS) action
 */
async function executeTextAction(params: Record<string, any>): Promise<ActionExecutionResult> {
  try {
    const recipientPhone = params.recipientPhone || params.phone || params.to
    
    if (!recipientPhone) {
      return {
        success: false,
        message: "Phone number is required for text action",
        error: "Missing recipient phone number. Please include a phone number in the description (e.g., 'Text +1234567890').",
      }
    }

    // Normalize phone number format
    let normalizedPhone = recipientPhone.trim()
    if (!normalizedPhone.startsWith("+") && /^[\d\s\-\(\)]+$/.test(normalizedPhone)) {
      if (normalizedPhone.length === 10) {
        normalizedPhone = "+1" + normalizedPhone.replace(/\D/g, "")
      } else {
        normalizedPhone = "+" + normalizedPhone.replace(/\D/g, "")
      }
    }

    const message = params.message || params.text || "Notification from Lumenta"
    const title = params.title || "Lumenta Alert"

    const toolCall: MCPToolCall = {
      name: "send_notification",
      arguments: {
        title,
        message,
        channels: ["sms"],
        metadata: {
          recipientPhone: normalizedPhone,
        },
      },
    }

    const result = await callTool(toolCall)

    const resultText = result?.content?.[0]?.text
    const parsed = typeof resultText === 'string' ? JSON.parse(resultText) : resultText

    if (parsed.success) {
      return {
        success: true,
        message: `Text message sent to ${normalizedPhone}`,
        result: parsed,
      }
    } else {
      return {
        success: false,
        message: "Failed to send text message",
        error: parsed.results?.sms?.error || parsed.error || "Unknown error",
        result: parsed,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Failed to execute text action",
      error: error.message || "Unknown error",
    }
  }
}

