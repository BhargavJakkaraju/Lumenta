/**
 * Frame Processor
 * Orchestrates all providers for frame-by-frame analysis
 */

import { providerCoordinator } from "@/lib/providers"
import { LocalDetectionProvider } from "@/lib/providers/detection-provider"
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
  analyzeNodes?: Array<{ prompt: string; sensitivity?: "low" | "medium" | "high" }>
  enableObjectDetection?: boolean
  enableMotionOverlay?: boolean
}

export class FrameProcessor {
  private lastProcessedFrame: ImageData | null = null
  private eventCache: Map<number, VideoEvent[]> = new Map() // timestamp -> events
  private videoId: string | null = null
  private motionOverlayProvider = new LocalDetectionProvider()
  private pendingSemanticEvents: VideoEvent[] = []
  private analyzeState: Map<string, { lastAt: number; inFlight: boolean }> = new Map()
  private summaryState: { lastAt: number; inFlight: boolean; lastSummary: string } = {
    lastAt: 0,
    inFlight: false,
    lastSummary: "",
  }
  private lastDetectionAt = 0
  private lastDetections = { boxes: [], labels: [], confidences: [] }
  private allowedLabelsByVideoId: Record<string, Set<string>> = {
    "camera-1": new Set(["person"]),
    "camera-2": new Set(["person"]),
    "camera-3": new Set(["person"]),
    "camera-4": new Set(["person", "fire"]),
    "camera-5": new Set(["person"]),
    "camera-6": new Set(["dog", "cat", "person"]),
    "camera-7": new Set(["person"]),
    "camera-8": new Set(["person", "car", "truck", "bus", "umbrella"]),
    "camera-9": new Set(["person"]),
  }

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
    const shouldDetect = options.enableObjectDetection !== false
    const detectionIntervalMs = 1200
    const detectionDue = Date.now() - this.lastDetectionAt >= detectionIntervalMs
    const detections = shouldDetect
      ? detectionDue
        ? detectionProvider.detectWithPrevious
          ? await detectionProvider.detectWithPrevious(preprocessed, this.lastProcessedFrame)
          : await detectionProvider.detect(preprocessed)
        : this.lastDetections
      : { boxes: [], labels: [], confidences: [] }

    if (shouldDetect && detectionDue) {
      this.lastDetectionAt = Date.now()
      this.lastDetections = detections
    }

    const shouldMotion = options.enableMotionOverlay !== false
    const motionOverlayDetections = shouldMotion
      ? await this.motionOverlayProvider.detectWithPrevious(preprocessed, this.lastProcessedFrame)
      : { boxes: [], labels: [], confidences: [] }

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
      const allowedLabels = this.videoId ? this.allowedLabelsByVideoId[this.videoId] : undefined
      const nonPreferredThreshold = 0.9

