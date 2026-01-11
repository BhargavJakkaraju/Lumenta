"use client"

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { DraggableNode, type DraggableNodeHandle } from "./DraggableNode"
import { NodeToolbar } from "./NodeToolbar"
import { NodeConfigModal } from "./NodeConfigModal"
import {
  type Edge,
  createEdge,
  isDuplicateEdge,
  isValidConnection,
  removeEdgesForNode,
} from "./edges"

export interface AnalyzeNodeConfig {
  prompt: string
  sensitivity: "low" | "medium" | "high"
}

export interface ActionNodeConfig {
  option: "call" | "email" | "text"
  description: string
}

export interface Node {
  id: string
  type: string
  title: string
  x: number
  y: number
  config?: AnalyzeNodeConfig | ActionNodeConfig | {}
}

export interface NodeCanvasHandle {
  createNodes: (nodes: Array<{
    type: "analyze" | "action"
    config: AnalyzeNodeConfig | ActionNodeConfig
    title?: string
  }>) => void
}

interface NodeCanvasProps {
  initialNodes?: Node[]
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 100
const NODE_OFFSET = 60

export const NodeCanvas = forwardRef<NodeCanvasHandle, NodeCanvasProps>(
  ({ initialNodes, onGraphChange }, ref) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasBounds, setCanvasBounds] = useState<{
    width: number
    height: number
  } | null>(null)
  const [nodeCounter, setNodeCounter] = useState(0)

  const defaultNodes: Node[] = [
    {
      id: "video-input",
      type: "video_input",
      title: "Video Input",
      x: 40,
      y: 40,
      config: {},
    },
  ]

  const [nodes, setNodes] = useState<Node[]>(initialNodes || defaultNodes)
  
  // Update video input node position to center-left when canvas bounds are available
  useEffect(() => {
    if (canvasBounds && canvasBounds.height > 0) {
      const centerY = (canvasBounds.height - NODE_HEIGHT) / 2
      setNodes((prevNodes) => {
        const videoInputNode = prevNodes.find((n) => n.id === "video-input")
        if (videoInputNode && Math.abs(videoInputNode.y - centerY) > 1) {
          return prevNodes.map((node) =>
            node.id === "video-input" ? { ...node, x: 40, y: centerY } : node
          )
        }
        return prevNodes
      })
    }
  }, [canvasBounds])
  const [edges, setEdges] = useState<Edge[]>([])

  // Notify parent of graph changes (use ref to avoid infinite loops)
  const onGraphChangeRef = useRef(onGraphChange)
  useEffect(() => {
    onGraphChangeRef.current = onGraphChange
  }, [onGraphChange])

  useEffect(() => {
    if (onGraphChangeRef.current) {
      onGraphChangeRef.current(nodes, edges)
    }
  }, [nodes, edges])

