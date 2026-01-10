"use client"

import { NodeCanvas } from "@/components/nodeGraph/NodeCanvas"

interface ExpandedVideoPanelProps {
  label?: string
  onClose?: () => void
}

export function ExpandedVideoPanel({ label = "Camera 1", onClose }: ExpandedVideoPanelProps) {
  return (
    <div className="w-full space-y-6">
      {/* Expanded Video Placeholder */}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">{label} – Expanded View</p>
        <div
          onClick={onClose}
          className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <p className="text-zinc-500 text-base">Sample Video Feed</p>
        </div>
      </div>

      {/* Node Graph Area */}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">Node Graph</p>
        <NodeCanvas />
      </div>
    </div>
  )
}

