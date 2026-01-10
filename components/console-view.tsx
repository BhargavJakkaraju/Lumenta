"use client"

import { useState } from "react"
import { CameraWall } from "@/components/camera-wall"
import { IncidentPanel } from "@/components/incident-panel"
import { ConsoleTopBar } from "@/components/console-top-bar"
import { ConsoleSidebar, type ConsoleView as ConsoleViewType } from "@/components/console-sidebar"
import { MCPsView } from "@/components/mcps-view"
import { AnalyticsView } from "@/components/analytics-view"
import { LogsView } from "@/components/logs-view"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import type { CameraFeed, Incident } from "@/types/lumenta"

export function ConsoleView() {
  const [currentView, setCurrentView] = useState<ConsoleViewType>("feeds")
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

  const renderView = () => {
    switch (currentView) {
      case "feeds":
        return (
          <div className="h-full w-full overflow-auto p-6">
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
        )
      case "mcps":
        return (
          <div className="h-full w-full overflow-auto min-w-0">
            <MCPsView />
          </div>
        )
      case "analytics":
        return (
          <div className="h-full w-full overflow-auto min-w-0">
            <AnalyticsView />
          </div>
        )
      case "logs":
        return (
          <div className="h-full w-full overflow-auto min-w-0">
            <LogsView incidents={incidents} />
          </div>
        )
    }
  }

  return (
    <SidebarProvider defaultOpen={true} className="w-full h-full">
      <div className="h-screen w-full flex flex-col bg-zinc-950 overflow-hidden" style={{ width: '100vw' }}>
        <div className="flex-1 flex overflow-hidden w-full">
          {/* Sidebar Navigation */}
          <ConsoleSidebar currentView={currentView} onViewChange={setCurrentView} />

          {/* Main Content Area */}
          <SidebarInset className="flex-1 flex flex-col overflow-hidden bg-zinc-950 min-w-0" style={{ width: '100%', maxWidth: 'none' }}>
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
            <div className="flex-1 overflow-hidden min-h-0 w-full h-full" style={{ width: '100%', maxWidth: 'none', height: '100%' }} key={currentView}>
              {renderView()}
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
