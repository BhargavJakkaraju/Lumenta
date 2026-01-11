export interface DetectionProvider {
  detect(imageData: ImageData): Promise<DetectionResult>
  detectWithPrevious?: (imageData: ImageData, previousFrame: ImageData | null) => Promise<DetectionResult>
  isConfigured(): boolean
}

export interface DetectionResult {
  boxes: Array<{ x: number; y: number; width: number; height: number }>
  labels: string[]
  confidences: number[]
}

// Fallback local detection (motion-based)
export class LocalDetectionProvider implements DetectionProvider {
  private readonly targetWidth = 640
  private readonly targetHeight = 360
  private readonly blockSize = 6
  private readonly diffThreshold = 18
  private readonly maxDots = 90
  private readonly minDotDistance = 10
  private readonly dotSize = 3
  private readonly sampleStride = 1

  isConfigured(): boolean {
    return true // Always available
  }

  async detect(imageData: ImageData): Promise<DetectionResult> {
    return this.detectWithPrevious?.(imageData, null) ?? {
      boxes: [],
      labels: [],
      confidences: [],
    }
  }

  async detectWithPrevious(imageData: ImageData, previousFrame: ImageData | null): Promise<DetectionResult> {
    if (!previousFrame) {
      return { boxes: [], labels: [], confidences: [] }
    }

    if (
      previousFrame.width !== imageData.width ||
      previousFrame.height !== imageData.height
    ) {
      return { boxes: [], labels: [], confidences: [] }
    }

    const width = imageData.width
    const height = imageData.height
    const current = imageData.data
    const previous = previousFrame.data

    const scaleX = width / this.targetWidth
    const scaleY = height / this.targetHeight
    const blocksX = Math.ceil(this.targetWidth / this.blockSize)
    const blocksY = Math.ceil(this.targetHeight / this.blockSize)
    const strideX = Math.max(1, Math.floor(this.sampleStride * scaleX))
    const strideY = Math.max(1, Math.floor(this.sampleStride * scaleY))
    const motionPoints: Array<{ x: number; y: number; score: number }> = []

    for (let by = 0; by < blocksY; by++) {
      const yStart = Math.floor(by * this.blockSize * scaleY)
      const yEnd = Math.min(Math.floor((by + 1) * this.blockSize * scaleY), height)

      for (let bx = 0; bx < blocksX; bx++) {
        const xStart = Math.floor(bx * this.blockSize * scaleX)
        const xEnd = Math.min(Math.floor((bx + 1) * this.blockSize * scaleX), width)

        let diffSum = 0
        let sampleCount = 0

        for (let y = yStart; y < yEnd; y += strideY) {
          for (let x = xStart; x < xEnd; x += strideX) {
            const idx = (y * width + x) * 4
            diffSum += Math.abs(current[idx] - previous[idx])
            diffSum += Math.abs(current[idx + 1] - previous[idx + 1])
            diffSum += Math.abs(current[idx + 2] - previous[idx + 2])
            sampleCount += 3
          }
        }

        if (sampleCount === 0) continue
        const avgDiff = diffSum / sampleCount

        if (avgDiff >= this.diffThreshold) {
          motionPoints.push({
            x: xStart + (xEnd - xStart) / 2,
            y: yStart + (yEnd - yStart) / 2,
            score: avgDiff,
          })
        }
      }
    }

    motionPoints.sort((a, b) => b.score - a.score)
    const selected: Array<{ x: number; y: number; score: number }> = []
    const minDistanceSq = this.minDotDistance * this.minDotDistance

    for (const point of motionPoints) {
      if (selected.length >= this.maxDots) break
      const tooClose = selected.some((picked) => {
        const dx = picked.x - point.x
        const dy = picked.y - point.y
        return dx * dx + dy * dy < minDistanceSq
      })
      if (!tooClose) {
        selected.push(point)
      }
    }

    return {
      boxes: selected.map((point) => ({
        x: Math.max(0, point.x - this.dotSize / 2),
        y: Math.max(0, point.y - this.dotSize / 2),
        width: this.dotSize,
        height: this.dotSize,
      })),
      labels: selected.map(() => "motion"),
      confidences: selected.map((point) => Math.min(1, point.score / 40)),
    }
  }
}

// Re-export YOLOv8 provider
export { YOLOv8DetectionProvider } from "./yolov8-detection-provider"
export type { YOLOv8Config } from "./yolov8-detection-provider"
