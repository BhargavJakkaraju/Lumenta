# MCP Integrations - User-Friendly Interface

The MCPs page has been redesigned to be user-friendly and intuitive, hiding the technical complexity while still leveraging the powerful MCP infrastructure underneath.

## Features

### Simple Integration Cards
- Each integration is displayed as a card with:
  - **Icon**: Visual representation of the service
  - **Name**: Service name (e.g., "Email Service")
  - **Description**: Brief explanation of what it does
  - **Status**: Active (green) or Standby (gray)
  - **Action Buttons**: Start/Pause, Configure, Remove

### Easy Configuration
- Click "Configure" to set up any integration
- Forms are automatically generated based on the integration type
- Required fields are marked with asterisks
- Help text guides users on what to enter
- Configuration is saved automatically

### Add New Tools
- Click "Add New Tool" button in the top right
- Browse available integration templates
- Select one to add it to your list
- Automatically opens configuration dialog

## Available Integrations

1. **Email Service** - Send email notifications via Resend API
   - Requires: Recipient email address (API key managed via environment variables)

2. **Slack Integration** - Send notifications to Slack channels
   - Requires: Slack webhook URL

3. **SMS Service** - Send SMS text messages
   - Requires: SMS provider, API key, phone number

4. **Custom Webhook** - Send HTTP requests to any endpoint
   - Requires: Webhook URL and optional headers

5. **Workflow Trigger** - Automatically trigger workflows
   - Requires: Workflow ID and trigger conditions

6. **Push Notifications** - Send mobile push notifications
   - Requires: Service account key

## How It Works

### Behind the Scenes
- Each integration maps to an MCP tool (e.g., `send_notification`, `call_webhook`, `trigger_workflow`)
- When an integration is "Active", it can be automatically invoked by the Gemini orchestrator
- Configuration is stored in localStorage (can be migrated to a backend later)
- The MCP server handles the actual execution

### Adding New Integration Templates
To add a new integration type, add it to `lib/integrations/templates.ts`:

```typescript
{
  id: "my-integration",
  name: "My Integration",
  icon: "settings", // Icon name
  description: "Description of what it does",
  toolName: "send_notification", // MCP tool to call
  defaultConfig: {},
  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Enter your API key"
    }
  ]
}
```

### Extending Functionality
When an integration is active and needs to be used:
1. The Gemini orchestrator can automatically call the associated MCP tool
2. Or workflows can explicitly call tools via the MCP API
3. The integration's configuration is passed as parameters to the tool

## Storage
- Integrations are stored in browser localStorage under the key `lumenta-integrations`
- In production, this should be migrated to a backend database
- Configuration values are stored as-is (strings, not encrypted - consider encryption for sensitive data in production)

## UI/UX Improvements
- ✅ Simple card-based layout
- ✅ Clear status indicators
- ✅ Easy configuration dialogs
- ✅ No technical jargon exposed to users
- ✅ Intuitive Start/Pause controls
- ✅ Visual feedback for all actions

This design makes the powerful MCP infrastructure accessible to non-technical users while maintaining all the flexibility and power of the underlying system.
