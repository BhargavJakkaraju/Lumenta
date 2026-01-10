"use client"

import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CameraFeed, Incident } from "@/types/lumenta"
import { useState } from "react"

interface IncidentDetailsProps {
  incident: Incident
  feeds: CameraFeed[]
  onClose: () => void
  onUpdate: (updates: Partial<Incident>) => void
  onSelectFeed: (feedId: string) => void
}

export function IncidentDetails({ incident, feeds, onClose, onUpdate, onSelectFeed }: IncidentDetailsProps) {
  const [notes, setNotes] = useState(incident.notes || "")

  const handleAcknowledge = () => {
    onUpdate({ status: "acknowledged" })
  }

  const handleResolve = () => {
    onUpdate({ status: "resolved" })
  }

  const handleSaveNotes = () => {
    onUpdate({ notes })
  }

  const handleJumpToMoment = () => {
    onSelectFeed(incident.feedId)
    onClose()
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/40">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-semibold text-white">Incident Details</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Badge */}
        <div>
          <span
            className={`inline-block text-xs font-medium px-2 py-1 rounded ${
              incident.severity === "high"
                ? "bg-red-900/40 text-red-400"
                : incident.severity === "medium"
                  ? "bg-yellow-900/40 text-yellow-400"
                  : "bg-blue-900/40 text-blue-400"
            }`}
          >
            {incident.severity.toUpperCase()}
          </span>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Description</h3>
          <p className="text-white leading-relaxed">{incident.description}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-1">Feed</h3>
            <p className="text-white">{incident.feedName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-1">Confidence</h3>
            <p className="text-white">{incident.confidence}%</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-1">Time</h3>
            <p className="text-white">{incident.timestamp.toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-1">Status</h3>
            <p className="text-white capitalize">{incident.status}</p>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this incident..."
            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 min-h-[100px]"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleJumpToMoment}
            variant="outline"
            className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            Jump to Feed
          </Button>
          {incident.status === "open" && (
            <Button
              onClick={handleAcknowledge}
              variant="outline"
              className="w-full bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
          )}
          {incident.status !== "resolved" && (
            <Button onClick={handleResolve} className="w-full bg-white text-zinc-950 hover:bg-zinc-200">
              <Check className="w-4 h-4 mr-2" />
              Resolve
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
