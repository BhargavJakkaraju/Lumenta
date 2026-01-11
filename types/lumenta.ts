export interface CameraFeed {
  id: string
  name: string
  videoUrl: string
  isPlaying: boolean
  activity: number
  latency: number
  signalRate: number
}

export interface Incident {
  id: string
  feedId: string
  feedName: string
  type?: string
  severity: "low" | "medium" | "high"
  timestamp: Date
  confidence: number
  description: string
  status: "open" | "acknowledged" | "resolved"
  notes?: string
}

export interface DetectionResult {
  boxes: BoundingBox[]
  labels: string[]
  confidences: number[]
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface VideoEvent {
  id: string
  timestamp: number // in seconds
  type: "motion" | "person" | "vehicle" | "object" | "alert" | "activity"
  severity: "low" | "medium" | "high"
  description: string
  confidence: number
  box?: { x: number; y: number; width: number; height: number }
  identity?: string // If face recognition matched
  overlayOnly?: boolean
  source?: "analyze" | "summary" | "periodic"
}

export interface DetectionLog {
  id: string
  feedId: string
  feedName: string
  sessionId: string
  sessionStartTime: Date
  sessionEndTime: Date
  duration: number // in seconds
  summary: {
    totalDetections: number
    objectDetections: {
      person: number
      vehicle: number
      object: number
      alert: number
      motion: number
    }
    incidents: number
    alerts: number
    averageConfidence: number
    maxConfidence: number
  }
  events: Array<{
    id: string
    timestamp: number
    type: string
    severity: string
    description: string
    confidence: number
  }>
  incidents: Array<{
    id: string
    timestamp: Date
    type?: string
    severity: string
    description: string
    status: string
  }>
  createdAt: Date
}
