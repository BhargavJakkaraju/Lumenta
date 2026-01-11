"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { VideoPlayer, type VideoPlayerRef } from "@/components/video-player"
import { EventTimeline } from "@/components/event-timeline"
import { analyzeVideoWithGemini, convertToVideoEvents } from "@/lib/video-analyzer"
import { VideoOverlay } from "@/components/video-overlay"
import { NodeCanvas, type Node, type NodeCanvasHandle } from "@/components/nodeGraph/NodeCanvas"
import { WorkflowChatPanel } from "@/components/WorkflowChatPanel"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ObjectDetections } from "@/components/object-detections"
import type { Edge } from "@/components/nodeGraph/edges"
import { FrameProcessor } from "@/lib/frame-processor"
import { providerCoordinator } from "@/lib/providers"
import { saveProviderConfig } from "@/lib/providers/config"
import type { CameraFeed, VideoEvent } from "@/types/lumenta"

interface CameraDetailViewProps {
  feedId: string
}

// Export stock feeds for use in camera-wall
export const STOCK_FEEDS: CameraFeed[] = [
  {
    id: "camera-1",
    name: "Jewelry Store",
    videoUrl: "/videos/camera-1.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 85,
    latency: 12,
    signalRate: 98,
  },
  {
    id: "camera-2",
    name: "Bedroom",
    videoUrl: "/videos/camera-2.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 45,
    latency: 8,
    signalRate: 95,
  },
  {
    id: "camera-3",
    name: "Front Porch",
    videoUrl: "/videos/camera-3.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 92,
    latency: 15,
    signalRate: 87,
  },
  {
    id: "camera-4",
    name: "Warehouse 1",
    videoUrl: "/videos/camera-4.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 67,
    latency: 10,
    signalRate: 92,
  },
  {
    id: "camera-5",
    name: "Living Room",
    videoUrl: "/videos/camera-5.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 23,
    latency: 5,
    signalRate: 99,
  },
  {
    id: "camera-6",
    name: "Backyard Patio",
    videoUrl: "/videos/camera-6.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 78,
    latency: 11,
    signalRate: 94,
  },
  {
    id: "camera-7",
    name: "Warehouse 2",
    videoUrl: "/videos/camera-7.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 56,
    latency: 9,
    signalRate: 96,
  },
  {
    id: "camera-8",
    name: "City Intersection",
    videoUrl: "/videos/camera-8.mp4", // Place your video files in public/videos/
    isPlaying: true,
    activity: 72,
    latency: 13,
    signalRate: 91,
  },
  {
    id: "camera-9",
    name: "Pool",
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
  const [privacyMode] = useState(true)
  const [yoloEnabled, setYoloEnabled] = useState(true)
  const [yoloModelPath, setYoloModelPath] = useState("/models/yolov8n.onnx")
  const [yoloInputSize, setYoloInputSize] = useState(640)
  const [yoloConfidence, setYoloConfidence] = useState(0.5)
  const [detectionStatus, setDetectionStatus] = useState("local")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const { toast } = useToast()
  const lastAlertRef = useRef<string | null>(null)
  const [nodeGraphData, setNodeGraphData] = useState<{
    nodes: Array<{ id: string; type: string; title: string; config?: any }>
    edges: Array<{ id: string; fromNodeId: string; toNodeId: string }>
  }>({ nodes: [], edges: [] })
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null)
  const frameProcessorRef = useRef<FrameProcessor | null>(null)
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const processingIntervalRef = useRef<number | null>(null)
  const processingAnimationRef = useRef<number | null>(null)
  const nodeCanvasRef = useRef<NodeCanvasHandle | null>(null)

  // Memoize the graph change callback
  const handleGraphChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setNodeGraphData({
      nodes: nodes.map((n: Node) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        config: n.config,
      })),
      edges: edges.map((e: Edge) => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
      })),
    })
  }, [])

  useEffect(() => {
    const config = providerCoordinator.getConfig()
    const status = providerCoordinator.getStatus()
    if (config.yolov8) {
      setYoloModelPath(config.yolov8.modelPath || "/models/yolov8n.onnx")
      setYoloInputSize(config.yolov8.inputSize || 640)
      setYoloConfidence(config.yolov8.confidenceThreshold ?? 0.5)
    }
    setDetectionStatus(status.detection)
    applyYoloConfig({
      enabled: true,
      modelPath: config.yolov8?.modelPath || "/models/yolov8n.onnx",
      inputSize: config.yolov8?.inputSize || 640,
      confidenceThreshold: config.yolov8?.confidenceThreshold ?? 0.5,
    }).catch((error) => {
      console.error("Failed to update YOLOv8 config:", error)
    })
  }, [])


  const applyYoloConfig = useCallback(
    async (nextConfig: {
      enabled: boolean
      modelPath: string
      inputSize: number
      confidenceThreshold: number
    }) => {
      const configUpdate = {
        yolov8: {
          enabled: nextConfig.enabled,
          modelPath: nextConfig.modelPath,
          inputSize: nextConfig.inputSize,
          confidenceThreshold: nextConfig.confidenceThreshold,
        },
      }
      saveProviderConfig({ ...providerCoordinator.getConfig(), ...configUpdate })
      await providerCoordinator.updateConfig(configUpdate)
      setDetectionStatus(providerCoordinator.getStatus().detection)
    },
    []
  )

  useEffect(() => {
    // Find the feed by ID
    const foundFeed = STOCK_FEEDS.find((f) => f.id === feedId)
    if (foundFeed) {
      setFeed(foundFeed)
      // Initialize frame processor
      frameProcessorRef.current = new FrameProcessor(feedId)
      
      // Clear events - will be populated by video analysis
      setEvents([])
      setHasAnalyzed(false)
    }
  }, [feedId])

  const handleAnalyzeVideo = useCallback(async () => {
    if (!feed || isAnalyzing) return

    setIsAnalyzing(true)
    toast({
      title: "Analyzing video",
      description: "Using Gemini to extract events from the video...",
    })

    try {
      const eventData = await analyzeVideoWithGemini(feed.videoUrl, duration, feedId)
      const videoEvents = convertToVideoEvents(eventData, feedId)
      setEvents(videoEvents)
      setHasAnalyzed(true)
      
      toast({
        title: "Analysis complete",
        description: `Found ${videoEvents.length} events in the video`,
      })
    } catch (error: any) {
      console.error("Video analysis failed:", error)
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze video. Using fallback events.",
        variant: "destructive",
      })
      // Use fallback events
      const fallbackEvents = convertToVideoEvents(
        await analyzeVideoWithGemini(feed.videoUrl, duration, feedId),
        feedId
      )
      setEvents(fallbackEvents)
      setHasAnalyzed(true)
    } finally {
      setIsAnalyzing(false)
    }
  }, [feed, feedId, duration, toast])

  // Analyze video when duration is available for camera-1 through camera-9
  useEffect(() => {
    if ((feed?.id === "camera-1" || feed?.id === "camera-2" || feed?.id === "camera-3" || feed?.id === "camera-4" || feed?.id === "camera-5" || feed?.id === "camera-6" || feed?.id === "camera-7" || feed?.id === "camera-8" || feed?.id === "camera-9") && duration > 0 && !hasAnalyzed && !isAnalyzing) {
      handleAnalyzeVideo()
    }
  }, [feed?.id, duration, hasAnalyzed, isAnalyzing, handleAnalyzeVideo])

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
      if (video.paused || !video.readyState || !video.videoWidth || !video.videoHeight) {
        if (video.paused) console.debug("[CameraDetailView] Video is paused, skipping frame")
        if (!video.readyState) console.debug("[CameraDetailView] Video not ready, skipping frame")
        if (!video.videoWidth || !video.videoHeight) console.debug("[CameraDetailView] Video dimensions not available")
        return
      }

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
          console.warn("[CameraDetailView] CORS error, skipping frame processing:", error)
          return
        }

        if (!imageData) {
          console.warn("[CameraDetailView] Could not get image data from canvas")
          return
        }

        console.debug(`[CameraDetailView] Processing frame at ${video.currentTime.toFixed(2)}s`)

        // Get analyze nodes from the graph
        const analyzeNodes = nodeGraphData.nodes
          .filter((node) => node.type === "analyze")
          .map((node) => ({
            prompt: node.config?.prompt,
            sensitivity: node.config?.sensitivity,
          }))
          .filter((node) => node.prompt)

        // Debug: Log analyze nodes
        if (analyzeNodes.length > 0) {
          console.debug(`[FrameProcessor] Processing with ${analyzeNodes.length} analyze node(s)`, analyzeNodes)
        }

        // Process frame with all providers
        const result = await processor.processFrame(imageData, video.currentTime, {
          enableFaceRecognition: !privacyMode,
          enableVideoUnderstanding: true,
          enableReasoning: true,
          privacyMode,
          videoId: feedId,
          analyzeNodes,
        })

        // Debug: Log events generated
        if (result.events.length > 0) {
          console.debug(`[FrameProcessor] Generated ${result.events.length} event(s)`, result.events)
        }

        // Update events state (deduplicate and merge)
        setEvents((prevEvents) => {
          const eventMap = new Map(prevEvents.map((e) => [e.id, e]))

          // Add new events from this frame
          result.events.forEach((event) => {
            eventMap.set(event.id, event)
          })

          const updatedEvents = Array.from(eventMap.values()).sort((a, b) => a.timestamp - b.timestamp)
          
          // Debug: Log if we have new events
          if (result.events.length > 0) {
            console.log(`[CameraDetailView] ✅ Added ${result.events.length} event(s) to timeline. Total events: ${updatedEvents.length}`)
          }

          // Return sorted by timestamp
          return updatedEvents
        })

        const latestAlert = result.events
          .filter((event) => event.type === "alert" && event.source === "analyze")
          .sort((a, b) => b.timestamp - a.timestamp)[0]

        if (latestAlert && latestAlert.id !== lastAlertRef.current) {
          lastAlertRef.current = latestAlert.id
          toast({
            title: "Analyze Match",
            description: latestAlert.description,
            className: "bg-blue-600 text-white border-blue-700",
          })
        }
      } catch (error) {
        console.error("Frame processing error:", error)
      }
    }

    const processLoop = () => {
      processFrame().catch(() => null)
      processingAnimationRef.current = window.requestAnimationFrame(processLoop)
    }
    processingAnimationRef.current = window.requestAnimationFrame(processLoop)

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
      }
      if (processingAnimationRef.current) {
        cancelAnimationFrame(processingAnimationRef.current)
      }
    }
  }, [feed, videoElement, feedId, privacyMode, nodeGraphData])

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
                Alerts: {events.filter((event) => !event.overlayOnly && event.type === "alert").length}
              </div>
            </div>
            {/* Node Graph Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-white">Node Graph</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">YOLOv8 Detection</p>
                  <span className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-300">
                    Enabled
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  Status: {detectionStatus}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    value={yoloModelPath}
                    onChange={(event) => setYoloModelPath(event.target.value)}
                    onBlur={() => {
                      applyYoloConfig({
                        enabled: yoloEnabled,
                        modelPath: yoloModelPath,
                        inputSize: yoloInputSize,
                        confidenceThreshold: yoloConfidence,
                      }).catch((error) => {
                        console.error("Failed to update YOLOv8 config:", error)
                      })
                    }}
                    placeholder="/models/yolov8n.onnx"
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={320}
                      step={32}
                      value={yoloInputSize}
                      onChange={(event) => setYoloInputSize(Number(event.target.value))}
                      onBlur={() => {
                        applyYoloConfig({
                          enabled: yoloEnabled,
                          modelPath: yoloModelPath,
                          inputSize: yoloInputSize,
                          confidenceThreshold: yoloConfidence,
                        }).catch((error) => {
                          console.error("Failed to update YOLOv8 config:", error)
                        })
                      }}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={yoloConfidence}
                      onChange={(event) => setYoloConfidence(Number(event.target.value))}
                      onBlur={() => {
                        applyYoloConfig({
                          enabled: yoloEnabled,
                          modelPath: yoloModelPath,
                          inputSize: yoloInputSize,
                          confidenceThreshold: yoloConfidence,
                        }).catch((error) => {
                          console.error("Failed to update YOLOv8 config:", error)
                        })
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Place the ONNX model in `public/models` and use a public path.
                </p>
              </div>
              <NodeCanvas 
                ref={nodeCanvasRef}
                onGraphChange={handleGraphChange}
              />
            </div>
            {/* Chatbot Area */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">Chat Assistant</p>
              <WorkflowChatPanel 
                nodeGraphData={nodeGraphData}
                onCreateNodes={(nodes) => {
                  if (nodeCanvasRef.current) {
                    nodeCanvasRef.current.createNodes(nodes)
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Event Timeline + Object Detections */}
        <div className="w-96 flex-shrink-0 border-l border-zinc-800 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
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
              onAnalyze={handleAnalyzeVideo}
              isAnalyzing={isAnalyzing}
            />
          </div>
          <div className="flex-1 min-h-0 border-t border-zinc-800">
            <ObjectDetections
              events={events}
              currentTime={currentTime}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
