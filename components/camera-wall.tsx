"use client"

import { CameraTile } from "@/components/camera-tile"
import { VideoFeedPlaceholder } from "@/components/VideoFeedPlaceholder"
import { ExpandedVideoPanel } from "@/components/ExpandedVideoPanel"
import type { CameraFeed, Incident } from "@/types/lumenta"
import { useEffect, useState } from "react"

interface CameraWallProps {
  feeds: CameraFeed[]
  selectedFeedId: string | null
  privacyMode: boolean
  onSelectFeed: (feedId: string) => void
  onToggleFeed: (feedId: string) => void
  onRestartFeed: (feedId: string) => void
  onRemoveFeed: (feedId: string) => void
  onAddIncident: (incident: Incident) => void
  onUpdateMetrics: (feedId: string, metrics: Partial<CameraFeed>) => void
}

export function CameraWall({
  feeds,
  selectedFeedId,
  privacyMode,
  onSelectFeed,
  onToggleFeed,
  onRestartFeed,
  onRemoveFeed,
  onAddIncident,
  onUpdateMetrics,
}: CameraWallProps) {
  // Load a sample video on mount if no feeds exist
  const [sampleLoaded, setSampleLoaded] = useState(false)
  const [isPlaceholderActive, setIsPlaceholderActive] = useState(false)

  useEffect(() => {
    if (feeds.length === 0 && !sampleLoaded) {
      setSampleLoaded(true)
      // Create a sample feed with a placeholder video
      const sampleFeed: CameraFeed = {
        id: "sample-1",
        name: "Demo Feed 1",
        videoUrl: "/security-camera-footage.png",
        isPlaying: true,
        activity: 0,
        latency: 12,
        signalRate: 0,
      }
      // This would typically come from props, but we'll show the empty state for now
    }
  }, [feeds.length, sampleLoaded])

  // Reset placeholder active state when feeds are added
  useEffect(() => {
    if (feeds.length > 0) {
      setIsPlaceholderActive(false)
    }
  }, [feeds.length])

  const handlePlaceholderClick = () => {
    setIsPlaceholderActive(!isPlaceholderActive)
  }

  // Show expanded view when placeholder is active
  if (isPlaceholderActive && feeds.length === 0) {
    return (
      <div className="w-full space-y-4">
        <ExpandedVideoPanel label="Camera 1" onClose={() => setIsPlaceholderActive(false)} />
      </div>
    )
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
      {feeds.length === 0 && (
        <VideoFeedPlaceholder
          label="Camera 1"
          isActive={isPlaceholderActive}
          onClick={handlePlaceholderClick}
        />
      )}
      {feeds.map((feed) => (
        <CameraTile
          key={feed.id}
          feed={feed}
          selected={selectedFeedId === feed.id}
          privacyMode={privacyMode}
          onSelect={() => onSelectFeed(feed.id)}
          onToggle={() => onToggleFeed(feed.id)}
          onRestart={() => onRestartFeed(feed.id)}
          onRemove={() => onRemoveFeed(feed.id)}
          onAddIncident={onAddIncident}
          onUpdateMetrics={onUpdateMetrics}
        />
      ))}
    </div>
  )
}
