/**
 * MCP Test Panel
 * Manual testing interface for MCP server without full workflow runtime
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, CheckCircle2, XCircle, Database, Wrench } from "lucide-react"
import { callTool, readResource, streamDetection, streamTrace, streamWorkflow } from "@/lib/mcp/client"
import type { DetectionResource, NodeExecutionTrace, ActiveWorkflowResource } from "@/types/mcp"

interface TestResult {
  type: string
  success: boolean
  message: string
  data?: any
  timestamp: string
}

export function MCPTestPanel() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)

  // Test detection data
  const [detectionData, setDetectionData] = useState<Partial<DetectionResource>>({
    feedId: "feed-1",
    feedName: "Camera 1",
    type: "person",
    description: "Test person detection",
    severity: "medium",
    boxes: [{ x: 100, y: 100, width: 50, height: 80 }],
    labels: ["person"],
    confidences: [0.95],
  })

  // Test tool call data
  const [toolCall, setToolCall] = useState({
    toolName: "send_notification",
    arguments: JSON.stringify({
      title: "Test Notification",
      message: "This is a test notification from MCP",
      severity: "medium",
      channels: ["webhook"],
    }, null, 2),
  })

  // Test resource URI
  const [resourceUri, setResourceUri] = useState("lumenta://detections")

  const addResult = (type: string, success: boolean, message: string, data?: any) => {
    setTestResults((prev) => [
      {
        type,
        success,
        message,
        data,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  // Test: Stream a detection event
  const testStreamDetection = async () => {
    setLoading(true)
    try {
      const detection: DetectionResource = {
        id: `det-${Date.now()}`,
        timestamp: new Date().toISOString(),
        feedId: detectionData.feedId || "feed-1",
        feedName: detectionData.feedName || "Camera 1",
        type: (detectionData.type || "person") as any,
        boxes: detectionData.boxes || [],
        labels: detectionData.labels || [],
        confidences: detectionData.confidences || [],
        description: detectionData.description || "",
        severity: (detectionData.severity || "medium") as any,
      }

      await streamDetection(detection)
      addResult("Stream Detection", true, "Detection event streamed successfully", detection)
    } catch (error: any) {
      addResult("Stream Detection", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Stream a trace event
  const testStreamTrace = async () => {
    setLoading(true)
    try {
      const trace: NodeExecutionTrace = {
        id: `trace-${Date.now()}`,
        workflowId: "workflow-test-1",
        nodeId: "node-1",
        nodeType: "detection",
        timestamp: new Date().toISOString(),
        status: "finished",
        input: { image: "test-image" },
        output: { detections: ["person"] },
        duration: 150,
      }

      await streamTrace(trace)
      addResult("Stream Trace", true, "Trace event streamed successfully", trace)
    } catch (error: any) {
      addResult("Stream Trace", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Stream a workflow event
  const testStreamWorkflow = async () => {
    setLoading(true)
    try {
      const workflow: ActiveWorkflowResource = {
        id: "workflow-test-1",
        name: "Test Workflow",
        status: "running",
        startedAt: new Date().toISOString(),
        nodeCount: 5,
        config: { test: true },
      }

      await streamWorkflow(workflow)
      addResult("Stream Workflow", true, "Workflow event streamed successfully", workflow)
    } catch (error: any) {
      addResult("Stream Workflow", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Read a resource
  const testReadResource = async () => {
    setLoading(true)
    try {
      const data = await readResource(resourceUri)
      addResult("Read Resource", true, `Resource '${resourceUri}' read successfully`, data)
    } catch (error: any) {
      addResult("Read Resource", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Call a tool
  const testCallTool = async () => {
    setLoading(true)
    try {
      let args: Record<string, any> = {}
      try {
        args = JSON.parse(toolCall.arguments)
      } catch (e) {
        throw new Error("Invalid JSON in tool arguments")
      }

      const result = await callTool(toolCall.toolName, args)
      addResult("Call Tool", true, `Tool '${toolCall.toolName}' called successfully`, result)
    } catch (error: any) {
      addResult("Call Tool", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Send notification (uses active integration if configured)
  const testSendNotification = async () => {
    setLoading(true)
    try {
      const result = await callTool("send_notification", {
        title: "Test Notification",
        message: "This is a test notification to verify MCP integration",
        severity: "medium",
        channels: ["webhook"],
      })
      addResult("Send Notification", true, "Notification sent via MCP tool", result)
    } catch (error: any) {
      addResult("Send Notification", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Send email via Resend
  const testSendEmail = async () => {
    setLoading(true)
    try {
      const email = prompt("Enter email address to send test email to:")
      if (!email) {
        addResult("Send Email", false, "Email address is required", null)
        setLoading(false)
        return
      }

      const result = await callTool("send_notification", {
        title: "Test Email from Lumenta MCP",
        message: "This is a test email to verify that email sending via Resend is working correctly. If you receive this, the MCP email integration is functioning properly!",
        severity: "medium",
        channels: ["email"],
        metadata: {
          recipientEmail: email,
        },
      })
      
      // Parse the MCP tool result (content array with JSON string)
      const resultText = result?.content?.[0]?.text || result
      const parsed = typeof resultText === 'string' ? JSON.parse(resultText) : resultText
      
      if (parsed.success && parsed.results?.email?.success) {
        const fromEmail = parsed.results?.email?.from || "onboarding@resend.dev"
        const note = parsed.results?.email?.note 
          ? `\n\n💡 ${parsed.results.email.note}` 
          : ""
        addResult("Send Email", true, `✅ Email sent successfully to ${email} from ${fromEmail}! Check your inbox (including spam folder).${note}`, parsed)
      } else {
        const errorMsg = parsed.results?.email?.error || parsed.error || "Unknown error"
        const suggestion = parsed.results?.email?.suggestion
        const fullError = suggestion ? `${errorMsg}\n\n💡 ${suggestion}` : errorMsg
        addResult("Send Email", false, `Failed: ${fullError}`, parsed)
      }
    } catch (error: any) {
      addResult("Send Email", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Send SMS via Vonage
  const testSendSMS = async () => {
    setLoading(true)
    try {
      const phoneNumber = prompt("Enter phone number to send SMS to (with country code, e.g., +1234567890):")
      if (!phoneNumber) {
        addResult("Send SMS", false, "Phone number is required", null)
        setLoading(false)
        return
      }

      const result = await callTool("send_notification", {
        title: "Test SMS",
        message: "This is a test SMS from Lumenta MCP. If you receive this, the SMS integration is working correctly!",
        severity: "medium",
        channels: ["sms"],
        metadata: {
          recipientPhone: phoneNumber,
        },
      })
      
      // Parse the MCP tool result (content array with JSON string)
      const resultText = result?.content?.[0]?.text || result
      const parsed = typeof resultText === 'string' ? JSON.parse(resultText) : resultText
      
      if (parsed.success && parsed.results?.sms?.success) {
        const fromNumber = parsed.results?.sms?.from || "Unknown"
        const messageId = parsed.results?.sms?.messageId || "N/A"
        addResult("Send SMS", true, `✅ SMS sent successfully to ${phoneNumber} from ${fromNumber}! Message ID: ${messageId}. Check your phone.`, parsed)
      } else {
        const errorMsg = parsed.results?.sms?.error || parsed.error || "Unknown error"
        // Format error message with better readability
        const formattedError = errorMsg.replace(/\n/g, " | ")
        addResult("Send SMS", false, `Failed: ${formattedError}`, parsed)
      }
    } catch (error: any) {
      addResult("Send SMS", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Call webhook
  const testCallWebhook = async () => {
    setLoading(true)
    try {
      const result = await callTool("call_webhook", {
        url: "https://httpbin.org/post", // Public test endpoint
        method: "POST",
        body: {
          message: "Test webhook call from Lumenta MCP",
          timestamp: new Date().toISOString(),
        },
      })
      addResult("Call Webhook", true, "Webhook called successfully", result)
    } catch (error: any) {
      addResult("Call Webhook", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  // Test: Call phone (uses Vapi)
  const testCallPhone = async () => {
    setLoading(true)
    try {
      // Prompt for phone number
      const phoneNumber = prompt("Enter phone number to call (with country code, e.g., +1234567890):")
      if (!phoneNumber) {
        addResult("Call Phone", false, "Phone number is required", null)
        setLoading(false)
        return
      }

      // Note: Message is configured in your Vapi assistant, not passed here
      // Uses Vapi for phone calls
      const result = await callTool("call_phone", {
        to: phoneNumber,
        provider: "vapi",
      })
      
      // Parse the MCP tool result
      const resultText = result?.content?.[0]?.text || result
      const parsed = typeof resultText === 'string' ? JSON.parse(resultText) : resultText
      
      if (parsed.success) {
        const callId = parsed.callId || parsed.callSid || "N/A"
        const provider = parsed.provider || "vapi"
        addResult("Call Phone", true, `✅ Call initiated successfully! Call ID: ${callId} (${provider}). Answer your phone! Note: The message is configured in your Vapi assistant.`, parsed)
      } else {
        const errorMsg = parsed.error || "Unknown error"
        addResult("Call Phone", false, `Failed: ${errorMsg}`, parsed)
      }
    } catch (error: any) {
      addResult("Call Phone", false, `Failed: ${error.message}`, error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-5" />
          MCP Server Testing
        </CardTitle>
        <CardDescription>
          Manually test MCP server functionality without full workflow runtime
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="events">Stream Events</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="results">
              Results ({testResults.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Stream Test Events</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-zinc-300 mb-2 block">Detection Event</Label>
                  <div className="bg-zinc-950 rounded p-3 mb-2">
                    <pre className="text-xs text-zinc-300 overflow-x-auto">
                      {JSON.stringify(detectionData, null, 2)}
                    </pre>
                  </div>
                  <Button
                    onClick={testStreamDetection}
                    disabled={loading}
                    size="sm"
                    className="gap-2"
                  >
                    <Play className="size-4" />
                    Stream Detection
                  </Button>
                </div>

                <div>
                  <Label className="text-zinc-300 mb-2 block">Trace Event</Label>
                  <Button
                    onClick={testStreamTrace}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Play className="size-4" />
                    Stream Trace
                  </Button>
                </div>

                <div>
                  <Label className="text-zinc-300 mb-2 block">Workflow Event</Label>
                  <Button
                    onClick={testStreamWorkflow}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Play className="size-4" />
                    Stream Workflow
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Read Resources</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="resourceUri" className="text-zinc-300 mb-2 block">
                    Resource URI
                  </Label>
                  <Input
                    id="resourceUri"
                    value={resourceUri}
                    onChange={(e) => setResourceUri(e.target.value)}
                    placeholder="lumenta://detections"
                    className="bg-zinc-950 border-zinc-800 text-white mb-2"
                  />
                  <div className="text-xs text-zinc-500 mb-2">
                    Examples: lumenta://detections, lumenta://workflows, lumenta://traces
                  </div>
                  <Button
                    onClick={testReadResource}
                    disabled={loading}
                    size="sm"
                    className="gap-2"
                  >
                    <Database className="size-4" />
                    Read Resource
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Call Tools</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="toolName" className="text-zinc-300 mb-2 block">
                    Tool Name
                  </Label>
                  <Input
                    id="toolName"
                    value={toolCall.toolName}
                    onChange={(e) => setToolCall({ ...toolCall, toolName: e.target.value })}
                    placeholder="send_notification"
                    className="bg-zinc-950 border-zinc-800 text-white mb-2"
                  />
                  <div className="text-xs text-zinc-500 mb-2">
                    Available: send_notification, call_webhook, trigger_workflow, mutate_graph
                  </div>
                </div>

                <div>
                  <Label htmlFor="toolArgs" className="text-zinc-300 mb-2 block">
                    Arguments (JSON)
                  </Label>
                  <Textarea
                    id="toolArgs"
                    value={toolCall.arguments}
                    onChange={(e) => setToolCall({ ...toolCall, arguments: e.target.value })}
                    placeholder='{"title": "Test", "message": "Hello"}'
                    className="bg-zinc-950 border-zinc-800 text-white font-mono text-sm"
                    rows={8}
                  />
                </div>

                <Button
                  onClick={testCallTool}
                  disabled={loading}
                  size="sm"
                  className="gap-2"
                >
                  <Play className="size-4" />
                  Call Tool
                </Button>

                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <h4 className="text-sm font-medium text-white mb-3">Quick Tests</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={testSendEmail}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-green-600/20 border-green-600 text-green-300 hover:bg-green-600/30"
                    >
                      📧 Test Send Email
                    </Button>
                    <Button
                      onClick={testSendSMS}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-purple-600/20 border-purple-600 text-purple-300 hover:bg-purple-600/30"
                    >
                      💬 Test Send SMS
                    </Button>
                    <Button
                      onClick={testCallPhone}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-blue-600/20 border-blue-600 text-blue-300 hover:bg-blue-600/30"
                    >
                      📞 Test Call Phone
                    </Button>
                    <Button
                      onClick={testCallWebhook}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      🔗 Test Call Webhook
                    </Button>
                    <Button
                      onClick={testSendNotification}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="gap-2 col-span-2"
                    >
                      🔔 Test Send Notification (Generic)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white">Test Results</h3>
                {testResults.length > 0 && (
                  <Button
                    onClick={() => setTestResults([])}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {testResults.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No test results yet. Run some tests to see results here.
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {testResults.map((result, idx) => (
                    <Card
                      key={idx}
                      className={`bg-zinc-950 border ${
                        result.success ? "border-green-800" : "border-red-800"
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle2 className="size-4 text-green-500" />
                            ) : (
                              <XCircle className="size-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium text-white">{result.type}</span>
                            <Badge
                              variant={result.success ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {result.success ? "Success" : "Failed"}
                            </Badge>
                          </div>
                          <span className="text-xs text-zinc-500">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 mb-2">{result.message}</p>
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-zinc-500 cursor-pointer">
                              View Details
                            </summary>
                            <pre className="text-xs text-zinc-400 mt-2 bg-zinc-900 p-2 rounded overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
