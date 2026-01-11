# MCP Setup Guide - What You Need to Make It Work

This guide outlines everything needed to get the MCP (Model Context Protocol) system fully operational.

## ✅ What's Already Built

1. **MCP Server Infrastructure** (`lib/mcp/server.ts`)
   - Resource management (detections, transcripts, workflows, traces)
   - Tool registry (trigger_workflow, send_notification, call_webhook, mutate_graph)
   - State store for live data

2. **API Routes** (`app/api/mcp/`)
   - `/api/mcp` - MCP protocol operations
   - `/api/mcp/events` - Real-time event stream (SSE)
   - `/api/mcp/ingest` - Event ingestion endpoint
   - `/api/mcp/orchestrator` - Gemini orchestrator control

3. **Client Utilities** (`lib/mcp/client.ts`)
   - Functions to stream events to MCP
   - Functions to read resources and call tools

4. **Integration System** (`lib/integrations/`)
   - User-friendly integration templates
   - Configuration UI
   - Integration handler to execute integrations

5. **UI Components**
   - MCPsView - User-friendly integration management
   - Configuration dialogs
   - Toggle switches for enable/disable

## ❌ What You Need to Add

### 1. Connect Frontend Workflow Runtime to MCP

**Location**: Wherever your workflow runtime emits events

```typescript
// Example: In your workflow runtime or camera detection component
import { streamDetection, streamTrace, streamWorkflow } from '@/lib/mcp/client'

// When a detection happens:
await streamDetection({
  id: `det-${Date.now()}`,
  timestamp: new Date().toISOString(),
  feedId: feed.id,
  feedName: feed.name,
  type: 'person', // or 'vehicle', 'motion', 'object', 'alert'
  boxes: detection.boxes,
  labels: detection.labels,
  confidences: detection.confidences,
  description: 'Person detected in frame',
  severity: 'medium'
})

// When a node executes:
await streamTrace({
  id: `trace-${Date.now()}`,
  workflowId: workflow.id,
  nodeId: node.id,
  nodeType: node.type,
  timestamp: new Date().toISOString(),
  status: 'finished', // or 'started', 'error'
  input: node.input,
  output: node.output,
  duration: executionTime
})

// When a workflow starts:
await streamWorkflow({
  id: workflow.id,
  name: workflow.name,
  status: 'running',
  startedAt: new Date().toISOString(),
  nodeCount: workflow.nodes.length,
  config: workflow.config
})
```

### 2. Configure Gemini API Key

**Option A: Environment Variable (Recommended)**
```bash
# In your .env.local or .env file
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash-exp  # Optional, defaults to this
GEMINI_TEMPERATURE=0.7              # Optional, defaults to 0.7
GEMINI_MAX_TOKENS=8192              # Optional, defaults to 8192
```

**Option B: Through UI**
- Go to MCPs page
- The orchestrator will prompt for API key when starting (if env var not set)

**Get Gemini API Key:**
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy and add to environment variable or UI

### 3. Connect Integrations to Orchestrator

**Current Status**: The orchestrator calls MCP tools, but tools need to use active integrations.

**What to do**: Update `lib/mcp/server.ts` `callTool` function to:
- Check for active integrations that match the tool
- Use integration configs when calling tools
- Fall back to default behavior if no active integrations

**Example update needed**:

```typescript
// In lib/mcp/server.ts, update callTool function
export async function callTool(
  toolCall: MCPToolCall
): Promise<MCPToolResult> {
  // Get active integrations for this tool
  const integrations = getActiveIntegrationsForTool(toolCall.name)
  
  if (integrations.length > 0) {
    // Use integration handler
    const result = await executeIntegration(integrations[0], toolCall.arguments)
    return { content: [{ type: "text", text: JSON.stringify(result) }] }
  }
  
  // Fall back to default tool implementation
  // ... existing code
}
```

### 4. Add Orchestrator UI (Optional)

The new simplified MCPsView removed the orchestrator tab. You may want to add it back:

**Option A: Add back to MCPsView as a card**
- Show orchestrator status
- Start/Stop toggle
- API key input

**Option B: Create separate Orchestrator page**
- Dedicated page for orchestrator control
- More detailed configuration options

### 5. Test the System

**Step 1: Add an Integration**
1. Go to MCPs page
2. Click "Add New Tool"
3. Select "Email Service" (or any integration)
4. Configure it with your settings
5. Toggle it ON

**Step 2: Start Streaming Events**
- Make sure your workflow runtime is calling `streamDetection`, `streamTrace`, etc.
- You should see events in the MCP state store

**Step 3: Start Orchestrator**
- Set `GEMINI_API_KEY` environment variable OR
- Use the orchestrator API: `POST /api/mcp/orchestrator` with `{ action: "start", apiKey: "..." }`

**Step 4: Watch It Work**
- Orchestrator reads resources every 10 seconds
- Gemini analyzes the environment
- Gemini invokes tools based on reasoning
- Tools use active integrations to take actions

## 📋 Quick Checklist

- [ ] Frontend streams events to `/api/mcp/ingest`
- [ ] Gemini API key configured (env var or UI)
- [ ] At least one integration added and activated
- [ ] Orchestrator started (via API or future UI)
- [ ] Events are being generated (detections, traces, etc.)
- [ ] MCP tools are wired to use active integrations

## 🔧 Integration Example Workflow

1. **User adds Email Service integration** → Configures email address → Toggles ON
2. **Workflow runtime detects person** → Streams detection to MCP
3. **Orchestrator reads detection** → Gemini analyzes → Decides to send notification
4. **Orchestrator calls `send_notification` tool** → Tool finds active Email Service integration
5. **Integration handler executes** → Sends email via Resend API → Success

## 🚨 Common Issues

**"Orchestrator not starting"**
- Check Gemini API key is set correctly
- Check API key is valid (test at https://aistudio.google.com)
- Check network connectivity to Google APIs

**"No events showing"**
- Verify frontend is calling `streamDetection`, `streamTrace`, etc.
- Check browser console for errors
- Verify `/api/mcp/ingest` endpoint is accessible

**"Integrations not being used"**
- Ensure integration status is "Active" (toggle ON)
- Verify integration has valid configuration
- Check that `callTool` function checks for active integrations

**"Tools not working"**
- Verify integration configuration (email, webhook URL, etc.)
- Check integration handler logs for errors
- Ensure required fields are filled in configuration

## 🎯 Next Steps

1. **Add event streaming** to your workflow runtime
2. **Set Gemini API key** in environment
3. **Add and configure** at least one integration
4. **Start orchestrator** and test the full loop
5. **Monitor** orchestrator decisions and tool executions

The system is designed to work incrementally - you can test each piece separately before connecting everything together.
