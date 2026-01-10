"use client"

import { useState, useMemo } from "react"
import { Search, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { CameraFeed, Incident } from "@/types/lumenta"
import { IncidentDetails } from "@/components/incident-details"

interface IncidentPanelProps {
  incidents: Incident[]
  feeds: CameraFeed[]
  selectedFeedId: string | null
  onSelectFeed: (feedId: string) => void
  onUpdateIncident: (id: string, updates: Partial<Incident>) => void
}

export function IncidentPanel({
  incidents,
  feeds,
  selectedFeedId,
  onSelectFeed,
  onUpdateIncident,
}: IncidentPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [feedFilter, setFeedFilter] = useState<string>("all")
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch =
        searchQuery === "" ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.feedName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter
      const matchesFeed = feedFilter === "all" || incident.feedId === feedFilter
      return matchesSearch && matchesSeverity && matchesFeed
    })
  }, [incidents, searchQuery, severityFilter, feedFilter])

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId)

  if (selectedIncident) {
    return (
      <IncidentDetails
        incident={selectedIncident}
        feeds={feeds}
        onClose={() => setSelectedIncidentId(null)}
        onUpdate={(updates) => onUpdateIncident(selectedIncident.id, updates)}
        onSelectFeed={onSelectFeed}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/40">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-4">Incidents</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="all">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={feedFilter}
            onChange={(e) => setFeedFilter(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="all">All Feeds</option>
            {feeds.map((feed) => (
              <option key={feed.id} value={feed.id}>
                {feed.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-auto">
        {filteredIncidents.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Info className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">No incidents to display</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredIncidents.map((incident) => (
              <button
                key={incident.id}
                onClick={() => setSelectedIncidentId(incident.id)}
                className="w-full p-4 text-left hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {incident.severity === "high" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    {incident.severity === "medium" && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    {incident.severity === "low" && <Info className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          incident.severity === "high"
                            ? "bg-red-900/40 text-red-400"
                            : incident.severity === "medium"
                              ? "bg-yellow-900/40 text-yellow-400"
                              : "bg-blue-900/40 text-blue-400"
                        }`}
                      >
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-500">{incident.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-white mb-1 leading-relaxed">{incident.description}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{incident.feedName}</span>
                      <span>•</span>
                      <span>{incident.confidence}% confidence</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
