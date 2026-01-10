"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Filter } from "lucide-react"
import type { Incident } from "@/types/lumenta"

interface LogsViewProps {
  incidents: Incident[]
}

export function LogsView({ incidents }: LogsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch =
        searchQuery === "" ||
        incident.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.feedId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = filterType === "all" || incident.type === filterType
      const matchesStatus = filterStatus === "all" || incident.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [incidents, searchQuery, filterType, filterStatus])

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
    return Array.from(new Set(incidents.map((i) => i.type)))
  }, [incidents])

  return (
    <div className="p-6 space-y-6 h-full w-full max-w-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Detection Logs</h1>
          <p className="text-zinc-400 mt-1">
            View all past detections and incidents ({filteredIncidents.length} total)
          </p>
        </div>
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
              {incidents.length === 0
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
                      {getTypeBadge(incident.type)}
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