  const [connectingState, setConnectingState] = useState<{
    isConnecting: boolean
    fromNodeId: string
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const nodeRefs = useRef<Map<string, DraggableNodeHandle>>(new Map())
  const connectingStateRef = useRef<{
    fromNodeId: string
    startX: number
    startY: number
  } | null>(null)

  // Update canvas bounds when component mounts or resizes
  useEffect(() => {
    const updateBounds = () => {
      if (canvasRef.current) {
        setCanvasBounds({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        })
      }
    }

    updateBounds()

    const resizeObserver = new ResizeObserver(updateBounds)
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current)
    }

    window.addEventListener("resize", updateBounds)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateBounds)
    }
  }, [])

  const handleNodePositionChange = (id: string, x: number, y: number) => {
    // Prevent position changes for video input node
    const node = nodes.find((n) => n.id === id)
    if (node && node.type === "video_input") {
      return
    }
    setNodes((prevNodes) =>
      prevNodes.map((node) => (node.id === id ? { ...node, x, y } : node))
    )
  }

  const getNextNodePosition = (): { x: number; y: number } => {
    // Spawn nodes in the center of the canvas
    if (canvasBounds && canvasBounds.width > 0 && canvasBounds.height > 0) {
      return {
        x: (canvasBounds.width - NODE_WIDTH) / 2,
        y: (canvasBounds.height - NODE_HEIGHT) / 2,
      }
    }
    // Fallback to center of a default-sized canvas if bounds aren't available yet
    return {
      x: 400,
      y: 200,
    }
  }

  const handleAddNode = (type: "analyze" | "action", config?: AnalyzeNodeConfig | ActionNodeConfig, title?: string, customPosition?: { x: number; y: number }) => {
    // Generate unique ID using timestamp, counter, and random number to avoid collisions
    const newId = `node-${Date.now()}-${nodeCounter}-${Math.random().toString(36).substring(2, 9)}`
    const position = customPosition || getNextNodePosition()

    const defaultConfig =
      type === "analyze"
        ? (config || { prompt: "", sensitivity: "medium" } as AnalyzeNodeConfig)
        : type === "action"
          ? (config || { option: "call", description: "" } as ActionNodeConfig)
          : {}

    const newNode: Node = {
      id: newId,
      type,
      title: title || (type === "analyze" ? "Analyze" : "Action"),
      x: position.x,
      y: position.y,
      config: defaultConfig,
    }

    setNodes((prevNodes) => {
      // Check if a node with the same ID already exists
      if (prevNodes.some(n => n.id === newId)) {
        console.warn(`Node with ID ${newId} already exists, skipping duplicate`)
        return prevNodes
      }
      return [...prevNodes, newNode]
    })
    setNodeCounter((prev) => prev + 1)
    return newId
  }

  // Expose node creation method via ref
  useImperativeHandle(ref, () => ({
    createNodes: (nodesToCreate: Array<{
      type: "analyze" | "action"
      config: AnalyzeNodeConfig | ActionNodeConfig
      title?: string
    }>) => {
      const videoInputNode = nodes.find(n => n.type === "video_input")
      const createdNodes: Array<{ id: string; type: "analyze" | "action"; index: number }> = []
      let analyzeNodeId: string | null = null
      let actionNodeCount = 0
      
      // Calculate positions based on canvas bounds
      const getNodePosition = (index: number, type: "analyze" | "action", actionIndex: number) => {
        if (!canvasBounds || canvasBounds.width === 0 || canvasBounds.height === 0) {
          // Fallback positions
          if (type === "analyze") {
            return { x: 300, y: 200 }
          } else {
            return { x: 550, y: 150 + (actionIndex * 120) }
          }
        }
        
        const centerY = canvasBounds.height / 2
        if (type === "analyze") {
          // Position analyze node to the right of video input
          return { x: 300, y: centerY - NODE_HEIGHT / 2 }
        } else {
          // Position action nodes to the right of analyze node, stacked vertically
          const actionY = centerY - NODE_HEIGHT / 2 + (actionIndex * 120) - 60
          return { x: 550, y: Math.max(40, Math.min(actionY, canvasBounds.height - NODE_HEIGHT - 40)) }
        }
      }
      
      // Step 1: Create all nodes first
      nodesToCreate.forEach((nodeSpec, index) => {
        let actionIndex = 0
        if (nodeSpec.type === "action") {
          actionIndex = actionNodeCount
          actionNodeCount++
        }
        
        const position = getNodePosition(index, nodeSpec.type, actionIndex)
        const nodeId = handleAddNode(
          nodeSpec.type,
          nodeSpec.config,
          nodeSpec.title,
          position
        )
        
        createdNodes.push({ id: nodeId, type: nodeSpec.type, index })
        
        // Track analyze node ID
        if (nodeSpec.type === "analyze") {
          analyzeNodeId = nodeId
        }
      })
      
      // Step 2: Create all edges after nodes are created
      // Use setTimeout to ensure nodes are in state before creating edges
      setTimeout(() => {
        createdNodes.forEach((createdNode) => {
          if (createdNode.type === "analyze") {
            // Connect video input to analyze node
            if (videoInputNode) {
              const newEdge = createEdge(videoInputNode.id, createdNode.id)
              setEdges((prev) => {
                if (isDuplicateEdge(prev, videoInputNode.id, createdNode.id)) {
                  return prev
                }
                return [...prev, newEdge]
              })
            }
          } else if (createdNode.type === "action") {
            // Connect action nodes to the analyze node
            if (analyzeNodeId) {
              const newEdge = createEdge(analyzeNodeId, createdNode.id)
              setEdges((prev) => {
                if (isDuplicateEdge(prev, analyzeNodeId!, createdNode.id)) {
                  return prev
                }
                return [...prev, newEdge]
              })
            }
          }
        })
      }, 100)
    }
  }))

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId))
    setEdges((prevEdges) => removeEdgesForNode(prevEdges, nodeId))
    nodeRefs.current.delete(nodeId)
  }

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (node && (node.type === "analyze" || node.type === "action")) {
      setSelectedNodeId(nodeId)
      setConfigModalOpen(true)
    }
  }

  const handleSaveConfig = (
    nodeId: string,
    config: AnalyzeNodeConfig | ActionNodeConfig
  ) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId ? { ...node, config } : node
      )
    )
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedNodeType =
    selectedNode?.type === "analyze" || selectedNode?.type === "action"
      ? selectedNode.type
      : null

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string, handleType: "output" | "input") => {
      if (handleType !== "output") return

      const node = nodes.find((n) => n.id === nodeId)
      if (!node || (node.type !== "analyze" && node.type !== "video_input")) return

      const canvasRect = canvasRef.current?.getBoundingClientRect()
      if (!canvasRect) return

      const handle = nodeRefs.current.get(nodeId)
      const handlePos = handle?.getHandlePosition("output")
      if (!handlePos) return

      const connectingInfo = {
        fromNodeId: nodeId,
        startX: handlePos.x,
        startY: handlePos.y,
      }

      connectingStateRef.current = connectingInfo

      setConnectingState({
        isConnecting: true,
        ...connectingInfo,
        currentX: e.clientX - canvasRect.left,
        currentY: e.clientY - canvasRect.top,
      })

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (canvasRef.current && connectingStateRef.current) {
          const rect = canvasRef.current.getBoundingClientRect()
          setConnectingState((prev) =>
            prev
              ? {
                  ...prev,
                  currentX: moveEvent.clientX - rect.left,
                  currentY: moveEvent.clientY - rect.top,
                }
              : null
          )
        }
      }

      const handlePointerUp = (upEvent: PointerEvent) => {
        const currentConnecting = connectingStateRef.current
        connectingStateRef.current = null

        if (!currentConnecting) {
          setConnectingState(null)
          window.removeEventListener("pointermove", handlePointerMove)
          window.removeEventListener("pointerup", handlePointerUp)
          return
        }

        // Find which node (if any) the pointer was released over
        const canvasRect = canvasRef.current?.getBoundingClientRect()
        if (!canvasRect) {
          setConnectingState(null)
          window.removeEventListener("pointermove", handlePointerMove)
          window.removeEventListener("pointerup", handlePointerUp)
          return
        }

        const pointX = upEvent.clientX - canvasRect.left
        const pointY = upEvent.clientY - canvasRect.top

        // Get the source node type
        const sourceNode = nodes.find((n) => n.id === currentConnecting.fromNodeId)
        if (!sourceNode) {
          setConnectingState(null)
          window.removeEventListener("pointermove", handlePointerMove)
          window.removeEventListener("pointerup", handlePointerUp)
          return
        }

        // Check each target node's input handle (Action or Analyze nodes)
        setNodes((currentNodes) => {
          setEdges((currentEdges) => {
            for (const node of currentNodes) {
              // Video Input can connect to Analyze or Action
              // Analyze can only connect to Action
              const canConnectToThisNode =
                (sourceNode.type === "video_input" && (node.type === "analyze" || node.type === "action")) ||
                (sourceNode.type === "analyze" && node.type === "action")

              if (!canConnectToThisNode) continue

              // Both Action and Analyze nodes have input handles
              if (node.type === "action" || node.type === "analyze") {
                const handle = nodeRefs.current.get(node.id)
                const handlePos = handle?.getHandlePosition("input")
                if (!handlePos) continue

                const distance = Math.sqrt(
                  Math.pow(pointX - handlePos.x, 2) + Math.pow(pointY - handlePos.y, 2)
                )

                if (distance < 20) {
                  // Within drop zone
                  if (
                    isValidConnection(sourceNode.type, node.type) &&
                    !isDuplicateEdge(currentEdges, currentConnecting.fromNodeId, node.id)
                  ) {
                    const newEdge = createEdge(currentConnecting.fromNodeId, node.id)
                    return [...currentEdges, newEdge]
                  }
                  break
                }
              }
            }
            return currentEdges
          })
          return currentNodes
        })

        setConnectingState(null)
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
      }

      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", handlePointerUp)
    },
    [nodes, edges]
  )

  const getEdgePath = (edge: Edge): string => {
    const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
    const toNode = nodes.find((n) => n.id === edge.toNodeId)
    if (!fromNode || !toNode) return ""

    const fromHandle = nodeRefs.current.get(edge.fromNodeId)?.getHandlePosition("output")
    const toHandle = nodeRefs.current.get(edge.toNodeId)?.getHandlePosition("input")
    if (!fromHandle || !toHandle) return ""

    // Create a curved path
    const dx = toHandle.x - fromHandle.x
    const dy = toHandle.y - fromHandle.y
    const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 100)

    return `M ${fromHandle.x} ${fromHandle.y} C ${fromHandle.x + controlPointOffset} ${fromHandle.y}, ${toHandle.x - controlPointOffset} ${toHandle.y}, ${toHandle.x} ${toHandle.y}`
  }

  return (
    <div
      ref={canvasRef}
      data-canvas
      className="relative min-h-[400px] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800"
      style={{ position: "relative" }}
    >
      <NodeToolbar onAddNode={handleAddNode} />

      {/* SVG overlay for edges */}
      {canvasBounds && (
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          width={canvasBounds.width}
          height={canvasBounds.height}
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
              <polygon points="0 0, 10 3, 0 6" fill="#60a5fa" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const path = getEdgePath(edge)
            if (!path) return null
            return (
              <path
                key={edge.id}
                d={path}
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            )
          })}
          {connectingState && (
            <path
              d={`M ${connectingState.startX} ${connectingState.startY} L ${connectingState.currentX} ${connectingState.currentY}`}
              stroke="#60a5fa"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              opacity="0.7"
            />
          )}
        </svg>
      )}

      {/* Nodes (rendered on top of edges) */}
      {nodes.map((node) => (
        <DraggableNode
          key={node.id}
          ref={(handle) => {
            if (handle) {
              nodeRefs.current.set(node.id, handle)
            } else {
              nodeRefs.current.delete(node.id)
            }
          }}
          id={node.id}
          type={node.type}
          title={node.title}
          x={node.x}
          y={node.y}
          config={node.config}
          onPositionChange={handleNodePositionChange}
          onDelete={handleDeleteNode}
          onHandlePointerDown={handleHandlePointerDown}
          onNodeClick={handleNodeClick}
          canvasBounds={canvasBounds}
        />
      ))}

      {/* Configuration Modal */}
      <NodeConfigModal
        isOpen={configModalOpen}
        nodeType={selectedNodeType}
        nodeId={selectedNodeId}
        config={
          selectedNode?.config && selectedNodeType
            ? (selectedNode.config as AnalyzeNodeConfig | ActionNodeConfig)
            : null
        }
        onSave={handleSaveConfig}
        onClose={() => {
          setConfigModalOpen(false)
          setSelectedNodeId(null)
        }}
      />
    </div>
  )
  }
)

NodeCanvas.displayName = "NodeCanvas"

