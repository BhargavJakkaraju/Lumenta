"use client"

import { useRef, forwardRef, useImperativeHandle } from "react"
import { X } from "lucide-react"

interface AnalyzeNodeConfig {
  prompt: string
  sensitivity: "low" | "medium" | "high"
}

interface ActionNodeConfig {
  option: "option1" | "option2" | "option3" | "option4" | "option5"
  description: string
}

interface DraggableNodeProps {
  id: string
  type: string
  title: string
  x: number
  y: number
  config?: AnalyzeNodeConfig | ActionNodeConfig | {}
  onPositionChange: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
  onHandlePointerDown?: (e: React.PointerEvent, nodeId: string, handleType: "output" | "input") => void
  onNodeClick?: (nodeId: string) => void
  canvasBounds: { width: number; height: number } | null
}

export interface DraggableNodeHandle {
  getHandlePosition: (handleType: "output" | "input") => { x: number; y: number } | null
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 100
const HANDLE_SIZE = 12

export const DraggableNode = forwardRef<DraggableNodeHandle, DraggableNodeProps>(
  ({ id, type, title, x, y, config, onPositionChange, onDelete, onHandlePointerDown, onNodeClick, canvasBounds }, ref) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const outputHandleRef = useRef<HTMLDivElement>(null)
  const inputHandleRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{
    isDragging: boolean
    startX: number
    startY: number
    initialX: number
    initialY: number
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  })

  useImperativeHandle(ref, () => ({
    getHandlePosition: (handleType: "output" | "input") => {
      if (!nodeRef.current) return null
      const handleRef = handleType === "output" ? outputHandleRef.current : inputHandleRef.current
      if (!handleRef) return null

      const nodeRect = nodeRef.current.getBoundingClientRect()
      const handleRect = handleRef.getBoundingClientRect()
      const canvasRect = nodeRef.current.closest('[data-canvas]')?.getBoundingClientRect()
      
      if (!canvasRect) return null

      return {
        x: handleRect.left - canvasRect.left + handleRect.width / 2,
        y: handleRect.top - canvasRect.top + handleRect.height / 2,
      }
    },
  }))

  const constrainPosition = (newX: number, newY: number): { x: number; y: number } => {
    if (!canvasBounds) return { x: newX, y: newY }

    const constrainedX = Math.max(0, Math.min(newX, canvasBounds.width - NODE_WIDTH))
    const constrainedY = Math.max(0, Math.min(newY, canvasBounds.height - NODE_HEIGHT))

    return { x: constrainedX, y: constrainedY }
  }

  const handleNodePointerDown = (e: React.PointerEvent) => {
    // Don't allow dragging for video input nodes
    if (type === "video_input") {
      return
    }

    // Don't drag if clicking on delete button or handle
    const target = e.target as HTMLElement
    if (target.closest('[data-delete-button]') || target.closest('[data-handle]')) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const node = nodeRef.current
    if (!node || !canvasBounds) return

    dragStateRef.current = {
      isDragging: false, // Start as false, will be set to true on move
      startX: e.clientX,
      startY: e.clientY,
      initialX: x,
      initialY: y,
    }

    node.setPointerCapture(e.pointerId)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(id)
  }

  const handleHandlePointerDown = (e: React.PointerEvent, handleType: "output" | "input") => {
    e.preventDefault()
    e.stopPropagation()
    if (onHandlePointerDown) {
      onHandlePointerDown(e, id, handleType)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only process if we have an active drag state and pointer is captured
    if (!canvasBounds || !dragStateRef.current) return
    
    const node = nodeRef.current
    if (!node || !node.hasPointerCapture(e.pointerId)) return

    // Calculate movement distance
    const deltaX = e.clientX - dragStateRef.current.startX
    const deltaY = e.clientY - dragStateRef.current.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Only start dragging if moved more than 5px (to distinguish from click)
    if (!dragStateRef.current.isDragging && distance > 5) {
      dragStateRef.current.isDragging = true
      node.style.cursor = "grabbing"
    }

    if (dragStateRef.current.isDragging) {
      const newX = dragStateRef.current.initialX + deltaX
      const newY = dragStateRef.current.initialY + deltaY

      const constrained = constrainPosition(newX, newY)
      onPositionChange(id, constrained.x, constrained.y)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasDragging = dragStateRef.current?.isDragging ?? false

    const node = nodeRef.current
    if (node) {
      node.releasePointerCapture(e.pointerId)
      node.style.cursor = "grab"
    }

    // If we didn't drag (or moved very little), treat it as a click
    if (!wasDragging && onNodeClick && (type === "analyze" || type === "action")) {
      onNodeClick(id)
    }

    if (dragStateRef.current) {
      dragStateRef.current.isDragging = false
    }
  }

  const getConfigSummary = () => {
    if (!config || type === "video_input") return null

    if (type === "analyze") {
      const analyzeConfig = config as AnalyzeNodeConfig
      if (analyzeConfig.prompt) {
        const promptPreview =
          analyzeConfig.prompt.length > 40
            ? analyzeConfig.prompt.substring(0, 40) + "..."
            : analyzeConfig.prompt
        return `${promptPreview} (${analyzeConfig.sensitivity})`
      }
      return null
    }

    if (type === "action") {
      const actionConfig = config as ActionNodeConfig
      if (actionConfig.description || actionConfig.option) {
        const optionLabel = actionConfig.option.replace("option", "Option ")
        const descPreview = actionConfig.description
          ? actionConfig.description.length > 40
            ? actionConfig.description.substring(0, 40) + "..."
            : actionConfig.description
          : ""
        return descPreview
          ? `${optionLabel}: ${descPreview}`
          : optionLabel
      }
      return null
    }

    return null
  }

  return (
    <div
      ref={nodeRef}
      className={`absolute select-none ${type === "video_input" ? "cursor-default" : "cursor-grab"}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${NODE_WIDTH}px`,
      }}
      onPointerDown={handleNodePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Input Handle (left side, for Action and Analyze nodes) */}
      {(type === "action" || type === "analyze") && (
        <div
          ref={inputHandleRef}
          data-handle="input"
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-900 cursor-crosshair hover:bg-blue-400 z-10"
          onPointerDown={(e) => handleHandlePointerDown(e, "input")}
        />
      )}

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-lg relative">
        {/* Header */}
        <div className="bg-zinc-700 px-3 py-2 border-b border-zinc-600 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            data-delete-button
            onClick={handleDeleteClick}
            className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded"
            aria-label="Delete node"
          >
            <X className="size-3" />
          </button>
        </div>
        {/* Body */}
        <div className="p-3 space-y-1">
          {type === "video_input" && (
            <>
              <p className="text-xs text-zinc-400">Source: Camera Feed</p>
              <p className="text-xs text-zinc-500">Connected: false</p>
            </>
          )}
          {type === "analyze" && (
            <p className="text-xs text-zinc-400">
              {getConfigSummary() || "Prompt: (coming soon)"}
            </p>
          )}
          {type === "action" && (
            <p className="text-xs text-zinc-400">
              {getConfigSummary() || "Action: (coming soon)"}
            </p>
          )}
        </div>
      </div>

      {/* Output Handle (right side, for Analyze and Video Input nodes) */}
      {(type === "analyze" || type === "video_input") && (
        <div
          ref={outputHandleRef}
          data-handle="output"
          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900 cursor-crosshair hover:bg-green-400 z-10"
          onPointerDown={(e) => handleHandlePointerDown(e, "output")}
        />
      )}
    </div>
  )
})

