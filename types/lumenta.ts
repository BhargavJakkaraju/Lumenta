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
