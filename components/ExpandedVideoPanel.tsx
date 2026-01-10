"use client"

import { useRef, useState, useCallback } from "react"
import { VideoPlayer, type VideoPlayerRef } from "@/components/video-player"
import { NodeCanvas, type Node, type NodeCanvasHandle } from "@/components/nodeGraph/NodeCanvas"
import { WorkflowChatPanel } from "@/components/WorkflowChatPanel"
import { STOCK_FEEDS } from "@/components/camera-detail-view"
import type { Edge } from "@/components/nodeGraph/edges"

interface ExpandedVideoPanelProps {
  label?: string
  onClose?: () => void
}

export function ExpandedVideoPanel({ label = "Camera 1", onClose }: ExpandedVideoPanelProps) {
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)
  const nodeCanvasRef = useRef<NodeCanvasHandle | null>(null)
  const [nodeGraphData, setNodeGraphData] = useState<{
    nodes: Array<{ id: string; type: string; title: string; config?: any }>
    edges: Array<{ id: string; fromNodeId: string; toNodeId: string }>
  }>({ nodes: [], edges: [] })
  // Use the first stock feed (camera-1)
  const feed = STOCK_FEEDS[0]

  // Memoize the graph change callback
  const handleGraphChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setNodeGraphData({
      nodes: nodes.map((n: Node) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        config: n.config,
      })),
      edges: edges.map((e: Edge) => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
      })),
    })
  }, [])

  return (
    <div className="w-full space-y-6">
      {/* Video Player */}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">{feed.name} – Expanded View</p>
        <div className="h-[500px]">
          <VideoPlayer
            ref={videoPlayerRef}
            videoUrl={feed.videoUrl}
            feedName={feed.name}
          />
        </div>
      </div>

      {/* Node Graph Area */}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">Node Graph</p>
        <NodeCanvas 
          ref={nodeCanvasRef}
          onGraphChange={handleGraphChange}
        />
      </div>

      {/* Chatbot Area */}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">Chat Assistant</p>
        <WorkflowChatPanel 
          nodeGraphData={nodeGraphData}
          onCreateNodes={(nodes) => {
            if (nodeCanvasRef.current) {
              nodeCanvasRef.current.createNodes(nodes)
            }
          }}
        />
      </div>
    </div>
  )
}

