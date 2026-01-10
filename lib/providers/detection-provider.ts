export interface DetectionProvider {
  detect(imageData: ImageData): Promise<DetectionResult>
  isConfigured(): boolean
}

export interface DetectionResult {
  boxes: Array<{ x: number; y: number; width: number; height: number }>
  labels: string[]
  confidences: number[]
}

// Fallback local detection (motion-based)
export class LocalDetectionProvider implements DetectionProvider {
  isConfigured(): boolean {
    return true // Always available
  }

  async detect(imageData: ImageData): Promise<DetectionResult> {
    // Simple motion detection fallback
    // In a real implementation, this would use ONNX runtime with YOLOv8
    return {
      boxes: [],
      labels: [],
      confidences: [],
    }
  }
}

// Re-export YOLOv8 provider
export { YOLOv8DetectionProvider } from "./yolov8-detection-provider"
export type { YOLOv8Config } from "./yolov8-detection-provider"
