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

  const handleAddNode = (type: "analyze" | "action", config?: AnalyzeNodeConfig | ActionNodeConfig, title?: string) => {
    const newId = `node-${Date.now()}-${nodeCounter}`
    const position = getNextNodePosition()

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

    setNodes((prevNodes) => [...prevNodes, newNode])
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
      const createdNodeIds: string[] = []
      
      nodesToCreate.forEach((nodeSpec, index) => {
        const nodeId = handleAddNode(
          nodeSpec.type,
          nodeSpec.config,
          nodeSpec.title
        )
        createdNodeIds.push(nodeId)
        
        // Connect to video input if it's the first analyze node, or to previous node
        if (videoInputNode) {
          if (nodeSpec.type === "analyze" && index === 0) {
            // Connect video input to first analyze node
            const newEdge = createEdge(videoInputNode.id, nodeId)
            setEdges((prev) => [...prev, newEdge])
          } else if (index > 0 && createdNodeIds[index - 1]) {
            // Connect previous node to current node
            const newEdge = createEdge(createdNodeIds[index - 1], nodeId)
            setEdges((prev) => [...prev, newEdge])
          }
        }
      })
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

