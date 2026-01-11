/**
 * Integration Templates
 * Pre-defined integration templates that map to MCP tools
 */

import type { IntegrationTemplate } from "@/types/integrations"
import { Mail, Phone, MessageSquare, Send, Globe, Activity, Bell, Settings } from "lucide-react"

export const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    id: "email-service",
    name: "Email Service",
    icon: "mail",
    description: "Email notifications via Resend (simple API-based email service)",
    toolName: "send_notification",
    defaultConfig: {
      channels: ["email"],
      emailProvider: "resend",
    },
    configFields: [
      {
        key: "email",
        label: "Your Email Address",
        type: "email",
        placeholder: "your-email@example.com",
        required: true,
        helpText: "Your email address to receive notifications",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack Integration",
    icon: "message-square",
    description: "Slack workspace notifications and team alerts",
    toolName: "send_notification",
    defaultConfig: {
      channels: ["webhook"],
    },
    configFields: [
      {
        key: "webhookUrl",
        label: "Slack Webhook URL",
        type: "url",
        placeholder: "https://hooks.slack.com/services/...",
        required: true,
        helpText: "Get this from your Slack app's Incoming Webhooks settings",
      },
      {
        key: "channel",
        label: "Default Channel",
        type: "text",
        placeholder: "#alerts",
        helpText: "Default channel to send notifications to (optional)",
      },
    ],
  },
  {
    id: "discord",
    name: "Discord Integration",
    icon: "message-square",
    description: "Send alerts to Discord channels or DMs to individuals. Gemini will automatically decide when and who to message.",
    toolName: "send_notification",
    defaultConfig: {
      channels: ["webhook"],
      mode: "webhook", // "webhook" for channels, "bot" for DMs + channels
    },
    configFields: [
      {
        key: "mode",
        label: "Message Type",
        type: "select",
        placeholder: "Choose message type",
        required: true,
        helpText: "Choose 'Channel Messages' for group alerts, or 'Bot (DMs + Channels)' for messaging individuals or groups",
        options: [
          { value: "webhook", label: "Channel Messages (Simple - Groups Only)" },
          { value: "bot", label: "Bot (DMs + Channels - Message Individuals or Groups)" },
        ],
      },
      // Webhook mode fields (for channels only)
      {
        key: "webhookUrl",
        label: "Discord Webhook URL (Channel Messages)",
        type: "url",
        placeholder: "https://discord.com/api/webhooks/...",
        required: false, // Only required if mode is webhook
        helpText: "Get from: Server Settings → Integrations → Webhooks → New Webhook → Copy URL. Only needed for 'Channel Messages' mode.",
        conditional: { field: "mode", value: "webhook" },
      },
      {
        key: "channelId",
        label: "Default Channel ID (Optional)",
        type: "text",
        placeholder: "123456789012345678",
        required: false,
        helpText: "Optional: Default channel ID to send alerts to. Leave empty to use webhook's channel.",
        conditional: { field: "mode", value: "webhook" },
      },
      // Bot mode fields (for DMs and channels)
      {
        key: "botToken",
        label: "Discord Bot Token (Bot Mode)",
        type: "password",
        placeholder: "Bot token from Discord Developer Portal",
        required: false, // Only required if mode is bot
        helpText: "Get from: https://discord.com/developers/applications → Your App → Bot → Copy Token. Only needed for 'Bot' mode to send DMs or messages to any channel.",
        conditional: { field: "mode", value: "bot" },
      },
      {
        key: "defaultChannelId",
        label: "Default Channel ID (Bot Mode - Optional)",
        type: "text",
        placeholder: "123456789012345678",
        required: false,
        helpText: "Optional: Default channel ID for group alerts. Leave empty if only sending DMs.",
        conditional: { field: "mode", value: "bot" },
      },
      {
        key: "recipientUserIds",
        label: "Recipient User IDs (DM Recipients - Optional)",
        type: "textarea",
        placeholder: "123456789012345678,987654321098765432",
        required: false,
        helpText: "Optional: Comma-separated Discord User IDs for individual DM alerts. Gemini can also specify recipients dynamically. Get User ID by enabling Developer Mode in Discord → Right-click user → Copy ID.",
        conditional: { field: "mode", value: "bot" },
      },
      {
        key: "username",
        label: "Bot Username (Optional)",
        type: "text",
        placeholder: "Lumenta Bot",
        helpText: "Optional: Custom username/name for the bot when sending messages",
      },
    ],
  },
  {
    id: "sms",
    name: "SMS Service",
    icon: "phone",
    description: "SMS text message alerts via Vonage",
    toolName: "send_notification",
    defaultConfig: {
      channels: ["sms"],
    },
    configFields: [
      {
        key: "phoneNumber",
        label: "Your Phone Number",
        type: "text",
        placeholder: "+1234567890",
        required: true,
        helpText: "Your phone number to receive SMS notifications (include country code). API credentials managed via environment variables.",
      },
    ],
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    icon: "globe",
    description: "Send HTTP requests to custom webhook endpoints",
    toolName: "call_webhook",
    defaultConfig: {},
    configFields: [
      {
        key: "url",
        label: "Webhook URL",
        type: "url",
        placeholder: "https://your-api.com/webhook",
        required: true,
        helpText: "The URL to send webhook requests to",
      },
      {
        key: "method",
        label: "HTTP Method",
        type: "text",
        placeholder: "POST",
        helpText: "HTTP method (GET, POST, PUT, DELETE)",
      },
      {
        key: "headers",
        label: "Custom Headers",
        type: "textarea",
        placeholder: '{"Authorization": "Bearer token"}',
        helpText: "JSON object with custom headers (optional)",
      },
    ],
  },
  {
    id: "workflow-trigger",
    name: "Workflow Trigger",
    icon: "activity",
    description: "Automatically trigger workflows based on conditions",
    toolName: "trigger_workflow",
    defaultConfig: {},
    configFields: [
      {
        key: "workflowId",
        label: "Workflow ID",
        type: "text",
        placeholder: "workflow-123",
        required: true,
        helpText: "The ID of the workflow to trigger",
      },
      {
        key: "conditions",
        label: "Trigger Conditions",
        type: "textarea",
        placeholder: '{"severity": "high", "type": "person"}',
        helpText: "JSON object describing when to trigger this workflow",
      },
    ],
  },
  {
    id: "push-notification",
    name: "Push Notifications",
    icon: "bell",
    description: "Mobile push notifications (not yet implemented)",
    toolName: "send_notification",
    defaultConfig: {
      channels: ["push"],
    },
    configFields: [
      {
        key: "deviceToken",
        label: "Your Device Token",
        type: "text",
        placeholder: "your-device-fcm-token",
        required: true,
        helpText: "Your device's push notification token (FCM token). Note: Push notifications are not yet implemented.",
      },
    ],
  },
  {
    id: "phone-calls",
    name: "Phone Calls",
    icon: "phone",
    description: "Make automated phone calls via Vapi",
    toolName: "call_phone",
    defaultConfig: {
      provider: "vapi",
    },
    configFields: [
      {
        key: "phoneNumber",
        label: "Your Phone Number",
        type: "text",
        placeholder: "+1234567890",
        required: true,
        helpText: "Your phone number to receive phone calls (include country code). API credentials managed via environment variables.",
      },
    ],
  },
]

export function getIntegrationIcon(iconName: string) {
  const icons: Record<string, any> = {
    mail: Mail,
    "message-square": MessageSquare,
    phone: Phone,
    globe: Globe,
    activity: Activity,
    bell: Bell,
    settings: Settings,
  }
  return icons[iconName] || Settings
}
