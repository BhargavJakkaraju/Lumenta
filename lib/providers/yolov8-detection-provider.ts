/**
 * YOLOv8 Detection Provider
 * Uses ONNX Runtime Web for fast, on-device object detection
 */

import type { DetectionProvider, DetectionResult } from "./detection-provider"

export interface YOLOv8Config {
  modelPath: string
  inputSize: number // Usually 640x640
  confidenceThreshold: number
}

// YOLOv8 ONNX Detection Provider
export class YOLOv8DetectionProvider implements DetectionProvider {
  private ort: any = null
  private session: any = null
  private config: YOLOv8Config
  private isInitialized = false

  constructor(config: YOLOv8Config) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load ONNX Runtime Web
      if (typeof window !== "undefined") {
        this.ort = await import("onnxruntime-web")
        
        // Load YOLOv8 model
        this.session = await this.ort.InferenceSession.create(this.config.modelPath)
        this.isInitialized = true
      }
    } catch (error) {
      console.error("Failed to initialize YOLOv8:", error)
      throw new Error("YOLOv8 initialization failed")
    }
  }

  isConfigured(): boolean {
    return this.isInitialized && this.session !== null
  }

  async detect(imageData: ImageData): Promise<DetectionResult> {
    if (!this.isConfigured()) {
      throw new Error("YOLOv8 not configured or initialized")
    }

    try {
      // Preprocess image: resize to model input size and normalize
      const preprocessed = await this.preprocess(imageData)
      
      // Run inference
      const inputTensor = new this.ort.Tensor("float32", preprocessed, [
        1,
        3,
        this.config.inputSize,
        this.config.inputSize,
      ])

      const feeds = { [this.session.inputNames[0]]: inputTensor }
      const results = await this.session.run(feeds)

      // Post-process results: convert YOLOv8 output to bounding boxes
      const output = results[this.session.outputNames[0]]
      const detections = this.postprocess(output, imageData.width, imageData.height)

      return {
        boxes: detections.boxes,
        labels: detections.labels,
        confidences: detections.confidences,
      }
    } catch (error) {
      console.error("YOLOv8 detection error:", error)
      return {
        boxes: [],
        labels: [],
        confidences: [],
      }
    }
  }

  private async preprocess(imageData: ImageData): Promise<Float32Array> {
    // Create canvas to resize image
    const canvas = document.createElement("canvas")
    canvas.width = this.config.inputSize
    canvas.height = this.config.inputSize
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas context not available")

    // Draw and resize
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = imageData.width
    tempCanvas.height = imageData.height
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) throw new Error("Canvas context not available")

    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0, this.config.inputSize, this.config.inputSize)

    // Get resized image data
    const resizedData = ctx.getImageData(0, 0, this.config.inputSize, this.config.inputSize)
    
    // Convert to float32 array and normalize [0-255] -> [0-1]
    // YOLOv8 expects RGB format and normalized values
    const data = new Float32Array(3 * this.config.inputSize * this.config.inputSize)
    for (let i = 0; i < this.config.inputSize * this.config.inputSize; i++) {
      const offset = i * 4
      // RGB channels (skip alpha)
      data[i] = resizedData.data[offset] / 255.0 // R
      data[this.config.inputSize * this.config.inputSize + i] = resizedData.data[offset + 1] / 255.0 // G
      data[2 * this.config.inputSize * this.config.inputSize + i] = resizedData.data[offset + 2] / 255.0 // B
    }

    return data
  }

  private postprocess(
    output: any,
    imageWidth: number,
    imageHeight: number
  ): { boxes: Array<{ x: number; y: number; width: number; height: number }>; labels: string[]; confidences: number[] } {
    const boxes: Array<{ x: number; y: number; width: number; height: number }> = []
    const labels: string[] = []
    const confidences: number[] = []

    // YOLOv8 output shape: [1, num_detections, 4 + num_classes]
    // Where 4 are bbox coords and rest are class scores
    const outputData = output.data
    const outputDims = output.dims

    const numDetections = outputDims[1]
    const numClasses = outputDims[2] - 4

    // COCO class names (YOLOv8 trained on COCO dataset)
    const classNames = [
      "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
      "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
      // ... (truncated for brevity, full list has 80 classes)
    ]

    for (let i = 0; i < numDetections; i++) {
      const offset = i * outputDims[2]

      // Extract bounding box (normalized coordinates)
      const x = outputData[offset] * imageWidth
      const y = outputData[offset + 1] * imageHeight
      const width = (outputData[offset + 2] - outputData[offset]) * imageWidth
      const height = (outputData[offset + 3] - outputData[offset + 1]) * imageHeight

      // Find class with highest confidence
      let maxConf = 0
      let maxClass = 0
      for (let c = 0; c < numClasses; c++) {
        const conf = outputData[offset + 4 + c]
        if (conf > maxConf) {
          maxConf = conf
          maxClass = c
        }
      }

      // Filter by confidence threshold
      if (maxConf > this.config.confidenceThreshold) {
        boxes.push({ x, y, width, height })
        labels.push(classNames[maxClass] || `class_${maxClass}`)
        confidences.push(maxConf)
      }
    }

    return { boxes, labels, confidences }
  }
}

