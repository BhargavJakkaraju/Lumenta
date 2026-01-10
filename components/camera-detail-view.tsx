"use client"

import { useState, useEffect, useRef } from "react"
import { VideoPlayer, type VideoPlayerRef } from "@/components/video-player"
import { EventTimeline } from "@/components/event-timeline"
import { NodeCanvas } from "@/components/nodeGraph/NodeCanvas"
import type { CameraFeed, VideoEvent } from "@/types/lumenta"

interface CameraDetailViewProps {
  feedId: string
}

// Export stock feeds for use in camera-wall
export const STOCK_FEEDS: CameraFeed[] = [
  {
    id: "camera-1",
    name: "Main Entrance",
    videoUrl: "/videos/camera-1.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 85,
    latency: 12,
    signalRate: 98,
  },
  {
    id: "camera-2",
    name: "Parking Lot",
    videoUrl: "/videos/camera-2.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 45,
    latency: 8,
    signalRate: 95,
  },
  {
    id: "camera-3",
    name: "Warehouse Floor",
    videoUrl: "/videos/camera-3.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 92,
    latency: 15,
    signalRate: 87,
  },
  {
    id: "camera-4",
    name: "Loading Dock",
    videoUrl: "/videos/camera-4.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 67,
    latency: 10,
    signalRate: 92,
  },
  {
    id: "camera-5",
    name: "Security Office",
    videoUrl: "/videos/camera-5.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 23,
    latency: 5,
    signalRate: 99,
  },
  {
    id: "camera-6",
    name: "Reception Area",
    videoUrl: "/videos/camera-6.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 78,
    latency: 11,
    signalRate: 94,
  },
  {
    id: "camera-7",
    name: "Front Lobby",
    videoUrl: "/videos/camera-7.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 56,
    latency: 9,
    signalRate: 96,
  },
  {
    id: "camera-8",
    name: "Back Entrance",
    videoUrl: "/videos/camera-8.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 72,
    latency: 13,
    signalRate: 91,
  },
  {
    id: "camera-9",
    name: "Elevator Bay",
    videoUrl: "/videos/camera-9.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 34,
    latency: 7,
    signalRate: 98,
  },
]

export function CameraDetailView({ feedId }: CameraDetailViewProps) {
  const [feed, setFeed] = useState<CameraFeed | null>(null)
  const [events, setEvents] = useState<VideoEvent[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)

  useEffect(() => {
    // Find the feed by ID
    const foundFeed = STOCK_FEEDS.find((f) => f.id === feedId)
    if (foundFeed) {
      setFeed(foundFeed)
      // Generate mock events for the timeline
      generateMockEvents(foundFeed.id)
    }
  }, [feedId])

  const generateMockEvents = (id: string) => {
    const mockEvents: VideoEvent[] = [
      {
        id: `${id}-event-1`,
        timestamp: 15,
        type: "motion",
        severity: "medium",
        description: "Motion detected in frame",
        confidence: 0.87,
      },
      {
        id: `${id}-event-2`,
        timestamp: 45,
        type: "person",
        severity: "high",
        description: "Person detected",
        confidence: 0.92,
      },
      {
        id: `${id}-event-3`,
        timestamp: 78,
        type: "vehicle",
        severity: "medium",
        description: "Vehicle detected",
        confidence: 0.85,
      },
      {
        id: `${id}-event-4`,
        timestamp: 120,
        type: "motion",
        severity: "low",
        description: "Motion detected",
        confidence: 0.76,
      },
      {
        id: `${id}-event-5`,
        timestamp: 165,
        type: "person",
        severity: "high",
        description: "Multiple persons detected",
        confidence: 0.94,
      },
    ]
    setEvents(mockEvents)
  }

  if (!feed) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Camera feed not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Video Player and Node Graph (scrollable) */}
        <div className="flex-1 overflow-auto min-w-0">
          <div className="p-6 space-y-6">
            {/* Video Player - Full Size */}
            <div className="h-[600px]">
              <VideoPlayer
                ref={videoPlayerRef}
                videoUrl={feed.videoUrl}
                feedName={feed.name}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
              />
            </div>
            {/* Node Graph Area */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">Node Graph</p>
              <NodeCanvas />
            </div>
          </div>
        </div>

        {/* Right: Event Timeline */}
        <div className="w-96 flex-shrink-0 border-l border-zinc-800 overflow-hidden flex flex-col">
          <EventTimeline
            events={events}
            currentTime={currentTime}
            duration={duration}
            onSeek={(time) => {
              if (videoPlayerRef.current) {
                videoPlayerRef.current.seek(time)
              }
              setCurrentTime(time)
            }}
          />
        </div>
      </div>
    </div>
  )
}

