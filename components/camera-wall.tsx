"use client"

import { CameraTile } from "@/components/camera-tile"
import type { CameraFeed, Incident } from "@/types/lumenta"
import { useRouter } from "next/navigation"
import { STOCK_FEEDS } from "@/components/camera-detail-view"

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
  const router = useRouter()
  // Use stock feeds if no feeds are provided
  const displayFeeds = feeds.length > 0 ? feeds : STOCK_FEEDS

  const handleCameraClick = (feedId: string) => {
    router.push(`/console/feeds/${feedId}`)
  }

  if (displayFeeds.length === 0) {
    return (
      <div className="w-full flex items-center justify-center min-h-full">
        <div className="text-center">
          <p className="text-zinc-400">No camera feeds available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full grid grid-cols-3 grid-rows-3 gap-4">
      {displayFeeds.map((feed) => (
        <div key={feed.id} className="h-full min-h-0">
          <CameraTile
            feed={feed}
            selected={selectedFeedId === feed.id}
            privacyMode={privacyMode}
            onSelect={() => handleCameraClick(feed.id)}
            onToggle={() => onToggleFeed(feed.id)}
            onRestart={() => onRestartFeed(feed.id)}
            onRemove={() => onRemoveFeed(feed.id)}
            onAddIncident={onAddIncident}
            onUpdateMetrics={onUpdateMetrics}
          />
        </div>
      ))}
    </div>
  )
}
