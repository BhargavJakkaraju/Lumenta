/**
 * Frame Processor
 * Orchestrates all providers for frame-by-frame analysis
 */

import { providerCoordinator } from "@/lib/providers"
import type { VideoEvent } from "@/types/lumenta"

export interface ProcessingResult {
  detections: {
    boxes: Array<{ x: number; y: number; width: number; height: number }>
    labels: string[]
    confidences: number[]
  }
  identities?: Array<{ identity: string; similarity: number; box: { x: number; y: number; width: number; height: number } }>
  context?: string
  events: VideoEvent[]
  processingTime: number
}

export interface FrameProcessorOptions {
  enableFaceRecognition?: boolean
  enableVideoUnderstanding?: boolean
  enableReasoning?: boolean
  privacyMode?: boolean
  knownIdentities?: Map<string, Float32Array>
  videoId?: string
}

export class FrameProcessor {
  private lastProcessedFrame: ImageData | null = null
  private eventCache: Map<number, VideoEvent[]> = new Map() // timestamp -> events
  private videoId: string | null = null

  constructor(videoId: string) {
    this.videoId = videoId
  }

  async processFrame(
    imageData: ImageData,
    timestamp: number,
    options: FrameProcessorOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = performance.now()

    // Step 1: Preprocessing
    const preprocessingProvider = providerCoordinator.getPreprocessingProvider()
    const preprocessed = await preprocessingProvider.preprocess(imageData)

    // Step 2: Object Detection (YOLOv8 or local)
    const detectionProvider = providerCoordinator.getDetectionProvider()
    const detections = await detectionProvider.detect(preprocessed)

    // Step 3: Face Recognition (if enabled and person detected)
    let identities: Array<{ identity: string; similarity: number; box: { x: number; y: number; width: number; height: number } }> = []
    if (
      options.enableFaceRecognition &&
      !options.privacyMode &&
      options.knownIdentities &&
      detections.labels.includes("person")
    ) {
      const faceRecognitionProvider = providerCoordinator.getFaceRecognitionProvider()
      if (faceRecognitionProvider.isConfigured()) {
        // Extract faces from person detections
        for (let i = 0; i < detections.boxes.length; i++) {
          if (detections.labels[i] === "person") {
            try {
              const faceBox = detections.boxes[i]
              const faceEmbedding = await faceRecognitionProvider.extractEmbedding(
                preprocessed,
                faceBox
              )
              const identityMatch = await faceRecognitionProvider.identifyFace(
                faceEmbedding.embedding,
                options.knownIdentities
              )

              if (identityMatch) {
                identities.push({
                  identity: identityMatch.identity,
                  similarity: identityMatch.similarity,
                  box: faceBox,
                })
              }
            } catch (error) {
              console.debug("Face recognition error:", error)
            }
          }
        }
      }
    }

    // Step 4: Video Understanding (Twelve Labs) - async, don't block
    let context: string | undefined = undefined
    if (options.enableVideoUnderstanding && this.videoId) {
      const videoSearchProvider = providerCoordinator.getVideoSearchProvider()
      if (videoSearchProvider.isConfigured()) {
        try {
          // Get summary if available
          context = await videoSearchProvider.getSummary(this.videoId)
        } catch (error) {
          console.debug("Video understanding error:", error)
        }
      }
    }

    // Step 5: Generate Events from Detections
    const events: VideoEvent[] = []

    // Create events for each detection
    for (let i = 0; i < detections.boxes.length; i++) {
      const label = detections.labels[i]
      const confidence = detections.confidences[i]
      const box = detections.boxes[i]

      // Map YOLOv8 labels to event types
      let eventType: VideoEvent["type"] = "motion"
      let severity: VideoEvent["severity"] = "low"

      if (label === "person") {
        eventType = "person"
        severity = confidence > 0.8 ? "high" : confidence > 0.6 ? "medium" : "low"
        
        // Check if identity was recognized
        const identity = identities.find((id) => 
          Math.abs(id.box.x - box.x) < 10 && 
          Math.abs(id.box.y - box.y) < 10
        )
        
        events.push({
          id: `${this.videoId}-${timestamp}-${i}`,
          timestamp,
          type: eventType,
          severity,
          description: identity
            ? `${label} detected - Identity: ${identity.identity} (${Math.round(identity.similarity * 100)}% match)`
            : `${label} detected`,
          confidence,
          box,
          identity: identity?.identity,
        })
      } else if (["car", "truck", "bus", "motorcycle"].includes(label)) {
        eventType = "vehicle"
        severity = confidence > 0.7 ? "medium" : "low"
        events.push({
          id: `${this.videoId}-${timestamp}-${i}`,
          timestamp,
          type: eventType,
          severity,
          description: `${label} detected`,
          confidence,
          box,
        })
      } else if (confidence > 0.5) {
        eventType = "motion"
        severity = confidence > 0.7 ? "medium" : "low"
        events.push({
          id: `${this.videoId}-${timestamp}-${i}`,
          timestamp,
          type: eventType,
          severity,
          description: `Motion detected - ${label}`,
          confidence,
          box,
        })
      }
    }

    // Step 6: Node Graph Rules Check
    const nodeGraphProvider = providerCoordinator.getNodeGraphProvider()
    if (nodeGraphProvider.isConfigured()) {
      try {
        // Validate detections against node graph rules
        const isValid = await nodeGraphProvider.validateGraph({
          nodes: [],
          edges: [],
          rules: [],
        })
        // Could filter events based on rules here
      } catch (error) {
        console.debug("Node graph validation error:", error)
      }
    }

    // Step 7: Reasoning (if enabled)
    if (options.enableReasoning && events.length > 0) {
      const reasoningProvider = providerCoordinator.getReasoningProvider()
      if (reasoningProvider.isConfigured()) {
        try {
          const reasoning = await reasoningProvider.reason({
            context: `Detected ${detections.labels.join(", ")} at timestamp ${timestamp}. ${context || ""}`,
            task: "Analyze these detections and determine if any action is needed",
            constraints: options.privacyMode ? ["No identity tracking", "Privacy mode enabled"] : [],
            previousActions: [],
          })

          // Update event severity based on reasoning
          if (reasoning.actions.includes("alert")) {
            events.forEach((event) => {
              if (event.severity === "medium") event.severity = "high"
            })
          }

          // Add reasoning to event descriptions
          if (reasoning.reasoning) {
            events.forEach((event) => {
              event.description += ` [${reasoning.reasoning}]`
            })
          }
        } catch (error) {
          console.debug("Reasoning error:", error)
        }
      }
    }

    // Step 8: Orchestration (if multiple events)
    if (events.length > 1) {
      const orchestrationProvider = providerCoordinator.getOrchestrationProvider()
      if (orchestrationProvider.isConfigured()) {
        try {
          // Register agents if needed
          orchestrationProvider.registerAgent("perception", {
            type: "perception",
            description: "Object detection and recognition",
            inputs: ["imageData"],
            outputs: ["detections", "identities"],
          })

          const orchestration = await orchestrationProvider.orchestrate(
            events.map((event, idx) => ({
              id: `event-${idx}`,
              capability: "perception" as const,
              input: { event },
              priority: event.severity === "high" ? 10 : event.severity === "medium" ? 5 : 1,
            }))
          )

          // Could reorder events based on orchestration
        } catch (error) {
          console.debug("Orchestration error:", error)
        }
      }
    }

    const processingTime = performance.now() - startTime

    // Cache events by timestamp
    this.eventCache.set(Math.floor(timestamp), events)

    // Store last frame for motion detection fallback
    this.lastProcessedFrame = imageData

    return {
      detections,
      identities: identities.length > 0 ? identities : undefined,
      context,
      events,
      processingTime,
    }
  }


  getEventsForTimestamp(timestamp: number): VideoEvent[] {
    return this.eventCache.get(Math.floor(timestamp)) || []
  }

  clearCache(): void {
    this.eventCache.clear()
    this.lastProcessedFrame = null
  }
}

