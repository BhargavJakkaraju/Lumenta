# MCP Server Testing Guide

This guide shows you how to test the MCP server without needing the full workflow runtime or orchestrator.

## Quick Start

1. **Go to the MCPs page** in your app (`/mcps` or navigate via sidebar)
2. **Scroll down** to see the "MCP Server Testing" panel
3. **Use the tabs** to test different MCP features:
   - **Stream Events** - Test streaming detection, trace, and workflow events
   - **Resources** - Test reading resources from the MCP server
   - **Tools** - Test calling MCP tools (notifications, webhooks, etc.)
   - **Results** - View all test results

## Testing Steps

### 1. Test Event Streaming

**Stream a Detection Event:**
1. Go to "Stream Events" tab
2. The detection data is pre-filled with sample data
3. Click "Stream Detection" button
4. Check "Results" tab to see if it succeeded
5. The detection should now be available as a resource

**Stream a Trace Event:**
1. Still in "Stream Events" tab
2. Click "Stream Trace" button
3. This simulates a workflow node execution
4. Check results tab

**Stream a Workflow Event:**
1. Click "Stream Workflow" button
2. This simulates a workflow starting
3. Check results tab

### 2. Test Reading Resources

**Read Detections:**
1. Go to "Resources" tab
2. The resource URI is pre-filled with `lumenta://detections`
3. Click "Read Resource" button
4. You should see the detection you streamed in step 1
5. Try other URIs:
   - `lumenta://detections` - All detections
   - `lumenta://workflows` - All workflows
   - `lumenta://traces` - All execution traces
   - `lumenta://traces/workflow-test-1` - Traces for specific workflow

### 3. Test Calling Tools

**Test Send Notification:**
1. Go to "Tools" tab
2. Click "Test Send Notification" button (quick test)
3. OR use the custom tool caller:
   - Set tool name to `send_notification`
   - Set arguments JSON:
     ```json
     {
       "title": "Test Alert",
       "message": "Person detected in camera feed",
       "severity": "high",
       "channels": ["webhook"]
     }
     ```
   - Click "Call Tool"
4. Check results tab to see the response

**Test with Active Integration:**
1. First, add and configure an integration (e.g., Slack webhook)
2. Toggle it ON (Active)
3. Call `send_notification` tool
4. The tool should use your active integration
5. Check the integration's webhook/logs to verify it was called

**Test Call Webhook:**
1. In "Tools" tab, click "Test Call Webhook"
2. This uses a public test endpoint (httpbin.org)
3. You should see a successful response in results
4. Or set tool name to `call_webhook` and use custom arguments:
   ```json
   {
     "url": "https://your-webhook-url.com/endpoint",
     "method": "POST",
     "body": {
       "message": "Test from MCP"
     }
   }
   ```

**Test Trigger Workflow:**
1. Set tool name to `trigger_workflow`
2. Set arguments:
   ```json
   {
     "workflowId": "workflow-123",
     "input": {
       "triggeredBy": "mcp-test"
     }
   }
   ```
3. Click "Call Tool"
4. This simulates triggering a workflow (if you have a workflow runtime connected)

### 4. Test Integration Flow (Full Cycle)

**Complete Integration Test:**
1. **Add an Integration:**
   - Click "Add New Tool"
   - Select "Custom Webhook"
   - Configure with a test webhook URL (use httpbin.org/post for testing)
   - Save configuration
   - Toggle it ON (Active)

2. **Stream an Event:**
   - Go to "Stream Events" tab
   - Stream a detection with high severity

3. **Call Tool with Integration:**
   - Go to "Tools" tab
   - Call `send_notification` or `call_webhook`
   - The tool should automatically use your active integration
   - Check your webhook endpoint to see the request

4. **Verify in Resources:**
   - Read `lumenta://detections` to see your streamed event
   - Read `lumenta://traces` to see tool execution traces

## Expected Results

