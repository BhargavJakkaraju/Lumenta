"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Filter } from "lucide-react"
import type { Incident } from "@/types/lumenta"

interface LogsViewProps {
  incidents?: Incident[]
}

export function LogsView({ incidents }: LogsViewProps) {
  const [serverIncidents, setServerIncidents] = useState<Incident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [hasServerData, setHasServerData] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const getIncidentType = (incident: Incident): string => {
    if (incident.type) return incident.type
    const description = incident.description.toLowerCase()
    if (description.includes("person")) return "person"
    if (description.includes("vehicle") || description.includes("car") || description.includes("truck") || description.includes("bus")) {
      return "vehicle"
    }
    if (description.includes("object") || description.includes("package")) return "object"
    if (description.includes("alert") || description.includes("incident") || description.includes("suspicious")) {
      return "alert"
    }
    return "motion"
  }

  useEffect(() => {
    let isActive = true

    const loadDetections = async () => {
      try {
        const response = await fetch("/api/detections?limit=500")
        if (!response.ok) {
          throw new Error("Failed to load detections.")
        }
        const data = await response.json()
        const items = Array.isArray(data.items) ? data.items : []
        const parsed = items.map((item: Incident & { timestamp: string }) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }))
        if (isActive) {
          setServerIncidents(parsed)
          setHasServerData(true)
          setLoadError(null)
        }
      } catch (error: any) {
        if (isActive) {
          setLoadError(error.message || "Failed to load detections.")
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDetections()
    const interval = window.setInterval(loadDetections, 5000)

    return () => {
      isActive = false
      window.clearInterval(interval)
    }
  }, [])

  const handleClearLogs = async () => {
    if (!confirm("Clear all detection logs?")) return
    setIsClearing(true)
    try {
      const response = await fetch("/api/detections", { method: "DELETE" })
      if (!response.ok) {
        throw new Error("Failed to clear detection logs.")
      }
      setServerIncidents([])
      setHasServerData(true)
      setLoadError(null)
    } catch (error: any) {
      setLoadError(error.message || "Failed to clear detection logs.")
    } finally {
      setIsClearing(false)
    }
  }

  const effectiveIncidents = useMemo(() => {
    return hasServerData ? serverIncidents : incidents ?? []
  }, [serverIncidents, incidents, hasServerData])

  const filteredIncidents = useMemo(() => {
    return effectiveIncidents.filter((incident) => {
      const incidentType = getIncidentType(incident)
      const matchesSearch =
        searchQuery === "" ||
        incidentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.feedId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = filterType === "all" || incidentType === filterType
      const matchesStatus = filterStatus === "all" || incident.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [effectiveIncidents, searchQuery, filterType, filterStatus])

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      motion: "bg-blue-600 hover:bg-blue-700",
      person: "bg-green-600 hover:bg-green-700",
      vehicle: "bg-yellow-600 hover:bg-yellow-700",
      object: "bg-purple-600 hover:bg-purple-700",
      alert: "bg-red-600 hover:bg-red-700",
    }
    return (
      <Badge className={colors[type.toLowerCase()] || "bg-zinc-600"}>
        {type}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return status === "open" ? (
      <Badge className="bg-orange-600 hover:bg-orange-700">Open</Badge>
    ) : (
      <Badge variant="secondary">Resolved</Badge>
    )
  }

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(effectiveIncidents.map((i) => getIncidentType(i))))
  }, [effectiveIncidents])

  const summaryStats = useMemo(() => {
    const now = Date.now()
    const lastHour = now - 60 * 60 * 1000
    const lastDay = now - 24 * 60 * 60 * 1000

    const stats = {
      total: filteredIncidents.length,
      open: 0,
      resolved: 0,
      lastHour: 0,
      lastDay: 0,
      byType: new Map<string, number>(),
    }

    filteredIncidents.forEach((incident) => {
      const type = getIncidentType(incident)
      stats.byType.set(type, (stats.byType.get(type) || 0) + 1)

      if (incident.status === "open") stats.open += 1
      if (incident.status === "resolved") stats.resolved += 1

      const timestamp = new Date(incident.timestamp).getTime()
      if (timestamp >= lastHour) stats.lastHour += 1
      if (timestamp >= lastDay) stats.lastDay += 1
    })

    return stats
  }, [filteredIncidents])

  return (
    <div className="p-6 space-y-6 h-full w-full max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detection Logs</h1>
          <p className="text-zinc-400 mt-1">
            View all past detections and incidents ({filteredIncidents.length} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearLogs}
            disabled={isClearing}
            className="text-xs text-zinc-300 hover:text-white border border-zinc-700 rounded-full px-3 py-1 disabled:opacity-50"
          >
            {isClearing ? "Clearing…" : "Clear logs"}
          </button>
          <span className="text-xs text-zinc-500">
            {isLoading ? "Loading…" : loadError ? "Offline" : "Live"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="!px-4 !py-3">
            <CardTitle className="text-sm text-zinc-300">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="!px-4 !py-3 space-y-1 text-sm text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Last hour</span>
              <span className="text-white">{summaryStats.lastHour}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last 24h</span>
              <span className="text-white">{summaryStats.lastDay}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="text-white">{summaryStats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="!px-4 !py-3">
            <CardTitle className="text-sm text-zinc-300">Status</CardTitle>
          </CardHeader>
          <CardContent className="!px-4 !py-3 space-y-1 text-sm text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Open</span>
              <span className="text-white">{summaryStats.open}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Resolved</span>
              <span className="text-white">{summaryStats.resolved}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="!px-4 !py-3">
            <CardTitle className="text-sm text-zinc-300">Top Types</CardTitle>
          </CardHeader>
          <CardContent className="!px-4 !py-3 space-y-1 text-sm text-zinc-400">
            {Array.from(summaryStats.byType.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type}</span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
            {summaryStats.byType.size === 0 && (
              <span className="text-zinc-500">No detections</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Search detections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredIncidents.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="size-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">No detections found</p>
            <p className="text-zinc-500 text-sm mt-1">
              {effectiveIncidents.length === 0
                ? "No detections have been recorded yet"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 overflow-auto max-h-[calc(100vh-300px)]">
          {filteredIncidents.map((incident) => (
            <Card key={incident.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(getIncidentType(incident))}
                      {getStatusBadge(incident.status)}
                      <span className="text-xs text-zinc-500">
                        Feed: {incident.feedId.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="text-zinc-300">{incident.description}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>
                        {new Date(incident.timestamp).toLocaleString()}
                      </span>
                      {incident.confidence && (
                        <span>Confidence: {(incident.confidence * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
