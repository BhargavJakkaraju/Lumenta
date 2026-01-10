"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, User, Car, Activity } from "lucide-react"
import type { VideoEvent } from "@/types/lumenta"

interface EventTimelineProps {
  events: VideoEvent[]
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
}

export function EventTimeline({ events, currentTime, duration, onSeek }: EventTimelineProps) {
  const getEventIcon = (type: VideoEvent["type"]) => {
    switch (type) {
      case "person":
        return <User className="size-4" />
      case "vehicle":
        return <Car className="size-4" />
      case "motion":
        return <Activity className="size-4" />
      case "alert":
        return <AlertCircle className="size-4" />
      default:
        return <Activity className="size-4" />
    }
  }

  const getSeverityColor = (severity: VideoEvent["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-red-600 hover:bg-red-700"
      case "medium":
        return "bg-yellow-600 hover:bg-yellow-700"
      case "low":
        return "bg-green-600 hover:bg-green-700"
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleEventClick = (event: VideoEvent) => {
    onSeek?.(event.timestamp)
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      <CardHeader className="border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0 !px-4 !py-3 flex items-center">
        <CardTitle className="text-white flex items-center gap-2 text-base font-medium leading-none">
          <Clock className="size-5" />
          Event Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto !px-2 !py-1.5 min-h-0">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Clock className="size-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">No events recorded</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Timeline visualization */}
            <div className="mb-2">
              <div className="relative h-2 bg-zinc-800 rounded-full">
                {events.map((event) => {
                  const position = duration > 0 ? (event.timestamp / duration) * 100 : 0
                  return (
                    <div
                      key={event.id}
                      className="absolute top-0 w-1 h-full bg-white rounded-full cursor-pointer hover:bg-blue-400 transition-colors"
                      style={{ left: `${position}%` }}
                      title={`${formatTime(event.timestamp)} - ${event.description}`}
                    />
                  )
                })}
                {/* Current time indicator */}
                {duration > 0 && (
                  <div
                    className="absolute top-0 w-0.5 h-full bg-blue-500 rounded-full"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                )}
              </div>
            </div>

            {/* Event list */}
            {events.map((event) => {
              const isActive = Math.abs(event.timestamp - currentTime) < 2
              return (
                <Card
                  key={event.id}
                  className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all hover:border-zinc-700 !py-0 !gap-0 ${
                    isActive ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => handleEventClick(event)}
                >
                  <CardContent className="!px-2 !py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-0.5 rounded flex-shrink-0 ${getSeverityColor(event.severity)} text-white flex items-center justify-center`}
                      >
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge
                            className={`${getSeverityColor(event.severity)} text-xs py-0 px-1.5 h-4`}
                            variant="default"
                          >
                            {event.severity}
                          </Badge>
                          <span className="text-xs text-zinc-400 font-mono leading-none">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium leading-tight mb-0.5">
                          {event.description}
                        </p>
                        <p className="text-xs text-zinc-500 leading-none">
                          Confidence: {(event.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </div>
  )
}

