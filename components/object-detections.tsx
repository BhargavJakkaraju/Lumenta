"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Car, User } from "lucide-react"
import type { VideoEvent } from "@/types/lumenta"

interface ObjectDetectionsProps {
  events: VideoEvent[]
  currentTime: number
  enabled?: boolean
}

export function ObjectDetections({ events, currentTime, enabled = true }: ObjectDetectionsProps) {
  const [detections, setDetections] = useState<VideoEvent[]>([])
  const seenIdsRef = useRef<Set<string>>(new Set())
  const latestEventsRef = useRef<VideoEvent[]>(events)

  useEffect(() => {
    latestEventsRef.current = events
  }, [events])

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => {
      const rawDetections = latestEventsRef.current
        .filter((event) => !event.overlayOnly && event.type !== "alert" && event.type !== "activity")
        .sort((a, b) => b.timestamp - a.timestamp)

      const dedupedMap = new Map<string, VideoEvent>()
      rawDetections.forEach((event) => {
        const timeBucket = Math.floor(event.timestamp)
        const key = `${event.type}-${timeBucket}`
        const existing = dedupedMap.get(key)
        if (!existing || event.confidence > existing.confidence) {
          dedupedMap.set(key, event)
        }
      })

      const nextDetections = Array.from(dedupedMap.values()).sort(
        (a, b) => b.timestamp - a.timestamp
      )

      const hasNew = nextDetections.some((event) => !seenIdsRef.current.has(event.id))
      if (!hasNew) return

      nextDetections.forEach((event) => seenIdsRef.current.add(event.id))
      setDetections(nextDetections.slice(0, 20))
    }, 3000)

    return () => clearInterval(interval)
  }, [enabled])

  const getEventIcon = (type: VideoEvent["type"]) => {
    switch (type) {
      case "person":
        return <User className="size-4" />
      case "vehicle":
        return <Car className="size-4" />
      default:
        return <Activity className="size-4" />
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      <CardHeader className="border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0 !px-4 !py-3 flex items-center">
        <CardTitle className="text-white flex items-center gap-2 text-base font-medium leading-none">
          <Activity className="size-5" />
          Object Detections
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto !px-2 !py-1.5 min-h-0">
        {detections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Activity className="size-12 text-zinc-600 mb-4" />
            <p className="text-zinc-400">
              {enabled ? "No detections yet" : "Object detection paused"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {detections.map((event) => {
              const isActive = Math.abs(event.timestamp - currentTime) < 2
              return (
                <Card
                  key={event.id}
                  className={`bg-zinc-900 border-zinc-800 !py-0 !gap-0 ${
                    isActive ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <CardContent className="!px-2 !py-1">
                    <div className="flex items-center gap-2">
                      <div className="p-0.5 rounded flex-shrink-0 bg-zinc-700 text-white flex items-center justify-center">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-zinc-700 text-[11px] py-0 px-1.5 h-4" variant="default">
                            {event.type}
                          </Badge>
                          <span className="text-[11px] text-zinc-400 font-mono leading-none">
                            {formatTime(event.timestamp)}
                          </span>
                          <span className="text-[11px] text-zinc-500 leading-none">
                            {(event.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-white font-medium leading-tight truncate">
                          {event.description}
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