      if (allowedLabels && !allowedLabels.has(label) && confidence < nonPreferredThreshold) {
        continue
      }

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
          overlayOnly: label === "motion",
        })
      }
    }

    for (let i = 0; i < motionOverlayDetections.boxes.length; i++) {
      events.push({
        id: `${this.videoId}-${timestamp}-motion-${i}`,
        timestamp,
        type: "motion",
        severity: "low",
        description: "Motion detected",
        confidence: motionOverlayDetections.confidences[i] ?? 0.5,
        box: motionOverlayDetections.boxes[i],
        overlayOnly: true,
      })
    }

    // Process analyze nodes (async, but don't await - events added to pendingSemanticEvents)
    if (options.analyzeNodes && options.analyzeNodes.length > 0) {
      console.debug(`[FrameProcessor] Found ${options.analyzeNodes.length} analyze node(s) to process`)
      options.analyzeNodes.forEach((node, index) => {
        if (!node.prompt?.trim()) {
          console.debug(`[FrameProcessor] Skipping analyze node ${index} - no prompt`)
          return
        }
        console.debug(`[FrameProcessor] Running analyze node ${index}: "${node.prompt.substring(0, 50)}..."`)
        this.maybeRunSemanticAnalyze(
          node.prompt,
          node.sensitivity,
          imageData,
          timestamp,
          index
        ).catch((error) => {
          console.error("[FrameProcessor] Semantic analyze error:", error)
        })
      })
    } else {
      console.debug("[FrameProcessor] No analyze nodes to process")
    }

    // Run periodic summary (async, events added to pendingSemanticEvents)
    this.maybeRunAutoSummary(imageData, timestamp).catch((error) => {
      console.error("[FrameProcessor] Auto summary error:", error)
    })

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

    // Add pending semantic events (from analyze nodes and periodic summaries)
    if (this.pendingSemanticEvents.length > 0) {
      console.debug(`[FrameProcessor] Adding ${this.pendingSemanticEvents.length} pending semantic event(s) to result`)
      events.push(...this.pendingSemanticEvents)
      this.pendingSemanticEvents = []
    }

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

  private async maybeRunSemanticAnalyze(
    prompt: string,
    sensitivity: "low" | "medium" | "high" | undefined,
    imageData: ImageData,
    timestamp: number,
    index: number
  ): Promise<void> {
    const key = prompt.trim()
    const state = this.analyzeState.get(key) || { lastAt: 0, inFlight: false }
    if (state.inFlight) return

    const intervalMs = sensitivity === "high" ? 2000 : sensitivity === "low" ? 10000 : 5000
    if (Date.now() - state.lastAt < intervalMs) return

    state.inFlight = true
    this.analyzeState.set(key, state)

    try {
      const dataUrl = this.imageDataToDataUrl(imageData)
      const response = await fetch("/api/analyze-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageData: dataUrl,
          videoId: this.videoId,
          contextSummary: this.summaryState.lastSummary,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.onSemanticResult?.({ prompt, error: errorText || `HTTP ${response.status}` })
        throw new Error(`Analyze request failed: ${response.status}`)
      }

      const result = (await response.json()) as {
        confidence?: number
        summary?: string
      }

      const confidence = typeof result.confidence === "number" ? result.confidence : 0.0
      const threshold = sensitivity === "high" ? 0.4 : sensitivity === "low" ? 0.7 : 0.55

      if (confidence >= threshold) {
        const severity: VideoEvent["severity"] =
          confidence > 0.8 ? "high" : confidence > 0.6 ? "medium" : "low"

        const event: VideoEvent = {
          id: `${this.videoId}-${timestamp}-analyze-${index}`,
          timestamp,
          type: "alert",
          severity,
          description: result.summary || `Analyze match: ${prompt}`,
          confidence,
          source: "analyze",
        }
        
        this.pendingSemanticEvents.push(event)
        console.log(`[FrameProcessor] ✅ Analyze match found! Confidence: ${(confidence * 100).toFixed(1)}%`, event)
      } else {
        console.debug(`[FrameProcessor] Analyze no match. Confidence: ${(confidence * 100).toFixed(1)}% < threshold: ${(threshold * 100).toFixed(1)}%`)
      }
    } catch (error) {
    } finally {
      state.lastAt = Date.now()
      state.inFlight = false
      this.analyzeState.set(key, state)
    }
  }

  private async maybeRunAutoSummary(imageData: ImageData, timestamp: number): Promise<void> {
    if (this.summaryState.inFlight) return
    // Run every 5 seconds for periodic video analysis
    if (Date.now() - this.summaryState.lastAt < 5000) return

    this.summaryState.inFlight = true
    console.log(`[FrameProcessor] 🔍 Running periodic Gemini video analysis at ${timestamp.toFixed(1)}s`)

    try {
      const dataUrl = this.imageDataToDataUrl(imageData)
      const response = await fetch("/api/describe-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: dataUrl,
          videoId: this.videoId,
          timestamp,
          previousSummary: this.summaryState.lastSummary,
        }),
      })

      if (!response.ok) {
        throw new Error(`Describe request failed: ${response.status}`)
      }

      const result = (await response.json()) as {
        summary?: string
        description?: string
        events?: Array<{ description: string; type?: string; severity?: string }>
        confidence?: number
      }

      // Prioritize events array, then description, then summary
      const events = Array.isArray(result.events) ? result.events : []
      const description = result.description || result.summary || ""

      // Always create at least one event describing what's happening
      if (events.length > 0) {
        events.forEach((event, idx) => {
          const eventType: VideoEvent["type"] = 
            (event.type === "person" || event.type === "vehicle" || event.type === "alert" || event.type === "object" || event.type === "motion")
              ? event.type
              : "motion"
          const severity: VideoEvent["severity"] =
            (event.severity === "high" || event.severity === "medium" || event.severity === "low")
              ? event.severity
              : "medium"
          
          this.pendingSemanticEvents.push({
            id: `${this.videoId}-${timestamp}-periodic-${idx}`,
            timestamp,
            type: eventType,
            severity,
            description: event.description,
            confidence: typeof result.confidence === "number" ? result.confidence : 0.7,
            source: "periodic",
          })
        })
      } else if (description.trim()) {
        // Determine type and severity from description
        const descLower = description.toLowerCase()
        let eventType: VideoEvent["type"] = "motion"
        let severity: VideoEvent["severity"] = "medium"
        
        if (descLower.includes("person") || descLower.includes("people") || descLower.includes("individual")) {
          eventType = "person"
        } else if (descLower.includes("vehicle") || descLower.includes("car") || descLower.includes("truck")) {
          eventType = "vehicle"
        } else if (descLower.includes("alert") || descLower.includes("incident") || descLower.includes("suspicious")) {
          eventType = "alert"
          severity = "high"
        }
        
        const periodicEvent: VideoEvent = {
          id: `${this.videoId}-${timestamp}-periodic-0`,
          timestamp,
          type: eventType,
          severity,
          description: description.trim(),
          confidence: typeof result.confidence === "number" ? result.confidence : 0.7,
          source: "periodic",
        }
        this.pendingSemanticEvents.push(periodicEvent)
        console.log(`[FrameProcessor] ✅ Periodic summary event created:`, periodicEvent)
      } else {
        console.debug("[FrameProcessor] Periodic summary: No events or description to create")
      }

      // Update last summary for context in next request
      if (description.trim()) {
        this.summaryState.lastSummary = description.trim()
      }
    } catch (error) {
      console.debug("Periodic summary error:", error)
    } finally {
      this.summaryState.lastAt = Date.now()
      this.summaryState.inFlight = false
    }
  }

  private imageDataToDataUrl(imageData: ImageData): string {
    const canvas = document.createElement("canvas")
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Canvas context not available")
    }
    ctx.putImageData(imageData, 0, 0)
    return canvas.toDataURL("image/jpeg", 0.6)
  }


  getEventsForTimestamp(timestamp: number): VideoEvent[] {
    return this.eventCache.get(Math.floor(timestamp)) || []
  }

  clearCache(): void {
    this.eventCache.clear()
    this.lastProcessedFrame = null
  }
}