### Successful Event Streaming
- ✅ Result shows "Success: true"
- ✅ Event appears in resources when you read them
- ✅ Event is stored in MCP state store

### Successful Resource Reading
- ✅ Result shows "Success: true"
- ✅ Data contains the resources you've streamed
- ✅ Empty array `[]` if no resources exist yet

### Successful Tool Call
- ✅ Result shows "Success: true"
- ✅ Response contains tool execution result
- ✅ If integration is active, it should be used automatically
- ✅ If no integration, default behavior is used

### With Active Integration
- ✅ Tool call uses integration configuration
- ✅ Integration's webhook/API is actually called
- ✅ Response shows integration was used

## Troubleshooting

**"Failed to stream event"**
- Check browser console for errors
- Verify `/api/mcp/ingest` endpoint is accessible
- Check network tab for failed requests

**"Resource not found"**
- Make sure you've streamed some events first
- Check resource URI is correct (e.g., `lumenta://detections`)
- Try reading `lumenta://workflows` or `lumenta://traces`

**"Tool call failed"**
- Check tool name is correct (e.g., `send_notification`, `call_webhook`)
- Verify arguments JSON is valid
- Check if integration configuration is correct (if using one)
- Look at browser console for detailed errors

**"Integration not being used"**
- Verify integration status is "Active" (toggle ON)
- Check integration's tool name matches the tool being called
- Ensure integration configuration is saved
- Verify integrations are synced to server (should happen automatically)

**"Webhook not receiving requests"**
- Test webhook URL separately (use curl or Postman)
- Check webhook URL is correct in integration config
- Verify webhook endpoint accepts POST requests
- Check firewall/network restrictions

## Next Steps

Once you've verified the MCP server works:

1. **Connect Real Workflow Runtime:**
   - Add `streamDetection()`, `streamTrace()`, etc. calls to your workflow runtime
   - Events will automatically flow to MCP

2. **Start Orchestrator:**
   - Set `GEMINI_API_KEY` environment variable
   - Start orchestrator via API: `POST /api/mcp/orchestrator` with `{"action": "start"}`
   - Orchestrator will automatically read resources and call tools

3. **Configure Real Integrations:**
   - Add real webhook URLs, email addresses, etc.
   - Toggle integrations ON when ready
   - They'll be used automatically by tools

4. **Monitor:**
   - Use the Results tab to see what's happening
   - Read resources to see current state
   - Check integration logs/webhooks to verify actions

## Test Checklist

- [ ] Can stream detection events
- [ ] Can stream trace events  
- [ ] Can stream workflow events
- [ ] Can read detection resources
- [ ] Can read workflow resources
- [ ] Can read trace resources
- [ ] Can call send_notification tool
- [ ] Can call call_webhook tool
- [ ] Can call trigger_workflow tool
- [ ] Active integration is used when calling tools
- [ ] Resources update after streaming events
- [ ] Tool calls return success responses

## Example Test Sequence

```javascript
// 1. Stream a detection
POST /api/mcp/ingest
{
  "type": "detection",
  "data": {
    "id": "det-1",
    "timestamp": "2024-01-01T12:00:00Z",
    "feedId": "feed-1",
    "feedName": "Camera 1",
    "type": "person",
    "boxes": [{"x": 100, "y": 100, "width": 50, "height": 80}],
    "labels": ["person"],
    "confidences": [0.95],
    "description": "Person detected",
    "severity": "high"
  }
}

// 2. Read the detection resource
POST /api/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/read",
  "params": {
    "uri": "lumenta://detections"
  }
}

// 3. Call a tool (will use active integration if configured)
POST /api/mcp
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "send_notification",
    "arguments": {
      "title": "High Severity Detection",
      "message": "Person detected in Camera 1",
      "severity": "high",
      "channels": ["webhook"]
    }
  }
}
```

The test panel provides a UI for all of this - no code needed!
