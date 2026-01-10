"use client"

import { CameraTile } from "@/components/camera-tile"
import type { CameraFeed, Incident } from "@/types/lumenta"
import { useEffect, useState } from "react"
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
      <div className="min-h-full w-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Upload className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Feeds Active</h3>
          <p className="text-zinc-400 leading-relaxed">Click "Add Clip" to upload a video file and start monitoring</p>
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

function Upload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  )
}
