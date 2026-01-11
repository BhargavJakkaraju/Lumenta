"use client"

import { useState, useEffect, useMemo } from "react"
import { CameraTile } from "@/components/camera-tile"
import type { CameraFeed, Incident } from "@/types/lumenta"
import { useRouter } from "next/navigation"
import { STOCK_FEEDS } from "@/components/camera-detail-view"

interface CameraWallProps {
  feeds: CameraFeed[]
  selectedFeedId: string | null
  privacyMode: boolean
  globalPaused?: boolean
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
  globalPaused = false,
  onSelectFeed,
  onToggleFeed,
  onRestartFeed,
  onRemoveFeed,
  onAddIncident,
  onUpdateMetrics,
}: CameraWallProps) {
  const router = useRouter()
  // Track playing state for stock feeds
  const [stockFeedStates, setStockFeedStates] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {}
    STOCK_FEEDS.forEach(feed => {
      initialState[feed.id] = !globalPaused
    })
    return initialState
  })

  // Sync stock feed states with global pause state
  useEffect(() => {
    if (feeds.length === 0) {
      setStockFeedStates((prev) => {
        const newStates: Record<string, boolean> = {}
        STOCK_FEEDS.forEach(feed => {
          newStates[feed.id] = !globalPaused
        })
        return newStates
      })
    }
  }, [globalPaused, feeds.length])

  // Use stock feeds if no feeds are provided, but respect the global paused state and local state
  const displayFeeds = useMemo(() => {
    if (feeds.length > 0) {
      return feeds
    }
    return STOCK_FEEDS.map(feed => ({ 
      ...feed, 
      isPlaying: stockFeedStates[feed.id] !== undefined ? stockFeedStates[feed.id] : !globalPaused 
    }))
  }, [feeds, stockFeedStates, globalPaused])

  const handleCameraClick = (feedId: string) => {
    router.push(`/console/feeds/${feedId}`)
  }

  const handleStockFeedToggle = (feedId: string) => {
    setStockFeedStates((prev) => ({
      ...prev,
      [feedId]: !prev[feedId]
    }))
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
            onToggle={() => {
              if (feeds.length > 0) {
                // User-added feed - use the parent handler
                onToggleFeed(feed.id)
              } else {
                // Stock feed - use local state
                handleStockFeedToggle(feed.id)
              }
            }}
            onAddIncident={onAddIncident}
            onUpdateMetrics={onUpdateMetrics}
          />
        </div>
      ))}
    </div>
  )
}
