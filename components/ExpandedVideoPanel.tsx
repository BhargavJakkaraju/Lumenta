"use client"

import { useRef } from "react"
import { VideoPlayer, type VideoPlayerRef } from "@/components/video-player"
import { NodeCanvas } from "@/components/nodeGraph/NodeCanvas"
import { STOCK_FEEDS } from "@/components/camera-detail-view"

interface ExpandedVideoPanelProps {
  label?: string
  onClose?: () => void
}

export function ExpandedVideoPanel({ label = "Camera 1", onClose }: ExpandedVideoPanelProps) {
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)
  // Use the first stock feed (camera-1)
  const feed = STOCK_FEEDS[0]

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
        <NodeCanvas />
      </div>
    </div>
  )
}

