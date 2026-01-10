"use client"

import { useState } from "react"
import { CameraWall } from "@/components/camera-wall"
import { IncidentPanel } from "@/components/incident-panel"
import { ConsoleTopBar } from "@/components/console-top-bar"
import type { CameraFeed, Incident } from "@/types/lumenta"

export function ConsoleView() {
  const [feeds, setFeeds] = useState<CameraFeed[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [privacyMode, setPrivacyMode] = useState(true)
  const [globalPaused, setGlobalPaused] = useState(false)

  const handleAddClip = (file: File) => {
    const videoUrl = URL.createObjectURL(file)
    const newFeed: CameraFeed = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      videoUrl,
      isPlaying: !globalPaused,
      activity: 0,
      latency: 0,
      signalRate: 0,
    }
    setFeeds((prev) => [...prev, newFeed])
  }

  const handleRemoveFeed = (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId)
    if (feed) {
      URL.revokeObjectURL(feed.videoUrl)
      setFeeds((prev) => prev.filter((f) => f.id !== feedId))
      setIncidents((prev) => prev.filter((i) => i.feedId !== feedId))
    }
  }

  const handleToggleFeed = (feedId: string) => {
    setFeeds((prev) => prev.map((f) => (f.id === feedId ? { ...f, isPlaying: !f.isPlaying } : f)))
  }

  const handleRestartFeed = (feedId: string) => {
    // Handled by the camera tile component
  }

  const handlePlayPauseAll = () => {
    const newPaused = !globalPaused
    setGlobalPaused(newPaused)
    setFeeds((prev) => prev.map((f) => ({ ...f, isPlaying: !newPaused })))
  }

  const handleClearIncidents = () => {
    if (confirm("Clear all incidents?")) {
      setIncidents([])
    }
  }

  const handleAddIncident = (incident: Incident) => {
    setIncidents((prev) => [incident, ...prev])
  }

  const handleUpdateFeedMetrics = (feedId: string, metrics: Partial<CameraFeed>) => {
    setFeeds((prev) => prev.map((f) => (f.id === feedId ? { ...f, ...metrics } : f)))
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      <ConsoleTopBar
        feedCount={feeds.length}
        incidentCount={incidents.filter((i) => i.status === "open").length}
        privacyMode={privacyMode}
        onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        onAddClip={handleAddClip}
        onPlayPauseAll={handlePlayPauseAll}
        onClearIncidents={handleClearIncidents}
        isPlaying={!globalPaused}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Camera Wall */}
        <div className="flex-1 overflow-auto p-4">
          <CameraWall
            feeds={feeds}
            selectedFeedId={selectedFeedId}
            onSelectFeed={setSelectedFeedId}
            onToggleFeed={handleToggleFeed}
            onRestartFeed={handleRestartFeed}
            onRemoveFeed={handleRemoveFeed}
            onAddIncident={handleAddIncident}
            onUpdateMetrics={handleUpdateFeedMetrics}
            privacyMode={privacyMode}
          />
        </div>

        {/* Right Pane: Incident Panel */}
        <div className="w-96 border-l border-zinc-800 overflow-auto">
          <IncidentPanel
            incidents={incidents}
            feeds={feeds}
            selectedFeedId={selectedFeedId}
            onSelectFeed={setSelectedFeedId}
            onUpdateIncident={(id, updates) => {
              setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)))
            }}
          />
        </div>
      </div>
    </div>
  )
}
