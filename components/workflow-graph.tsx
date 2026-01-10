"use client"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Camera,
  Eye,
  Settings,
  Plus,
  Trash2,
  Mic,
  Save,
  Download,
  Upload,
  Maximize2,
  Home,
  Mail,
  Phone,
} from "lucide-react"
import type { VideoEvent } from "@/types/lumenta"

interface WorkflowGraphProps {
  feedId: string
  events: VideoEvent[]
}

interface Node {
  id: string
  type: "input" | "detection" | "action"
  title: string
  description: string
  x: number
  y: number
  data?: {
    email?: string
    phone?: string
    actionType?: string
  }
}

interface Connection {
  id: string
  from: string
  to: string
}

export function WorkflowGraph({ feedId, events }: WorkflowGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: "node-1",
      type: "input",
      title: "Video Input",
      description: "Hospital Surveillance",
      x: 50,
      y: 200,
    },
    {
      id: "node-2",
      type: "detection",
      title: "Detection Rule",
      description: "Fighting",
      x: 300,
      y: 150,
    },
    {
      id: "node-3",
      type: "detection",
      title: "Detection Rule",
      description: "Robbery near counter",
      x: 300,
      y: 250,
    },
    {
      id: "node-4",
      type: "action",
      title: "Action",
      description: "@gmail Notify boss",
      x: 550,
      y: 150,
      data: {
        email: "angelafelicia18@gmail.com",
        actionType: "gmail",
      },
    },
    {
      id: "node-5",
      type: "action",
      title: "Action",
      description: "Notify Police 4083066734 Via @phone call",
      x: 550,
      y: 250,
      data: {
        phone: "4083066734",
        actionType: "phone",
      },
    },
  ])

  const [connections, setConnections] = useState<Connection[]>([
    { id: "conn-1", from: "node-1", to: "node-2" },
    { id: "conn-2", from: "node-1", to: "node-3" },
    { id: "conn-3", from: "node-2", to: "node-4" },
    { id: "conn-4", from: "node-2", to: "node-5" },
    { id: "conn-5", from: "node-3", to: "node-4" },
    { id: "conn-6", from: "node-3", to: "node-5" },
  ])

  const canvasRef = useRef<HTMLDivElement>(null)

  const getNodeIcon = (type: Node["type"]) => {
    switch (type) {
      case "input":
        return <Camera className="size-5 text-white" />
      case "detection":
        return <Eye className="size-5 text-yellow-500" />
      case "action":
        return <Settings className="size-5 text-green-500" />
    }
  }

  const getNodeColor = (type: Node["type"]) => {
    switch (type) {
      case "input":
        return "bg-zinc-800 border-zinc-700"
      case "detection":
        return "bg-zinc-800 border-zinc-700"
      case "action":
        return "bg-zinc-800 border-zinc-700"
    }
  }

  const getActionButton = (node: Node) => {
    if (node.type === "action" && node.data?.actionType) {
      if (node.data.actionType === "gmail") {
        return (
          <Button size="sm" variant="outline" className="w-full mt-2 border-zinc-600 text-zinc-300">
            <Mail className="size-3 mr-2" />
            Gmail
          </Button>
        )
      }
      if (node.data.actionType === "phone") {
        return (
          <Button size="sm" variant="outline" className="w-full mt-2 border-zinc-600 text-zinc-300">
            <Phone className="size-3 mr-2" />
            Phone Call
          </Button>
        )
      }
    }
    return null
  }

  const drawConnection = (from: Node, to: Node) => {
    const fromX = from.x + 200 // Right side of node
    const fromY = from.y + 40 // Middle of node
    const toX = to.x // Left side of node
    const toY = to.y + 40 // Middle of node

    // Bezier curve for smooth connection
    const midX = (fromX + toX) / 2
    const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`

    return (
      <path
        key={`${from.id}-${to.id}`}
        d={path}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        markerEnd="url(#arrowhead)"
      />
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col overflow-hidden">
      <CardHeader className="border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <span>Workflow Graph</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 border-blue-600 text-blue-400 hover:bg-blue-900/20">
              <Plus className="size-3 mr-1" />
              Add Node
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-purple-600 text-purple-400 hover:bg-purple-900/20">
              <Mic className="size-3 mr-1" />
              Voice
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-green-600 text-green-400 hover:bg-green-900/20">
              <Save className="size-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-orange-600 text-orange-400 hover:bg-orange-900/20">
              <Download className="size-3 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-cyan-600 text-cyan-400 hover:bg-cyan-900/20">
              <Upload className="size-3 mr-1" />
              Import
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-purple-600 text-purple-400 hover:bg-purple-900/20">
              <Maximize2 className="size-3 mr-1" />
              Expand
            </Button>
            <Button size="sm" variant="outline" className="h-8 border-zinc-600 text-zinc-400 hover:bg-zinc-800">
              <Home className="size-3 mr-1" />
              Home
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 min-h-0 relative bg-zinc-950">
        {/* SVG for connections */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.from)
            const toNode = nodes.find((n) => n.id === conn.to)
            if (fromNode && toNode) {
              return drawConnection(fromNode, toNode)
            }
            return null
          })}
        </svg>

        {/* Canvas with nodes */}
        <div ref={canvasRef} className="relative w-full h-full min-h-[500px]">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute ${getNodeColor(node.type)} border rounded-lg p-3 min-w-[200px] max-w-[250px]`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
            >
              {/* Node Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getNodeIcon(node.type)}
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                    <Plus className="size-3" />
                  </button>
                  <button className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>

              {/* Node Content */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">{node.title}</h3>
                <p className="text-xs text-zinc-400">{node.description}</p>
                {node.data?.email && (
                  <p className="text-xs text-zinc-500 mt-2">{node.data.email}</p>
                )}
                {node.data?.phone && (
                  <p className="text-xs text-zinc-500 mt-2">{node.data.phone}</p>
                )}
                {getActionButton(node)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
