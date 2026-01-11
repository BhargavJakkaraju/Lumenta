"use client"

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send, Bot, User } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface NodeGraphData {
  nodes?: Array<{
    id: string
    type: string
    title: string
    config?: any
  }>
  edges?: Array<{
    id: string
    fromNodeId: string
    toNodeId: string
  }>
}

interface WorkflowChatPanelProps {
  nodeGraphData?: NodeGraphData
  onCreateNodes?: (nodes: Array<{
    type: "analyze" | "action"
    config: any
    title?: string
  }>) => void
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
const GEMINI_MODEL = "gemini-2.0-flash-exp"

export function WorkflowChatPanel({ nodeGraphData, onCreateNodes }: WorkflowChatPanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const buildContextPrompt = (userQuery: string): string => {
    let context = `You are a helpful AI assistant for a video surveillance workflow system. You help users understand and work with node graphs that represent video processing workflows.

The node graph consists of nodes connected by edges. Node types include:
- video_input: The source of video data
- analyze: Nodes that analyze video frames (can have prompts and sensitivity settings)
- action: Nodes that perform actions based on analysis results

Current Node Graph State:
`

    if (nodeGraphData?.nodes && nodeGraphData.nodes.length > 0) {
      context += `\nNodes (${nodeGraphData.nodes.length}):\n`
      nodeGraphData.nodes.forEach((node, index) => {
        context += `${index + 1}. ${node.title} (ID: ${node.id}, Type: ${node.type})`
        if (node.config) {
          if ('prompt' in node.config) {
            context += `\n   - Prompt: ${(node.config as any).prompt || 'Not set'}`
            context += `\n   - Sensitivity: ${(node.config as any).sensitivity || 'medium'}`
          }
          if ('option' in node.config) {
            context += `\n   - Option: ${(node.config as any).option || 'Not set'}`
            context += `\n   - Description: ${(node.config as any).description || 'Not set'}`
          }
        }
        context += "\n"
      })
    } else {
      context += "\nNo nodes in the graph yet.\n"
    }

    if (nodeGraphData?.edges && nodeGraphData.edges.length > 0) {
      context += `\nConnections (${nodeGraphData.edges.length}):\n`
      nodeGraphData.edges.forEach((edge, index) => {
        const fromNode = nodeGraphData.nodes?.find(n => n.id === edge.fromNodeId)
        const toNode = nodeGraphData.nodes?.find(n => n.id === edge.toNodeId)
        context += `${index + 1}. ${fromNode?.title || edge.fromNodeId} → ${toNode?.title || edge.toNodeId}\n`
      })
    } else {
      context += "\nNo connections between nodes yet.\n"
    }

    context += `\nUser Question: ${userQuery}\n\n`
    
    // Check if user wants to create nodes
    const isCreationRequest = /(create|add|make|set up|build|configure|want|need|detect|when|if).*(node|workflow|detection|action|analyze|text|message|email|notification)/i.test(userQuery)
    
    if (isCreationRequest) {
      context += `IMPORTANT: The user wants to create nodes. You MUST respond with a JSON object in this exact format:
{
  "response": "Your natural language response explaining what you're creating",
  "createNodes": [
    {
      "type": "analyze",
      "title": "Descriptive title for the analyze node",
      "config": {
        "prompt": "Detailed description of what to detect (e.g., 'Detect when a person falls down')",
        "sensitivity": "medium"
      }
    },
    {
      "type": "action",
      "title": "Descriptive title for the action node",
      "config": {
        "option": "text",
        "description": "What action to take (e.g., 'Send a text message to +1234567890 when person falls detected')"
      }
    }
  ]
}

Action node option mapping:
- "text" = Text message / SMS
- "email" = Email notification
- "call" = Phone call

If the user mentions "text message", "SMS", "text", use "text".
If the user mentions "email", "mail", use "email".
If the user mentions "phone call", "call", use "call".
Otherwise, use "text" as default.

Always create nodes in order: analyze node first, then action node(s).
Connect them: video_input -> analyze -> action`
    } else {
      context += `Please provide a helpful, clear answer about the node graph. If the user asks about how to do something, provide step-by-step instructions. If they ask about the current state, describe what you see. Be concise but thorough.`
    }

    return context
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const query = inputValue.trim()
    setInputValue("")
    setIsLoading(true)

    try {
      const prompt = buildContextPrompt(query)

      const response = await fetch(
        `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response."

      // Try to parse JSON response for node creation
      let parsedResponse: any = null
      try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        // Not JSON, treat as regular response
      }

      let displayText = text
      if (parsedResponse && parsedResponse.createNodes && Array.isArray(parsedResponse.createNodes)) {
        displayText = parsedResponse.response || text
        
        // Create nodes if callback is provided
        if (onCreateNodes) {
          onCreateNodes(parsedResponse.createNodes)
        }
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: displayText,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-[400px] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Chat Assistant</h3>
        </div>
      </div>

      {/* Message History Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/50 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <Bot className="size-12 text-zinc-600 mx-auto" />
              <p className="text-zinc-500 text-sm">No messages yet</p>
              <p className="text-zinc-600 text-xs">Start a conversation to get help with your workflow</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Bot className="size-4 text-blue-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="size-4 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Bot className="size-4 text-blue-400" />
                </div>
                <div className="bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900/40 p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about workflows, nodes, or get help..."
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none min-h-[60px] max-h-[120px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

