/**
 * Integration Handler
 * Connects user-friendly integrations to MCP tools
 */

import { callTool } from "@/lib/mcp/client"
import type { Integration } from "@/types/integrations"
import type {
  TriggerWorkflowParams,
  SendNotificationParams,
  CallWebhookParams,
  CallPhoneParams,
} from "@/types/mcp"

/**
 * Execute an integration by calling its associated MCP tool
 */
export async function executeIntegration(
  integration: Integration,
  params: Record<string, any>
): Promise<any> {
  if (integration.status !== "active") {
    throw new Error(`Integration ${integration.name} is not active`)
  }

  if (!integration.toolName) {
    throw new Error(`Integration ${integration.name} has no associated tool`)
  }

  // Merge integration config with provided params
  const mergedParams = {
    ...integration.config,
    ...params,
  }

  switch (integration.toolName) {
    case "send_notification": {
      const notificationParams: SendNotificationParams = {
        title: mergedParams.title || params.title || "Notification",
        message: mergedParams.message || params.message || "",
        severity: mergedParams.severity || params.severity || "medium",
        channels: mergedParams.channels || params.channels || ["webhook"],
        metadata: {
          ...mergedParams.metadata,
          integrationId: integration.id,
          integrationName: integration.name,
        },
      }

      // Map integration-specific config to notification channels
      if (integration.id.startsWith("email-service-")) {
        notificationParams.channels = ["email"]
        // User's email from config is used as recipient
        notificationParams.metadata = {
          ...notificationParams.metadata,
          recipientEmail: mergedParams.email,
          fromEmail: mergedParams.fromEmail, // Optional custom from email
        }
        return await callTool("send_notification", notificationParams)
      } else if (integration.id.startsWith("slack-")) {
        notificationParams.channels = ["webhook"]
        // Slack webhook format
        if (mergedParams.webhookUrl) {
          return await callTool("call_webhook", {
            url: mergedParams.webhookUrl,
            method: "POST",
            body: {
              text: notificationParams.message,
              channel: mergedParams.channel,
            },
          } as CallWebhookParams)
        }
        return await callTool("send_notification", notificationParams)
      } else if (integration.id.startsWith("discord-")) {
        const mode = mergedParams.mode || "webhook"
        
        // Discord webhook mode (for channels/groups only)
        if (mode === "webhook" && mergedParams.webhookUrl) {
          notificationParams.channels = ["webhook"]
          // Discord webhooks support embeds for rich formatting
          const severityColors: Record<string, number> = {
            low: 3447003,    // Blue
            medium: 15844367, // Gold
            high: 15158332,  // Red
          }
          const color = severityColors[notificationParams.severity || "medium"] || 3447003

          return await callTool("call_webhook", {
            url: mergedParams.webhookUrl,
            method: "POST",
            body: {
              content: notificationParams.message,
              username: mergedParams.username || "Lumenta Bot",
              embeds: [
                {
                  title: notificationParams.title || "Notification",
                  description: notificationParams.message,
                  color: color,
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          } as CallWebhookParams)
        }
        
        // Discord bot mode (for DMs and channels)
        // Note: Bot mode will be fully implemented when Discord Bot API tool is added
        // For now, configuration is stored and Gemini can use it later
        if (mode === "bot") {
          // Get recipients from params or config
          const recipientUserIds = params.metadata?.recipientUserIds || mergedParams.recipientUserIds
          const channelId = params.metadata?.channelId || mergedParams.defaultChannelId || mergedParams.channelId
          
          // Store configuration in metadata for Gemini to use
          notificationParams.metadata = {
            ...notificationParams.metadata,
            discordMode: "bot",
            botToken: mergedParams.botToken || process.env.DISCORD_BOT_TOKEN,
            recipientUserIds: recipientUserIds ? recipientUserIds.split(',').map((id: string) => id.trim()) : [],
            channelId: channelId,
            username: mergedParams.username || "Lumenta Bot",
          }
          
          // For now, return notification params - Gemini will handle sending via Discord Bot API
          return await callTool("send_notification", notificationParams)
        }
        
        return await callTool("send_notification", notificationParams)
      } else if (integration.id.startsWith("sms-")) {
        notificationParams.channels = ["sms"]
        // User's phone number from config is used as recipient
        notificationParams.metadata = {
          ...notificationParams.metadata,
          recipientPhone: mergedParams.phoneNumber,
        }
        return await callTool("send_notification", notificationParams)
      } else if (integration.id.startsWith("push-notification-")) {
        notificationParams.channels = ["push"]
        // User's device token from config is used
        notificationParams.metadata = {
          ...notificationParams.metadata,
          deviceToken: mergedParams.deviceToken,
        }
        return await callTool("send_notification", notificationParams)
      }

      return await callTool("send_notification", notificationParams)
    }

    case "call_webhook": {
      const webhookParams: CallWebhookParams = {
        url: mergedParams.url || params.url,
        method: (mergedParams.method || params.method || "POST") as "GET" | "POST" | "PUT" | "DELETE",
        headers: mergedParams.headers
          ? typeof mergedParams.headers === "string"
            ? JSON.parse(mergedParams.headers)
            : mergedParams.headers
          : params.headers,
        body: params.body || mergedParams.body,
      }

      if (!webhookParams.url) {
        throw new Error("Webhook URL is required")
      }

      return await callTool("call_webhook", webhookParams)
    }

    case "trigger_workflow": {
      const workflowParams: TriggerWorkflowParams = {
        workflowId: mergedParams.workflowId || params.workflowId,
        input: {
          ...mergedParams.input,
          ...params.input,
          triggeredBy: integration.id,
        },
      }

      if (!workflowParams.workflowId) {
        throw new Error("Workflow ID is required")
      }

      return await callTool("trigger_workflow", workflowParams)
    }

    case "call_phone": {
      // Use phone number from params (provided when calling) or from config (user's configured number)
      const phoneNumber = params.to || mergedParams.phoneNumber

      const phoneParams: CallPhoneParams = {
        to: phoneNumber,
        message: params.message || mergedParams.message,
        provider: "vapi",
        ...params,
      }

      if (!phoneParams.to) {
        throw new Error("Phone number is required. Provide when calling the tool or configure in integration settings.")
      }

      // Assistant ID from user config if provided
      if (mergedParams.assistantId) {
        phoneParams.assistantId = mergedParams.assistantId
      }

      return await callTool("call_phone", phoneParams)
    }

    default:
      throw new Error(`Unknown tool: ${integration.toolName}`)
  }
}

/**
 * Get active integrations by tool name
 */
export function getActiveIntegrationsByTool(
  integrations: Integration[],
  toolName: string
): Integration[] {
  return integrations.filter(
    (int) => int.status === "active" && int.toolName === toolName
  )
}
