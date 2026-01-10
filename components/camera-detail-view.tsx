"use client"

import { useState, useEffect, useRef } from "react"
import { VideoPlayer, type VideoPlayerRef } from "@/components/video-player"
import { EventTimeline } from "@/components/event-timeline"
import { VideoOverlay } from "@/components/video-overlay"
import { NodeCanvas } from "@/components/nodeGraph/NodeCanvas"
import { FrameProcessor } from "@/lib/frame-processor"
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
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })
  const [privacyMode, setPrivacyMode] = useState(true)
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)
  const frameProcessorRef = useRef<FrameProcessor | null>(null)
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const processingIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    // Find the feed by ID
    const foundFeed = STOCK_FEEDS.find((f) => f.id === feedId)
    if (foundFeed) {
      setFeed(foundFeed)
      // Initialize frame processor
      frameProcessorRef.current = new FrameProcessor(feedId)
    }
  }, [feedId])

  // Frame processing loop
  useEffect(() => {
    if (!feed || !videoElement || !frameProcessorRef.current) return

    const video = videoElement
    const processor = frameProcessorRef.current
    
    // Create hidden canvas for processing
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const processFrame = async () => {
      if (video.paused || !video.readyState) return

      try {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        
        // Update video dimensions for overlay
        setVideoDimensions({
          width: video.videoWidth || 640,
          height: video.videoHeight || 480,
        })

        // Draw current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Get image data
        let imageData: ImageData | null = null
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        } catch (error) {
          // CORS error - skip processing
          console.debug("CORS error, skipping frame processing:", error)
          return
        }

        if (!imageData) return

        // Process frame with all providers
        const result = await processor.processFrame(imageData, video.currentTime, {
          enableFaceRecognition: !privacyMode,
          enableVideoUnderstanding: true,
          enableReasoning: true,
          privacyMode,
          videoId: feedId,
        })

        // Update events state (deduplicate and merge)
        setEvents((prevEvents) => {
          const eventMap = new Map(prevEvents.map((e) => [e.id, e]))
          
          // Add new events
          result.events.forEach((event) => {
            eventMap.set(event.id, event)
          })

          // Return sorted by timestamp
          return Array.from(eventMap.values()).sort((a, b) => a.timestamp - b.timestamp)
        })
      } catch (error) {
        console.error("Frame processing error:", error)
      }
    }

    // Process frames every 500ms (throttled for performance)
    processingIntervalRef.current = window.setInterval(processFrame, 500)

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
      }
    }
  }, [feed, videoElement, feedId, privacyMode])

  // Get video element reference from VideoPlayer
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoPlayerRef.current) {
        const video = videoPlayerRef.current.getVideoElement()
        if (video && video !== videoElement) {
          setVideoElement(video)
          // Set dimensions once video is loaded
          if (video.videoWidth > 0) {
            setVideoDimensions({
              width: video.videoWidth,
              height: video.videoHeight,
            })
          }
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [videoElement])

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
            <div className="h-[600px] relative">
              <VideoPlayer
                ref={videoPlayerRef}
                videoUrl={feed.videoUrl}
                feedName={feed.name}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
              />
              {/* Bounding Box Overlay */}
              {videoElement && videoDimensions.width > 0 && (
                <VideoOverlay
                  videoElement={videoElement}
                  events={events}
                  currentTime={currentTime}
                  videoWidth={videoDimensions.width}
                  videoHeight={videoDimensions.height}
                />
              )}
              {/* Processing Status */}
              <div className="absolute bottom-4 right-4 bg-zinc-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 z-20">
                Processing: {events.length} events detected
              </div>
            </div>
            {/* Node Graph Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-white">Node Graph</p>
                <button
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Privacy: {privacyMode ? "ON" : "OFF"}
                </button>
              </div>
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
