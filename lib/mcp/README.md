# Lumenta MCP (Model Context Protocol) Server

The MCP layer is the orchestration bridge between perception, reasoning, and action. It exposes the live state of the world as readable "resources" and system capabilities as callable "tools" that Gemini can inspect and invoke.

## Architecture

The MCP implementation consists of:

1. **MCP Server** (`lib/mcp/server.ts`): Core protocol handler that manages resources and tools
2. **Gemini Orchestrator** (`lib/mcp/gemini-orchestrator.ts`): Autonomous agent that reads resources, reasons about the environment, and invokes tools
3. **API Routes** (`app/api/mcp/`): HTTP endpoints for MCP protocol operations
4. **Client Utilities** (`lib/mcp/client.ts`): Helper functions for frontend to interact with MCP server
5. **MCP View Component** (`components/mcps-view.tsx`): UI for managing MCP connections and monitoring

## Resources

Resources are read-only state that Gemini can inspect:

- `lumenta://detections` - Latest camera detection events from all feeds
- `lumenta://detections/{feedId}` - Camera detections for a specific feed
- `lumenta://identity-matches` - Person identity recognition and matching results
- `lumenta://transcripts` - Speech-to-text transcripts from audio feeds
- `lumenta://summaries` - AI-generated summaries of video feed activity
- `lumenta://workflows` - Currently running workflow configurations
- `lumenta://workflows/{workflowId}` - Detailed information about a specific workflow
- `lumenta://traces` - Node execution traces from workflow runtime
- `lumenta://traces/{workflowId}` - Execution traces for a specific workflow

## Tools

Tools are callable capabilities that Gemini can invoke:

- **trigger_workflow** - Trigger a workflow to start or resume execution with optional input data
- **send_notification** - Send a notification through one or more channels (email, SMS, push, webhook)
- **call_webhook** - Make an HTTP request to an external webhook URL
- **mutate_graph** - Modify a workflow graph by adding, removing, or updating nodes and edges

## Gemini Orchestrator

The orchestrator continuously:

1. Reads current resources (detections, workflows, traces)
2. Sends context to Gemini API for analysis
3. Gemini reasons about what actions are needed
4. Automatically invokes tools (trigger workflows, send notifications, etc.)
5. Runs every 10 seconds while active

### Starting the Orchestrator

1. Set `GEMINI_API_KEY` environment variable, or
2. Provide API key in the MCPsView UI when starting the orchestrator

The orchestrator can be controlled via:
- UI: `/mcps` page → Orchestrator tab
- API: `POST /api/mcp/orchestrator` with action: "start" | "stop" | "trigger"

## Streaming Events

The frontend workflow runtime should stream events to the MCP server using:

```typescript
import { streamDetection, streamTrace, streamWorkflow } from '@/lib/mcp/client'

// Stream a detection event
await streamDetection({
  id: 'det-123',
  timestamp: new Date().toISOString(),
  feedId: 'feed-1',
  feedName: 'Camera 1',
  type: 'person',
  boxes: [{ x: 100, y: 100, width: 50, height: 80 }],
  labels: ['person'],
  confidences: [0.95],
  description: 'Person detected in frame',
  severity: 'medium'
})

// Stream a node execution trace
await streamTrace({
  id: 'trace-456',
  workflowId: 'workflow-1',
  nodeId: 'node-1',
  nodeType: 'detection',
  timestamp: new Date().toISOString(),
  status: 'finished',
  input: { image: '...' },
  output: { detections: [...] },
  duration: 150
})
```

## Event Stream

The MCP server exposes a Server-Sent Events (SSE) stream at `/api/mcp/events` that broadcasts all ingested events in real-time.

## API Endpoints

- `POST /api/mcp` - Handle MCP protocol requests (resources/list, resources/read, tools/list, tools/call)
- `GET /api/mcp/events` - Server-Sent Events stream for real-time event updates
- `POST /api/mcp/ingest` - Ingest events from frontend workflow runtime
- `POST /api/mcp/orchestrator` - Control the Gemini orchestrator (start, stop, trigger)

## Example Usage

### Reading a Resource

```typescript
import { readResource } from '@/lib/mcp/client'

const detections = await readResource('lumenta://detections')
console.log('Latest detections:', detections)
```

### Calling a Tool

```typescript
import { callTool } from '@/lib/mcp/client'

const result = await callTool('trigger_workflow', {
  workflowId: 'workflow-123',
  input: { triggeredBy: 'mcp' }
})
console.log('Workflow triggered:', result)
```

### Listening to Events

```typescript
import { createMCPEventSource } from '@/lib/mcp/client'

const eventSource = createMCPEventSource((event) => {
  console.log('Event received:', event.type, event.data)
})

// Later, when done:
eventSource.close()
```

## Design Principles

- **Infrastructure, not UI**: MCP is designed as infrastructure that connects the workflow engine to reasoning agents
- **Model-agnostic but Gemini-first**: All intelligence can be swapped later without changing the workflow engine
- **Continuous streaming**: The frontend runtime continuously streams events and traces into MCP
- **Autonomous orchestration**: Gemini acts as an autonomous agent making decisions about when and how to act

This enables the core Cameron loop: **observe → interpret → act** to run autonomously.
