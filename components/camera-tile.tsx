"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CameraFeed, Incident } from "@/types/lumenta"

interface CameraTileProps {
  feed: CameraFeed
  selected: boolean
  privacyMode: boolean
  onSelect: () => void
  onToggle: () => void
  onRestart: () => void
  onRemove: () => void
  onAddIncident: (incident: Incident) => void
  onUpdateMetrics: (feedId: string, metrics: Partial<CameraFeed>) => void
}

export function CameraTile({
  feed,
  selected,
  privacyMode,
  onSelect,
  onToggle,
  onRestart,
  onRemove,
  onAddIncident,
  onUpdateMetrics,
}: CameraTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [localName, setLocalName] = useState(feed.name)
  const lastFrameRef = useRef<ImageData | null>(null)
  const processingIntervalRef = useRef<number | null>(null)

  // Video playback control
  useEffect(() => {
    if (videoRef.current) {
      if (feed.isPlaying) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [feed.isPlaying])

  // Process frames for activity detection
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const processFrame = () => {
      if (!video.readyState || video.paused) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)

      if (lastFrameRef.current) {
        // Calculate activity score from frame difference
        const activity = calculateFrameDifference(lastFrameRef.current, currentFrame)

        onUpdateMetrics(feed.id, {
          activity,
          latency: Math.floor(Math.random() * 10 + 10),
          signalRate: activity > 15 ? Math.floor(activity / 5) : 0,
        })

        // Generate incidents based on activity
        if (activity > 30 && Math.random() > 0.95) {
          const incident: Incident = {
            id: crypto.randomUUID(),
            feedId: feed.id,
            feedName: feed.name,
            severity: activity > 50 ? "high" : activity > 40 ? "medium" : "low",
            timestamp: new Date(),
            confidence: Math.floor(activity + Math.random() * 20),
            description: `Motion detected - Activity level: ${Math.floor(activity)}%`,
            status: "open",
          }
          onAddIncident(incident)
        }
      }

      lastFrameRef.current = currentFrame
    }

    processingIntervalRef.current = window.setInterval(processFrame, 500)

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
      }
    }
  }, [feed.id, feed.name, onAddIncident, onUpdateMetrics])

  const calculateFrameDifference = (frame1: ImageData, frame2: ImageData): number => {
    let diff = 0
    const data1 = frame1.data
    const data2 = frame2.data
    const sampleRate = 10 // Sample every 10th pixel for performance

    for (let i = 0; i < data1.length; i += 4 * sampleRate) {
      const r = Math.abs(data1[i] - data2[i])
      const g = Math.abs(data1[i + 1] - data2[i + 1])
      const b = Math.abs(data1[i + 2] - data2[i + 2])
      diff += (r + g + b) / 3
    }

    return (diff / (data1.length / (4 * sampleRate))) * 10
  }

  const handleNameBlur = () => {
    setIsEditingName(false)
    if (localName.trim()) {
      onUpdateMetrics(feed.id, { name: localName })
    } else {
      setLocalName(feed.name)
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`relative aspect-video rounded-lg overflow-hidden bg-zinc-900 border ${
        selected ? "border-white ring-2 ring-white/20" : "border-zinc-800"
      } cursor-pointer transition-all hover:border-zinc-700`}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={feed.videoUrl || "/placeholder.svg"}
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent pointer-events-none" />

      {/* Name */}
      <div className="absolute top-2 left-2 right-2 pointer-events-auto">
        {isEditingName ? (
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
            autoFocus
            className="w-full px-2 py-1 text-sm bg-zinc-900/90 border border-zinc-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingName(true)
            }}
            className="px-2 py-1 text-sm bg-zinc-900/90 border border-zinc-800 rounded text-white hover:border-zinc-700"
          >
            {feed.name}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
        <div className="px-2 py-1 rounded text-xs bg-zinc-900/90 border border-zinc-800 text-zinc-300">
          {Math.floor(feed.activity)}% activity
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="h-7 w-7 p-0 bg-zinc-900/90 hover:bg-zinc-800 text-white"
          >
            {feed.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              if (videoRef.current) {
                videoRef.current.currentTime = 0
              }
            }}
            className="h-7 w-7 p-0 bg-zinc-900/90 hover:bg-zinc-800 text-white"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="h-7 w-7 p-0 bg-zinc-900/90 hover:bg-red-900 text-white"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Privacy Mode Badge */}
      {privacyMode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs bg-emerald-900/40 border border-emerald-800/40 text-emerald-400 pointer-events-none">
          Local-only
        </div>
      )}
    </div>
  )
}
